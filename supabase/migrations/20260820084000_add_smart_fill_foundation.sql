-- Atlas Smart Fill foundation.
-- This migration is intentionally additive: it records patient interest in an earlier
-- appointment and future cancelled slots without sending any messages yet.

create table if not exists public.smart_fill_waitlist (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  source_appointment_id uuid not null references public.appointments(id) on delete cascade,
  patient_name text not null,
  patient_phone text not null,
  reminder_language text not null,
  latest_acceptable_at timestamptz not null,
  contact_consent_at timestamptz not null default now(),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint smart_fill_waitlist_source_unique unique (source_appointment_id),
  constraint smart_fill_waitlist_phone_check check (patient_phone ~ '^\+9647[0-9]{9}$'),
  constraint smart_fill_waitlist_language_check check (reminder_language in ('ku', 'bd', 'ar', 'en')),
  constraint smart_fill_waitlist_status_check check (status in ('active', 'fulfilled', 'cancelled', 'expired'))
);

create index if not exists smart_fill_waitlist_match_idx
  on public.smart_fill_waitlist (clinic_id, doctor_id, latest_acceptable_at, created_at)
  where status = 'active';

alter table public.smart_fill_waitlist enable row level security;

revoke all on public.smart_fill_waitlist from anon, authenticated;
grant select on public.smart_fill_waitlist to authenticated;
grant all on public.smart_fill_waitlist to service_role;

drop policy if exists smart_fill_waitlist_select on public.smart_fill_waitlist;
create policy smart_fill_waitlist_select
  on public.smart_fill_waitlist
  for select
  to authenticated
  using (private.can_access_doctor(clinic_id, doctor_id));

create table if not exists public.smart_fill_open_slots (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  source_appointment_id uuid not null references public.appointments(id) on delete cascade,
  slot_at timestamptz not null,
  status text not null default 'open',
  filled_by_appointment_id uuid references public.appointments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint smart_fill_open_slots_source_unique unique (source_appointment_id),
  constraint smart_fill_open_slots_status_check check (status in ('open', 'filled', 'closed', 'expired'))
);

create unique index if not exists smart_fill_open_slot_unique_active_idx
  on public.smart_fill_open_slots (clinic_id, doctor_id, slot_at)
  where status = 'open';

create index if not exists smart_fill_open_slots_lookup_idx
  on public.smart_fill_open_slots (clinic_id, doctor_id, slot_at)
  where status = 'open';

alter table public.smart_fill_open_slots enable row level security;

revoke all on public.smart_fill_open_slots from anon, authenticated;
grant select on public.smart_fill_open_slots to authenticated;
grant all on public.smart_fill_open_slots to service_role;

drop policy if exists smart_fill_open_slots_select on public.smart_fill_open_slots;
create policy smart_fill_open_slots_select
  on public.smart_fill_open_slots
  for select
  to authenticated
  using (private.can_access_doctor(clinic_id, doctor_id));

create or replace function private.capture_smart_fill_cancellation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status
    and new.status = 'cancelled'
    and old.status in ('pending', 'confirmed')
    and new.doctor_id is not null
    and new.appointment_at > now() then

    insert into public.smart_fill_open_slots (
      clinic_id,
      doctor_id,
      source_appointment_id,
      slot_at,
      status,
      filled_by_appointment_id,
      updated_at
    ) values (
      new.clinic_id,
      new.doctor_id,
      new.id,
      new.appointment_at,
      'open',
      null,
      now()
    )
    on conflict (source_appointment_id)
    do update set
      clinic_id = excluded.clinic_id,
      doctor_id = excluded.doctor_id,
      slot_at = excluded.slot_at,
      status = 'open',
      filled_by_appointment_id = null,
      updated_at = now();
  end if;

  if new.status not in ('pending', 'confirmed') or new.appointment_at <= now() then
    update public.smart_fill_waitlist
    set status = 'cancelled', updated_at = now()
    where source_appointment_id = new.id and status = 'active';
  end if;

  return new;
end;
$$;

create or replace function private.sync_smart_fill_slot_claim()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('pending', 'confirmed')
    and new.voided_at is null
    and new.doctor_id is not null
    and new.appointment_at > now() then
    update public.smart_fill_open_slots
    set
      status = 'filled',
      filled_by_appointment_id = new.id,
      updated_at = now()
    where clinic_id = new.clinic_id
      and doctor_id = new.doctor_id
      and slot_at = new.appointment_at
      and status = 'open'
      and source_appointment_id <> new.id;
  end if;

  return new;
