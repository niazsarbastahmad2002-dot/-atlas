-- Atlas patient account portal.
-- Patient sessions are deliberately separate from professional Supabase browser sessions.

create table private.patient_account_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique
    check (token_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  check (expires_at > created_at)
);

comment on table private.patient_account_sessions is
  'Opaque patient-portal sessions. Raw tokens live only in an HttpOnly browser cookie.';

create index patient_account_sessions_user_created_idx
on private.patient_account_sessions (user_id, created_at desc);

create index patient_account_sessions_expiry_idx
on private.patient_account_sessions (expires_at)
where revoked_at is null;

alter table private.patient_account_sessions enable row level security;
revoke all on table private.patient_account_sessions from public, anon, authenticated;

create policy patient_account_sessions_deny_client_access
on private.patient_account_sessions
for all
to anon, authenticated
using (false)
with check (false);

create or replace function public.create_patient_account_session_service(
  p_verified_user_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
begin
  if (select auth.role()) <> 'service_role' then
    return false;
  end if;

  if p_verified_user_id is null
     or p_token_hash !~ '^[a-f0-9]{64}$'
     or p_expires_at <= now() + interval '10 minutes'
     or p_expires_at > now() + interval '8 days' then
    return false;
  end if;

  select case
    when u.phone ~ '^\+9647[0-9]{9}$' then u.phone
    when u.phone ~ '^9647[0-9]{9}$' then '+' || u.phone
    else null
  end
  into v_phone
  from auth.users u
  where u.id = p_verified_user_id
    and u.phone_confirmed_at is not null
  limit 1;

  if v_phone is null then
    return false;
  end if;

  insert into private.patient_account_sessions (
    token_hash,
    user_id,
    expires_at
  ) values (
    p_token_hash,
    p_verified_user_id,
    p_expires_at
  );

  update private.patient_account_sessions s
  set revoked_at = now()
  where s.user_id = p_verified_user_id
    and s.revoked_at is null
    and s.expires_at > now()
    and s.id in (
      select older.id
      from private.patient_account_sessions older
      where older.user_id = p_verified_user_id
        and older.revoked_at is null
        and older.expires_at > now()
      order by older.created_at desc
      offset 5
    );

  return true;
exception
  when unique_violation then
    return false;
end;
$$;

create or replace function public.resolve_patient_account_session_service(
  p_token_hash text
)
returns table(
  user_id uuid,
  display_name text,
  preferred_language text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_display_name text;
  v_preferred_language text;
  v_expires_at timestamptz;
begin
  if (select auth.role()) <> 'service_role'
     or p_token_hash !~ '^[a-f0-9]{64}$' then
    return;
  end if;

  select
    s.user_id,
    p.display_name,
    coalesce(p.preferred_language, 'ku'),
    s.expires_at
  into
    v_user_id,
    v_display_name,
    v_preferred_language,
    v_expires_at
  from private.patient_account_sessions s
  join auth.users u on u.id = s.user_id
  left join public.patient_profiles p on p.user_id = s.user_id
  where s.token_hash = p_token_hash
    and s.revoked_at is null
    and s.expires_at > now()
    and u.phone_confirmed_at is not null
    and (
      u.phone ~ '^\+9647[0-9]{9}$'
      or u.phone ~ '^9647[0-9]{9}$'
    )
  limit 1;

  if v_user_id is null then
    return;
  end if;

  update private.patient_account_sessions
  set last_used_at = now()
  where token_hash = p_token_hash;

  return query
  select v_user_id, v_display_name, v_preferred_language, v_expires_at;
end;
$$;

create or replace function public.revoke_patient_account_session_service(
  p_token_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role'
     or p_token_hash !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  update private.patient_account_sessions
  set revoked_at = coalesce(revoked_at, now())
  where token_hash = p_token_hash;

  return found;
end;
$$;

create or replace function public.list_patient_account_appointments_service(
  p_user_id uuid
)
returns table(
  appointment_id uuid,
  clinic_name text,
  doctor_name text,
  doctor_specialty text,
  appointment_at timestamptz,
  appointment_status text,
  reminder_language text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' or p_user_id is null then
    return;
  end if;

  return query
  select
    a.id,
    c.name,
    a.doctor_name,
    d.specialty,
    a.appointment_at,
    a.status,
    a.reminder_language
  from private.patient_appointment_accounts ownership
  join public.appointments a
    on a.id = ownership.appointment_id
   and a.clinic_id = ownership.clinic_id
  join public.clinics c
    on c.id = a.clinic_id
  left join public.doctors d
    on d.id = a.doctor_id
   and d.clinic_id = a.clinic_id
  where ownership.user_id = p_user_id
    and a.voided_at is null
  order by
    (a.appointment_at >= now()) desc,
    case when a.appointment_at >= now() then a.appointment_at end asc,
    case when a.appointment_at < now() then a.appointment_at end desc
  limit 50;
end;
$$;

create or replace function public.issue_patient_account_appointment_token_service(
  p_user_id uuid,
  p_appointment_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinic_id uuid;
begin
  if (select auth.role()) <> 'service_role'
     or p_user_id is null
     or p_appointment_id is null
     or p_token_hash !~ '^[a-f0-9]{64}$'
     or p_expires_at <= now() + interval '5 minutes'
     or p_expires_at > now() + interval '2 hours' then
    return false;
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and u.phone_confirmed_at is not null
      and (
        u.phone ~ '^\+9647[0-9]{9}$'
        or u.phone ~ '^9647[0-9]{9}$'
      )
  ) then
    return false;
  end if;

  select ownership.clinic_id
  into v_clinic_id
  from private.patient_appointment_accounts ownership
  join public.appointments a
    on a.id = ownership.appointment_id
   and a.clinic_id = ownership.clinic_id
  where ownership.user_id = p_user_id
    and ownership.appointment_id = p_appointment_id
    and a.voided_at is null
  limit 1;

  if v_clinic_id is null then
    return false;
  end if;

  insert into private.patient_appointment_tokens (
    clinic_id,
    appointment_id,
    token_hash,
    created_by,
    expires_at
  ) values (
    v_clinic_id,
    p_appointment_id,
    p_token_hash,
    p_user_id,
    p_expires_at
  );

  return true;
exception
  when unique_violation then
    return false;
end;
$$;

revoke all on function public.create_patient_account_session_service(uuid,text,timestamptz)
from public, anon, authenticated;
revoke all on function public.resolve_patient_account_session_service(text)
from public, anon, authenticated;
revoke all on function public.revoke_patient_account_session_service(text)
from public, anon, authenticated;
revoke all on function public.list_patient_account_appointments_service(uuid)
from public, anon, authenticated;
revoke all on function public.issue_patient_account_appointment_token_service(uuid,uuid,text,timestamptz)
from public, anon, authenticated;

grant execute on function public.create_patient_account_session_service(uuid,text,timestamptz)
to service_role;
grant execute on function public.resolve_patient_account_session_service(text)
to service_role;
grant execute on function public.revoke_patient_account_session_service(text)
to service_role;
grant execute on function public.list_patient_account_appointments_service(uuid)
to service_role;
grant execute on function public.issue_patient_account_appointment_token_service(uuid,uuid,text,timestamptz)
to service_role;
