create table if not exists public.staff_onboarding_codes (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('manager', 'receptionist')),
  code_salt text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 12),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists staff_onboarding_codes_email_active_idx
  on public.staff_onboarding_codes (lower(email), expires_at desc)
  where used_at is null;

alter table public.staff_onboarding_codes enable row level security;
revoke all on public.staff_onboarding_codes from anon, authenticated;

comment on table public.staff_onboarding_codes is
  'Server-only, short-lived setup codes for first-time Atlas staff onboarding. Codes are stored as scrypt hashes and never sent by email.';
