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
  v_actor_id uuid;
  v_actor_setting text;
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
    return new;
  end if;

  -- During a clinic delete, ON DELETE CASCADE removes clinic memberships after
  -- the clinic row is no longer visible. There is no surviving clinic Activity
  -- History to write to, and attempting it violates the audit-event clinic FK.
  -- Direct staff removals still see the clinic and continue to be audited.
  if tg_op = 'DELETE'
    and not exists (
      select 1
      from public.clinics c
      where c.id = v_clinic_id
    ) then
    return old;
  end if;

  v_actor_setting := nullif(current_setting('atlas.actor_id', true), '');
  if v_actor_setting is not null
    and v_actor_setting ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    v_actor_id := v_actor_setting::uuid;
  else
    v_actor_id := (select auth.uid());
  end if;

  -- Service invite redemption has no JWT actor in the database transaction.
  -- In that case the newly added/removed user is the least-surprising actor
  -- identity, while direct owner/manager changes keep auth.uid().
  if v_actor_id is null then
    v_actor_id := v_user_id;
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
    v_actor_id,
    'staff',
    v_action,
    'staff_membership',
    v_user_id,
    v_before,
    v_after
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
