-- Extend clinic export audit metadata to cover the readable report and CSV formats.
-- The existing JSON reservation function remains available so the current production
-- route keeps working while application code rolls forward.

alter table public.clinic_export_audit
  drop constraint if exists clinic_export_audit_format_check;

alter table public.clinic_export_audit
  add constraint clinic_export_audit_format_check
  check (format in ('json', 'csv', 'html'));

create or replace function public.reserve_clinic_export(
  p_clinic_id uuid,
  p_format text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_format text := lower(trim(coalesce(p_format, '')));
  v_export_id bigint;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  if v_format not in ('json', 'csv', 'html') then
    raise exception using errcode = '22023', message = 'invalid_export_format';
  end if;

  if not exists (
    select 1
    from public.clinics c
    where c.id = p_clinic_id
      and c.owner_id = v_user_id
  ) then
    raise exception using errcode = '42501', message = 'clinic_owner_required';
  end if;

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
  values (p_clinic_id, v_user_id, v_format, 'started')
  returning id into v_export_id;

  return v_export_id;
end;
$$;

revoke all on function public.reserve_clinic_export(uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_clinic_export(uuid, text) to authenticated;

comment on function public.reserve_clinic_export(uuid, text) is
  'Owner-only clinic export reservation for JSON, CSV, or readable HTML; rate limited per owner and clinic.';
