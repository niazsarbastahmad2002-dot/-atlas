-- Extend Atlas's existing appointment audit trail into a small clinic activity history.
-- Keep one append-only event store instead of creating a second overlapping log table.

alter table public.appointment_audit_events
  add column if not exists entity_type text not null default 'appointment',
  add column if not exists entity_id uuid,
  add column if not exists before_state jsonb,
  add column if not exists after_state jsonb;

update public.appointment_audit_events
set entity_id = appointment_id
where entity_type = 'appointment'
  and entity_id is null
  and appointment_id is not null;

alter table public.appointment_audit_events
  drop constraint if exists appointment_audit_events_action_check,
  add constraint appointment_audit_events_action_check check (action in (
    'created',
    'status_changed',
    'rescheduled',
    'details_updated',
    'voided',
    'smart_fill_slot_claimed',
    'smart_fill_slot_released',
    'staff_invited',
    'staff_added',
    'staff_removed',
    'permission_changed'
  )),
  drop constraint if exists appointment_audit_events_entity_type_check,
  add constraint appointment_audit_events_entity_type_check check (entity_type in (
    'appointment',
    'smart_fill_slot',
    'staff_invite',
    'staff_membership'
  )),
  drop constraint if exists appointment_audit_events_before_state_check,
  add constraint appointment_audit_events_before_state_check check (
    before_state is null or (
      jsonb_typeof(before_state) = 'object'
      and octet_length(before_state::text) <= 2048
    )
  ),
  drop constraint if exists appointment_audit_events_after_state_check,
  add constraint appointment_audit_events_after_state_check check (
    after_state is null or (
      jsonb_typeof(after_state) = 'object'
      and octet_length(after_state::text) <= 2048
    )
  );

create index if not exists appointment_audit_events_clinic_occurred_idx
  on public.appointment_audit_events (clinic_id, occurred_at desc);

create or replace function private.can_view_clinic_activity(target_clinic uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1
      from public.clinics c
      where c.id = target_clinic
        and c.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.clinic_members cm
      where cm.clinic_id = target_clinic
        and cm.user_id = (select auth.uid())
        and cm.role in ('owner', 'manager')
    )
  );
$$;

revoke all on function private.can_view_clinic_activity(uuid) from public;
grant execute on function private.can_view_clinic_activity(uuid) to authenticated, service_role;

drop policy if exists appointment_audit_select on public.appointment_audit_events;
create policy appointment_audit_select
on public.appointment_audit_events
for select
to authenticated
using (private.can_view_clinic_activity(clinic_id));

-- Normal app sessions can only read authorized activity. Event writes come from
-- trusted trigger/RPC paths. Service jobs may append, but cannot rewrite history.
revoke insert, update, delete, truncate on public.appointment_audit_events from anon, authenticated;
revoke update, delete, truncate on public.appointment_audit_events from service_role;
grant select on public.appointment_audit_events to authenticated;
grant select, insert on public.appointment_audit_events to service_role;

create or replace function private.write_appointment_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_actor_type text;
  v_before jsonb;
  v_after jsonb;
  v_changed_fields text[];
begin
  v_actor_type := coalesce(
    nullif(current_setting('atlas.actor_type', true), ''),
    case when (select auth.uid()) is null then 'system' else 'staff' end
  );

  if tg_op = 'INSERT' then
    v_action := 'created';
    v_after := jsonb_build_object(
      'status', new.status,
      'appointment_at', new.appointment_at
    );
  elsif new.status = 'voided' and old.status <> 'voided' then
    v_action := 'voided';
    v_before := jsonb_build_object('status', old.status);
    v_after := jsonb_build_object('status', new.status);
  elsif new.status is distinct from old.status then
    v_action := 'status_changed';
    v_before := jsonb_build_object('status', old.status);
    v_after := jsonb_build_object('status', new.status);
  elsif new.appointment_at is distinct from old.appointment_at then
    v_action := 'rescheduled';
    v_before := jsonb_build_object('appointment_at', old.appointment_at);
    v_after := jsonb_build_object('appointment_at', new.appointment_at);
  elsif new.patient_name is distinct from old.patient_name
    or new.patient_phone is distinct from old.patient_phone
    or new.doctor_name is distinct from old.doctor_name
    or new.doctor_id is distinct from old.doctor_id
    or new.reminder_consent is distinct from old.reminder_consent
    or new.reminder_language is distinct from old.reminder_language then
    v_action := 'details_updated';
    v_changed_fields := array_remove(array[
      case when new.patient_name is distinct from old.patient_name then 'patient_name' end,
      case when new.patient_phone is distinct from old.patient_phone then 'patient_phone' end,
      case when new.doctor_name is distinct from old.doctor_name or new.doctor_id is distinct from old.doctor_id then 'doctor' end,
      case when new.reminder_consent is distinct from old.reminder_consent then 'reminder_consent' end,
      case when new.reminder_language is distinct from old.reminder_language then 'reminder_language' end
    ], null);
    -- Record which fields changed, never the patient name or phone values themselves.
    v_after := jsonb_build_object('changed_fields', to_jsonb(v_changed_fields));
  else
    return new;
  end if;

  insert into public.appointment_audit_events (
    clinic_id,
    appointment_id,
    actor_id,
    actor_type,
    action,
    from_status,
    to_status,
    reason,
    entity_type,
    entity_id,
    before_state,
    after_state
  ) values (
    new.clinic_id,
    new.id,
    (select auth.uid()),
    v_actor_type,
    v_action,
    case when tg_op = 'UPDATE' then old.status else null end,
    new.status,
    case when v_action = 'voided' then new.void_reason else null end,
    'appointment',
    new.id,
    v_before,
    v_after
  );

  return new;
