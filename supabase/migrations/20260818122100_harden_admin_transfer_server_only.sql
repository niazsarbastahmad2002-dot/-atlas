-- Keep clinic administrator transfer off the signed-in PostgREST surface.
-- The Atlas server verifies the current administrator, then calls this with service-role credentials.

drop function if exists public.transfer_clinic_administrator(uuid, uuid);

create function public.transfer_clinic_administrator(
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

  insert into public.clinic_members (clinic_id, user_id, role)
  values (p_clinic_id, v_current_administrator_id, 'receptionist')
  on conflict (clinic_id, user_id)
  do update set role = excluded.role;

  update public.clinic_members
  set role = 'owner'
  where clinic_id = p_clinic_id
    and user_id = p_new_administrator_id;

  update public.clinics
  set owner_id = p_new_administrator_id
  where id = p_clinic_id;

  return true;
end;
$$;

revoke all on function public.transfer_clinic_administrator(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.transfer_clinic_administrator(uuid, uuid, uuid) to service_role;
