-- Save the complete public-booking week in one transaction.
-- Uses SECURITY INVOKER so existing table grants and clinic RLS remain the authorization boundary.

create or replace function public.save_doctor_public_booking_hours(
  p_clinic_id uuid,
  p_doctor_id uuid,
  p_hours jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
  v_distinct_count integer;
begin
  if p_clinic_id is null
     or p_doctor_id is null
     or p_hours is null
     or jsonb_typeof(p_hours) <> 'array'
     or jsonb_array_length(p_hours) <> 7 then
    return false;
  end if;

  if not exists (
    select 1
    from public.doctors d
    where d.clinic_id = p_clinic_id
      and d.id = p_doctor_id
      and d.active
  ) then
    return false;
  end if;

  select
    count(*)::integer,
    count(distinct x.weekday)::integer
  into v_count, v_distinct_count
  from jsonb_to_recordset(p_hours) as x(
    weekday smallint,
    starts_at time without time zone,
    ends_at time without time zone,
    is_enabled boolean
  )
  where x.weekday between 0 and 6
    and x.starts_at is not null
    and x.ends_at is not null
    and x.starts_at < x.ends_at
    and x.is_enabled is not null;

  if v_count <> 7 or v_distinct_count <> 7 then
    return false;
  end if;

  insert into public.doctor_public_booking_hours as existing (
    clinic_id,
    doctor_id,
    weekday,
    starts_at,
    ends_at,
    is_enabled
  )
  select
    p_clinic_id,
    p_doctor_id,
    x.weekday,
    x.starts_at,
    x.ends_at,
    x.is_enabled
  from jsonb_to_recordset(p_hours) as x(
    weekday smallint,
    starts_at time without time zone,
    ends_at time without time zone,
    is_enabled boolean
  )
  on conflict (clinic_id, doctor_id, weekday)
  do update set
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    is_enabled = excluded.is_enabled;

  get diagnostics v_count = row_count;
  return v_count = 7;
end;
$$;

revoke all on function public.save_doctor_public_booking_hours(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_doctor_public_booking_hours(uuid, uuid, jsonb)
  to authenticated;