end;
$$;

create or replace function private.sync_smart_fill_waitlist_source()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('pending', 'confirmed')
    and new.voided_at is null
    and new.doctor_id is not null
    and new.appointment_at > now() then
    update public.smart_fill_waitlist
    set
      clinic_id = new.clinic_id,
      doctor_id = new.doctor_id,
      patient_name = new.patient_name,
      patient_phone = new.patient_phone,
      reminder_language = new.reminder_language,
      latest_acceptable_at = new.appointment_at,
      updated_at = now()
    where source_appointment_id = new.id
      and status = 'active';
  else
    update public.smart_fill_waitlist
    set status = 'cancelled', updated_at = now()
    where source_appointment_id = new.id
      and status = 'active';
  end if;

  return new;
end;
$$;

drop trigger if exists capture_smart_fill_cancellation on public.appointments;
create trigger capture_smart_fill_cancellation
after update of status on public.appointments
for each row execute function private.capture_smart_fill_cancellation();

drop trigger if exists sync_smart_fill_slot_claim on public.appointments;
create trigger sync_smart_fill_slot_claim
after insert or update of status, appointment_at, doctor_id, voided_at on public.appointments
for each row execute function private.sync_smart_fill_slot_claim();

drop trigger if exists sync_smart_fill_waitlist_source on public.appointments;
create trigger sync_smart_fill_waitlist_source
after update of status, appointment_at, doctor_id, patient_name, patient_phone, reminder_language, voided_at
on public.appointments
for each row execute function private.sync_smart_fill_waitlist_source();

create or replace function public.patient_set_earlier_slot_preference(
  p_token_hash text,
  p_enabled boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  select a.* into v_appointment
  from private.patient_appointment_tokens t
  join public.appointments a
    on a.id = t.appointment_id
   and a.clinic_id = t.clinic_id
  where t.token_hash = p_token_hash
    and t.revoked_at is null
    and t.expires_at > now()
    and a.voided_at is null
  for update of a;

  if v_appointment.id is null then
    return false;
  end if;

  if not p_enabled then
    update public.smart_fill_waitlist
    set status = 'cancelled', updated_at = now()
    where source_appointment_id = v_appointment.id
      and status = 'active';
    return true;
  end if;

  if v_appointment.status not in ('pending', 'confirmed')
    or v_appointment.doctor_id is null
    or v_appointment.appointment_at <= now() then
    return false;
  end if;

  insert into public.smart_fill_waitlist (
    clinic_id,
    doctor_id,
    source_appointment_id,
    patient_name,
    patient_phone,
    reminder_language,
    latest_acceptable_at,
    contact_consent_at,
    status,
    updated_at
  ) values (
    v_appointment.clinic_id,
    v_appointment.doctor_id,
    v_appointment.id,
    v_appointment.patient_name,
    v_appointment.patient_phone,
    v_appointment.reminder_language,
    v_appointment.appointment_at,
    now(),
    'active',
    now()
  )
  on conflict (source_appointment_id)
  do update set
    clinic_id = excluded.clinic_id,
    doctor_id = excluded.doctor_id,
    patient_name = excluded.patient_name,
    patient_phone = excluded.patient_phone,
    reminder_language = excluded.reminder_language,
    latest_acceptable_at = excluded.latest_acceptable_at,
    contact_consent_at = now(),
    status = 'active',
    updated_at = now();

  return true;
end;
$$;

create or replace function public.patient_get_earlier_slot_preference(p_token_hash text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from private.patient_appointment_tokens t
    join public.smart_fill_waitlist w
      on w.source_appointment_id = t.appointment_id
     and w.clinic_id = t.clinic_id
    join public.appointments a
      on a.id = t.appointment_id
     and a.clinic_id = t.clinic_id
    where t.token_hash = p_token_hash
      and t.revoked_at is null
      and t.expires_at > now()
      and w.status = 'active'
      and a.status in ('pending', 'confirmed')
      and a.voided_at is null
      and a.appointment_at > now()
  );
$$;

revoke all on function public.patient_set_earlier_slot_preference(text, boolean) from public, anon, authenticated;
revoke all on function public.patient_get_earlier_slot_preference(text) from public, anon, authenticated;
grant execute on function public.patient_set_earlier_slot_preference(text, boolean) to service_role;
grant execute on function public.patient_get_earlier_slot_preference(text) to service_role;
