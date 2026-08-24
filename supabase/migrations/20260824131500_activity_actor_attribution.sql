-- Preserve the initiating administrator identity when a trusted service RPC
-- performs membership changes on their behalf.

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

create or replace function public.transfer_clinic_administrator(
  p_clinic_id uuid,
  p_new_administrator_id uuid,
  p_actor_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_administrator_id uuid;
  v_default_doctor_id uuid;
begin
  if p_actor_id is null or p_clinic_id is null or p_new_administrator_id is null then
    raise exception 'clinic administrator transfer details required' using errcode = '42501';
  end if;

  select c.owner_id
    into v_current_administrator_id
  from public.clinics c
  where c.id = p_clinic_id
  for update;

  if v_current_administrator_id is null or v_current_administrator_id <> p_actor_id then
    raise exception 'only the current clinic administrator can transfer administration'
      using errcode = '42501';
  end if;

  if p_new_administrator_id = v_current_administrator_id then
    return true;
  end if;

  if not exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = p_clinic_id
      and cm.user_id = p_new_administrator_id
  ) then
    raise exception 'new clinic administrator must already have clinic access'
      using errcode = '23514';
  end if;

  select d.id
    into v_default_doctor_id
  from public.doctors d
  where d.clinic_id = p_clinic_id
    and d.active = true
  order by d.display_order asc, d.name asc, d.id asc
  limit 1;

  if v_default_doctor_id is null then
    raise exception 'an active doctor is required before transferring administration'
      using errcode = '23514';
  end if;

  -- Transaction-local context used only by the append-only activity trigger.
  perform set_config('atlas.actor_id', p_actor_id::text, true);

  insert into public.clinic_members (clinic_id, user_id, role, assigned_doctor_id)
  values (p_clinic_id, v_current_administrator_id, 'receptionist', v_default_doctor_id)
  on conflict (clinic_id, user_id)
  do update set
    role = excluded.role,
    assigned_doctor_id = excluded.assigned_doctor_id;

  update public.clinic_members
  set role = 'owner', assigned_doctor_id = null
  where clinic_id = p_clinic_id
    and user_id = p_new_administrator_id;

  update public.clinics
  set owner_id = p_new_administrator_id
  where id = p_clinic_id;

  return true;
end;
$$;
