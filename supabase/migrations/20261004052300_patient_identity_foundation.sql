-- Atlas private patient identity foundation.
-- A patient profile is owned by one authenticated Atlas identity and is never publicly discoverable.
-- The verified phone remains authoritative in auth.users and is not duplicated here.

create or replace function private.current_verified_patient_phone()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when u.phone ~ '^\+9647[0-9]{9}$' then u.phone
    when u.phone ~ '^9647[0-9]{9}$' then '+' || u.phone
    else null
  end
  from auth.users u
  where u.id = (select auth.uid())
    and u.phone_confirmed_at is not null
  limit 1;
$$;

revoke all on function private.current_verified_patient_phone() from public, anon;
grant execute on function private.current_verified_patient_phone() to authenticated, service_role;

create table public.patient_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null
    check (
      display_name = btrim(display_name)
      and char_length(display_name) between 2 and 120
      and display_name !~ '[[:cntrl:]]'
    ),
  preferred_language text not null default 'ku'
    check (preferred_language in ('ku', 'bd', 'ar', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.patient_profiles is
  'Private patient-owned Atlas profile. Never public directory data; verified phone remains in auth.users.';

alter table public.patient_profiles enable row level security;

revoke all on table public.patient_profiles from public, anon, authenticated;
grant select, insert, update, delete on table public.patient_profiles to authenticated;

create policy patient_profiles_select_own
on public.patient_profiles
for select
to authenticated
using (user_id = (select auth.uid()));

create policy patient_profiles_insert_own_verified
on public.patient_profiles
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.current_verified_patient_phone() is not null
);

create policy patient_profiles_update_own_verified
on public.patient_profiles
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and private.current_verified_patient_phone() is not null
);

create policy patient_profiles_delete_own
on public.patient_profiles
for delete
to authenticated
using (user_id = (select auth.uid()));

create table private.patient_appointment_accounts (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table private.patient_appointment_accounts is
  'Durable private ownership link between a self-booked appointment and the verified Atlas patient identity.';

create index patient_appointment_accounts_user_created_idx
on private.patient_appointment_accounts (user_id, created_at desc);

alter table private.patient_appointment_accounts enable row level security;

revoke all on table private.patient_appointment_accounts from public, anon, authenticated;

create policy patient_appointment_accounts_deny_client_access
on private.patient_appointment_accounts
for all
to anon, authenticated
using (false)
with check (false);

create or replace function public.finalize_verified_public_booking_service(
  p_verified_user_id uuid,
  p_clinic_slug text,
  p_doctor_slug text,
  p_slot_at timestamptz,
  p_patient_name text,
  p_idempotency_key uuid,
  p_patient_token_hash text,
  p_patient_token_expires_at timestamptz,
  p_reminder_language text default 'ku',
  p_reminder_consent boolean default false
)
returns table(
  result text,
  appointment_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_verified_phone text;
  v_result text;
  v_appointment_id uuid;
  v_clinic_id uuid;
begin
  if (select auth.role()) <> 'service_role' then
    return query select 'forbidden'::text, null::uuid;
    return;
  end if;

  if p_verified_user_id is null
     or p_patient_token_hash !~ '^[a-f0-9]{64}$'
     or p_patient_token_expires_at <= now() + interval '10 minutes'
     or p_patient_token_expires_at > now() + interval '31 days' then
    return query select 'invalid'::text, null::uuid;
    return;
  end if;

  select case
    when u.phone ~ '^\+9647[0-9]{9}$' then u.phone
    when u.phone ~ '^9647[0-9]{9}$' then '+' || u.phone
    else null
  end
  into v_verified_phone
  from auth.users u
  where u.id = p_verified_user_id
    and u.phone_confirmed_at is not null
  limit 1;

  if v_verified_phone is null then
    return query select 'verification_required'::text, null::uuid;
    return;
  end if;

  select b.result, b.appointment_id
  into v_result, v_appointment_id
  from public.create_public_booking_service(
    p_clinic_slug,
    p_doctor_slug,
    p_slot_at,
    p_patient_name,
    v_verified_phone,
    p_idempotency_key,
    p_reminder_language,
    p_reminder_consent
  ) b
  limit 1;

  if v_result not in ('created', 'duplicate') or v_appointment_id is null then
    return query select coalesce(v_result, 'failed')::text, v_appointment_id;
    return;
  end if;

  select a.clinic_id
  into v_clinic_id
  from public.appointments a
  where a.id = v_appointment_id
    and a.patient_phone = v_verified_phone
    and a.contact_relationship = 'patient'
    and a.voided_at is null
  limit 1;

  if v_clinic_id is null then
    return query select 'verification_mismatch'::text, null::uuid;
    return;
  end if;

  if exists (
    select 1
    from private.patient_appointment_accounts ownership
    where ownership.appointment_id = v_appointment_id
      and ownership.user_id <> p_verified_user_id
  ) then
    return query select 'verification_mismatch'::text, null::uuid;
    return;
  end if;

  insert into private.patient_appointment_accounts (
    appointment_id,
    clinic_id,
    user_id
  ) values (
    v_appointment_id,
    v_clinic_id,
    p_verified_user_id
  )
  on conflict (appointment_id) do nothing;

  if not exists (
    select 1
    from private.patient_appointment_accounts ownership
    where ownership.appointment_id = v_appointment_id
      and ownership.clinic_id = v_clinic_id
      and ownership.user_id = p_verified_user_id
  ) then
    return query select 'verification_mismatch'::text, null::uuid;
    return;
  end if;

  insert into public.patient_profiles (
    user_id,
    display_name,
    preferred_language
  ) values (
    p_verified_user_id,
    btrim(p_patient_name),
    p_reminder_language
  )
  on conflict (user_id) do update
  set display_name = excluded.display_name,
      preferred_language = excluded.preferred_language,
      updated_at = now();

  if exists (
    select 1
    from private.patient_appointment_tokens t
    where t.token_hash = p_patient_token_hash
      and t.clinic_id = v_clinic_id
      and t.appointment_id = v_appointment_id
      and t.created_by = p_verified_user_id
      and t.revoked_at is null
      and t.expires_at > now()
  ) then
    return query select v_result, v_appointment_id;
    return;
  end if;

  update private.patient_appointment_tokens
  set revoked_at = now()
  where appointment_id = v_appointment_id
    and revoked_at is null;

  insert into private.patient_appointment_tokens (
    clinic_id,
    appointment_id,
    token_hash,
    created_by,
    expires_at
  ) values (
    v_clinic_id,
    v_appointment_id,
    p_patient_token_hash,
    p_verified_user_id,
    p_patient_token_expires_at
  );

  return query select v_result, v_appointment_id;
  return;
exception
  when unique_violation then
    return query select 'token_conflict'::text, null::uuid;
    return;
end;
$$;

revoke all on function public.finalize_verified_public_booking_service(
  uuid, text, text, timestamptz, text, uuid, text, timestamptz, text, boolean
) from public, anon, authenticated;

grant execute on function public.finalize_verified_public_booking_service(
  uuid, text, text, timestamptz, text, uuid, text, timestamptz, text, boolean
) to service_role;
