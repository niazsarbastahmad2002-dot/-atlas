alter table public.clinic_members
  add column if not exists assigned_doctor_id uuid references public.doctors(id) on delete set null;

create index if not exists clinic_members_assigned_doctor_idx
  on public.clinic_members (clinic_id, assigned_doctor_id)
  where assigned_doctor_id is not null;

create or replace function private.validate_clinic_member_doctor_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'receptionist' then
    if new.assigned_doctor_id is null then
      raise exception 'receptionist doctor assignment required' using errcode = '23514';
    end if;

    if not exists (
      select 1
      from public.doctors d
      where d.id = new.assigned_doctor_id
        and d.clinic_id = new.clinic_id
        and d.active = true
    ) then
      raise exception 'assigned doctor must be active in this clinic' using errcode = '23514';
    end if;
  else
    new.assigned_doctor_id := null;
  end if;

  return new;
end;
$$;

revoke all on function private.validate_clinic_member_doctor_assignment() from public;

create or replace function private.guard_assigned_doctor_archive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.active = true and new.active = false and exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = old.clinic_id
      and cm.role = 'receptionist'
      and cm.assigned_doctor_id = old.id
  ) then
    raise exception 'reassign receptionist before removing doctor' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_assigned_doctor_archive() from public;

drop trigger if exists validate_clinic_member_doctor_assignment on public.clinic_members;
create trigger validate_clinic_member_doctor_assignment
before insert or update of clinic_id, role, assigned_doctor_id
on public.clinic_members
for each row execute function private.validate_clinic_member_doctor_assignment();

drop trigger if exists guard_assigned_doctor_archive on public.doctors;
create trigger guard_assigned_doctor_archive
before update of active on public.doctors
for each row execute function private.guard_assigned_doctor_archive();

create or replace function private.can_access_doctor(target_clinic uuid, target_doctor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    private.can_admin_clinic(target_clinic)
    or exists (
      select 1
      from public.clinic_members cm
      where cm.clinic_id = target_clinic
        and cm.user_id = (select auth.uid())
        and cm.role = 'receptionist'
        and cm.assigned_doctor_id = target_doctor
    )
  );
$$;

revoke all on function private.can_access_doctor(uuid, uuid) from public;
grant execute on function private.can_access_doctor(uuid, uuid) to authenticated, service_role;

drop policy if exists appointments_select on public.appointments;
create policy appointments_select
on public.appointments
for select
to authenticated
using (private.can_access_doctor(clinic_id, doctor_id));

drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert
on public.appointments
for insert
to authenticated
with check (private.can_access_doctor(clinic_id, doctor_id));

drop policy if exists appointments_update on public.appointments;
create policy appointments_update
on public.appointments
for update
to authenticated
using (private.can_access_doctor(clinic_id, doctor_id))
with check (private.can_access_doctor(clinic_id, doctor_id));

drop policy if exists doctors_select on public.doctors;
create policy doctors_select
on public.doctors
for select
to authenticated
using (private.can_access_doctor(clinic_id, id));

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
