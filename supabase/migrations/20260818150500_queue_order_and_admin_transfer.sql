-- Reception workflow refinements:
-- 1) allow the current clinic administrator to transfer administration atomically
-- 2) expose a privacy-safe, doctor-specific appointment order through patient links

create or replace function private.guard_clinic_administrator_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id and current_user <> 'postgres' then
    raise exception 'clinic administrator can only be changed through the transfer function'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_clinic_administrator_change on public.clinics;
create trigger guard_clinic_administrator_change
before update of owner_id on public.clinics
for each row execute function private.guard_clinic_administrator_change();

create or replace function public.transfer_clinic_administrator(
  p_clinic_id uuid,
  p_new_administrator_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_current_administrator_id uuid;
begin
  if v_actor_id is null or p_clinic_id is null or p_new_administrator_id is null then
    raise exception 'authenticated clinic administrator required' using errcode = '42501';
  end if;

  select c.owner_id
    into v_current_administrator_id
  from public.clinics c
  where c.id = p_clinic_id
  for update;

  if v_current_administrator_id is null or v_current_administrator_id <> v_actor_id then
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

revoke all on function public.transfer_clinic_administrator(uuid, uuid) from public, anon;
grant execute on function public.transfer_clinic_administrator(uuid, uuid) to authenticated;
grant execute on function public.transfer_clinic_administrator(uuid, uuid) to service_role;

drop function if exists public.get_patient_appointment(text);
create function public.get_patient_appointment(p_token_hash text)
returns table(
  clinic_name text,
  doctor_name text,
  appointment_at timestamptz,
  appointment_status text,
  reminder_language text,
  token_expires_at timestamptz,
  queue_position integer,
  appointments_ahead integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then
    return;
  end if;

  update private.patient_appointment_tokens t
    set last_used_at = now()
  where t.token_hash = p_token_hash
    and t.revoked_at is null
    and t.expires_at > now();

  return query
  with target as (
    select
      c.name as clinic_name,
      a.id as appointment_id,
      a.clinic_id,
      a.doctor_id,
      a.doctor_name,
      a.appointment_at,
      a.status as appointment_status,
      a.reminder_language,
      t.expires_at as token_expires_at
    from private.patient_appointment_tokens t
    join public.appointments a
      on a.id = t.appointment_id
     and a.clinic_id = t.clinic_id
    join public.clinics c on c.id = t.clinic_id
    where t.token_hash = p_token_hash
      and t.revoked_at is null
      and t.expires_at > now()
      and a.status <> 'voided'
  ), positioned as (
    select
      target.*,
      case
        when target.appointment_status in ('pending', 'confirmed') then (
          select count(*)::integer
          from public.appointments q
          where q.clinic_id = target.clinic_id
            and q.voided_at is null
            and q.status in ('pending', 'confirmed')
            and (
              (target.doctor_id is not null and q.doctor_id = target.doctor_id)
              or (
                target.doctor_id is null
                and q.doctor_id is null
                and q.doctor_name = target.doctor_name
              )
            )
            and (q.appointment_at at time zone 'Asia/Baghdad')::date
              = (target.appointment_at at time zone 'Asia/Baghdad')::date
            and q.appointment_at < target.appointment_at
        )
        else null
      end as appointments_ahead
    from target
  )
  select
    positioned.clinic_name,
    positioned.doctor_name,
    positioned.appointment_at,
    positioned.appointment_status,
    positioned.reminder_language,
    positioned.token_expires_at,
    case
      when positioned.appointments_ahead is null then null
      else positioned.appointments_ahead + 1
    end as queue_position,
    positioned.appointments_ahead
  from positioned;
end;
$$;

revoke all on function public.get_patient_appointment(text) from public, anon, authenticated;
grant execute on function public.get_patient_appointment(text) to service_role;