end;
$$;

create or replace function private.write_smart_fill_activity_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_actor_type text;
begin
  if tg_op <> 'UPDATE' or old.status is not distinct from new.status then
    return new;
  end if;

  if old.status = 'open' and new.status = 'filled' then
    v_action := 'smart_fill_slot_claimed';
  elsif old.status = 'filled' and new.status = 'open' then
    v_action := 'smart_fill_slot_released';
  else
    return new;
  end if;

  v_actor_type := coalesce(
    nullif(current_setting('atlas.actor_type', true), ''),
    case when (select auth.uid()) is null then 'system' else 'staff' end
  );

  insert into public.appointment_audit_events (
    clinic_id,
    appointment_id,
    actor_id,
    actor_type,
    action,
    entity_type,
    entity_id,
    before_state,
    after_state
  ) values (
    new.clinic_id,
    coalesce(new.filled_by_appointment_id, old.filled_by_appointment_id),
    (select auth.uid()),
    v_actor_type,
    v_action,
    'smart_fill_slot',
    new.id,
    jsonb_build_object('status', old.status),
    jsonb_build_object('status', new.status)
  );

  return new;
end;
$$;

drop trigger if exists write_smart_fill_activity_event on public.smart_fill_open_slots;
create trigger write_smart_fill_activity_event
after update of status on public.smart_fill_open_slots
for each row execute function private.write_smart_fill_activity_event();

create or replace function private.write_staff_invite_activity_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.appointment_audit_events (
    clinic_id,
    actor_id,
    actor_type,
    action,
    entity_type,
    entity_id,
    after_state
  ) values (
    new.clinic_id,
    new.created_by,
    'staff',
    'staff_invited',
    'staff_invite',
    new.id,
    jsonb_build_object(
      'role', new.role,
      'assigned_doctor_id', new.assigned_doctor_id
    )
  );
  return new;
end;
$$;

drop trigger if exists write_staff_invite_activity_event on private.staff_invite_links;
create trigger write_staff_invite_activity_event
after insert on private.staff_invite_links
for each row execute function private.write_staff_invite_activity_event();

create or replace function private.write_clinic_member_activity_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_clinic_id uuid;
  v_user_id uuid;
  v_before jsonb;
  v_after jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'staff_added';
    v_clinic_id := new.clinic_id;
    v_user_id := new.user_id;
    v_after := jsonb_build_object(
      'role', new.role,
      'assigned_doctor_id', new.assigned_doctor_id
    );
  elsif tg_op = 'DELETE' then
    v_action := 'staff_removed';
    v_clinic_id := old.clinic_id;
    v_user_id := old.user_id;
    v_before := jsonb_build_object(
      'role', old.role,
      'assigned_doctor_id', old.assigned_doctor_id
    );
  elsif new.role is distinct from old.role
    or new.assigned_doctor_id is distinct from old.assigned_doctor_id then
    v_action := 'permission_changed';
    v_clinic_id := new.clinic_id;
    v_user_id := new.user_id;
    v_before := jsonb_build_object(
      'role', old.role,
      'assigned_doctor_id', old.assigned_doctor_id
    );
    v_after := jsonb_build_object(
      'role', new.role,
      'assigned_doctor_id', new.assigned_doctor_id
    );
  else
    return coalesce(new, old);
  end if;

  insert into public.appointment_audit_events (
    clinic_id,
    actor_id,
    actor_type,
    action,
    entity_type,
    entity_id,
    before_state,
    after_state
  ) values (
    v_clinic_id,
    (select auth.uid()),
    case when (select auth.uid()) is null then 'system' else 'staff' end,
    v_action,
    'staff_membership',
    v_user_id,
    v_before,
    v_after
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists write_clinic_member_activity_event on public.clinic_members;
create trigger write_clinic_member_activity_event
after insert or update of role, assigned_doctor_id or delete on public.clinic_members
for each row execute function private.write_clinic_member_activity_event();
