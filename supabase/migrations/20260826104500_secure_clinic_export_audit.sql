-- Clinic-owned export audit and rate-limit reservation.
-- The audit store deliberately contains no patient data, archive contents, auth tokens,
-- provider identifiers, or other secrets. Client roles have no direct table access.

create table public.clinic_export_audit (
  id bigint generated always as identity primary key,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  format text not null default 'json' check (format = 'json'),
  status text not null default 'started' check (status in ('started', 'completed', 'failed')),
  record_count integer check (record_count is null or record_count >= 0),
  byte_count integer check (byte_count is null or byte_count >= 0),
  failure_code text check (failure_code is null or char_length(failure_code) between 1 and 64)
);

create index clinic_export_audit_rate_limit_idx
  on public.clinic_export_audit (clinic_id, requested_by, requested_at desc);

alter table public.clinic_export_audit enable row level security;

revoke all on table public.clinic_export_audit from anon, authenticated;
revoke all on sequence public.clinic_export_audit_id_seq from anon, authenticated;

create or replace function public.reserve_clinic_export(p_clinic_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_export_id bigint;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  if not exists (
    select 1
    from public.clinics c
    where c.id = p_clinic_id
      and c.owner_id = v_user_id
  ) then
    raise exception using errcode = '42501', message = 'clinic_owner_required';
  end if;

  -- Serialize reservations per owner+clinic so simultaneous requests cannot bypass
  -- the three-per-hour limit.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_clinic_id::text || ':' || v_user_id::text, 0)
  );

  if (
    select count(*)
    from public.clinic_export_audit e
    where e.clinic_id = p_clinic_id
      and e.requested_by = v_user_id
      and e.requested_at >= now() - interval '1 hour'
  ) >= 3 then
    raise exception using errcode = 'P0001', message = 'export_rate_limited';
  end if;

  insert into public.clinic_export_audit (clinic_id, requested_by, format, status)
  values (p_clinic_id, v_user_id, 'json', 'started')
  returning id into v_export_id;

  return v_export_id;
end;
$$;

create or replace function public.complete_clinic_export(
  p_export_id bigint,
  p_record_count integer,
  p_byte_count integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null or p_record_count < 0 or p_byte_count < 0 then
    return false;
  end if;

  update public.clinic_export_audit e
  set status = 'completed',
      completed_at = now(),
      record_count = p_record_count,
      byte_count = p_byte_count,
      failure_code = null
  where e.id = p_export_id
    and e.requested_by = v_user_id
    and e.status = 'started'
    and exists (
      select 1
      from public.clinics c
      where c.id = e.clinic_id
        and c.owner_id = v_user_id
    );

  return found;
end;
$$;

create or replace function public.fail_clinic_export(
  p_export_id bigint,
  p_failure_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_failure_code text := left(coalesce(nullif(trim(p_failure_code), ''), 'export_failed'), 64);
begin
  if v_user_id is null then
    return false;
  end if;

  update public.clinic_export_audit e
  set status = 'failed',
      completed_at = now(),
      failure_code = v_failure_code
  where e.id = p_export_id
    and e.requested_by = v_user_id
    and e.status = 'started'
    and exists (
      select 1
      from public.clinics c
      where c.id = e.clinic_id
        and c.owner_id = v_user_id
    );

  return found;
end;
$$;

revoke all on function public.reserve_clinic_export(uuid) from public, anon, authenticated;
revoke all on function public.complete_clinic_export(bigint, integer, integer) from public, anon, authenticated;
revoke all on function public.fail_clinic_export(bigint, text) from public, anon, authenticated;

grant execute on function public.reserve_clinic_export(uuid) to authenticated;
grant execute on function public.complete_clinic_export(bigint, integer, integer) to authenticated;
grant execute on function public.fail_clinic_export(bigint, text) to authenticated;

comment on table public.clinic_export_audit is
  'Patient-data-free audit metadata for owner-requested clinic exports. Archive contents are never stored here.';
