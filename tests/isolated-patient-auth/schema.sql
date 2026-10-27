-- Never run on a hosted Supabase database. Disposable local CI only.
-- Production auth.users, auth.role(), and PostgREST are provided by actual local Supabase.
create schema if not exists private;
create table public.patient_profiles (
  user_id uuid primary key references auth.users(id),
  display_name text,
  preferred_language text
);
create table public.clinics (
  id uuid primary key,
  name text not null
);
create table public.doctors (
  id uuid primary key,
  clinic_id uuid not null references public.clinics(id),
  specialty text
);
create table public.appointments (
  id uuid primary key,
  clinic_id uuid not null references public.clinics(id),
  doctor_id uuid,
  doctor_name text,
  appointment_at timestamptz not null,
  status text not null,
  reminder_language text,
  voided_at timestamptz
);
create table private.patient_appointment_accounts (
  user_id uuid not null references auth.users(id),
  clinic_id uuid not null,
  appointment_id uuid not null
);
create table private.patient_appointment_tokens (
  clinic_id uuid not null,
  appointment_id uuid not null,
  token_hash text not null unique,
  created_by uuid not null,
  expires_at timestamptz not null
);
-- This one local fixture substitutes ONLY the throttling function.
-- OTP, JWT validation, patient sessions and ownership RPCs use real Auth
-- and the unchanged repository patient-account migration.
create function public.consume_patient_link_rate_limit(p_bucket_hash text)
returns boolean language sql security invoker as
$$ select auth.role() = 'service_role' and p_bucket_hash is not null $$;
revoke all on function public.consume_patient_link_rate_limit(text)
from public, anon, authenticated;
grant execute on function public.consume_patient_link_rate_limit(text) to service_role;
grant usage on schema private to service_role;
