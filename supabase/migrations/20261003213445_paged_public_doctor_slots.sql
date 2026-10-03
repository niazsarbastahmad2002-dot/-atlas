-- Atlas Vision: cursor-paginated public doctor availability for complete bounded views.

create or replace function public.list_public_doctor_slots_page(
  p_clinic_slug text,
  p_doctor_slug text,
  p_from_date date default null,
  p_days integer default 7,
  p_after timestamptz default null,
  p_limit integer default 200
)
returns table(
  slot_at timestamptz,
  appointment_interval_minutes integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with target as (
    select
      c.clinic_id,
      d.doctor_id,
      coalesce(dws.appointment_interval_minutes, core_clinic.appointment_interval_minutes, 15)::integer as interval_minutes,
      s.min_lead_minutes,
      s.booking_horizon_days,
      timezone('Asia/Baghdad', now())::date as today_baghdad
    from public.clinic_directory_profiles c
    join public.doctor_directory_profiles d
      on d.clinic_id = c.clinic_id
    join public.doctors core_doctor
      on core_doctor.clinic_id = d.clinic_id
     and core_doctor.id = d.doctor_id
    join public.clinics core_clinic
      on core_clinic.id = c.clinic_id
    join public.clinic_public_booking_settings s
      on s.clinic_id = c.clinic_id
     and s.enabled
    left join public.doctor_workflow_settings dws
      on dws.clinic_id = d.clinic_id
     and dws.doctor_id = d.doctor_id
    where c.slug = p_clinic_slug
      and d.slug = p_doctor_slug
      and c.is_published
      and d.is_published
      and core_doctor.active
      and char_length(p_clinic_slug) between 3 and 80
      and char_length(p_doctor_slug) between 3 and 80
    limit 1
  ),
  bounds as (
    select
      target.*,
      greatest(coalesce(p_from_date, target.today_baghdad), target.today_baghdad) as start_date,
      least(
        greatest(coalesce(p_from_date, target.today_baghdad), target.today_baghdad)
          + (greatest(1, least(coalesce(p_days, 7), 14)) - 1),
        target.today_baghdad + (target.booking_horizon_days - 1)
      ) as end_date
    from target
  ),
  service_dates as (
    select
      bounds.*,
      day::date as service_date
    from bounds
    cross join lateral generate_series(bounds.start_date, bounds.end_date, interval '1 day') day
  ),
  open_dates as (
    select
      service_dates.*,
      hours.starts_at,
      hours.ends_at
    from service_dates
    join public.doctor_public_booking_hours hours
      on hours.clinic_id = service_dates.clinic_id
     and hours.doctor_id = service_dates.doctor_id
     and hours.weekday = extract(dow from service_dates.service_date)::smallint
     and hours.is_enabled
    where not exists (
      select 1
      from public.doctor_public_booking_closed_dates closed
      where closed.clinic_id = service_dates.clinic_id
        and closed.doctor_id = service_dates.doctor_id
        and closed.booking_date = service_dates.service_date
        and closed.is_closed
    )
  ),
  candidates as (
    select
      open_dates.clinic_id,
      open_dates.doctor_id,
      open_dates.interval_minutes,
      (slot_local at time zone 'Asia/Baghdad') as slot_at
    from open_dates
    cross join lateral generate_series(
      open_dates.service_date + open_dates.starts_at,
      open_dates.service_date + open_dates.ends_at
        - (open_dates.interval_minutes * interval '1 minute'),
      open_dates.interval_minutes * interval '1 minute'
    ) slot_local
    where (slot_local at time zone 'Asia/Baghdad')
      >= now() + (open_dates.min_lead_minutes * interval '1 minute')
  )
  select
    candidates.slot_at,
    candidates.interval_minutes
  from candidates
  where (p_after is null or candidates.slot_at > p_after)
    and not exists (
      select 1
      from public.appointments a
      where a.clinic_id = candidates.clinic_id
        and a.doctor_id = candidates.doctor_id
        and a.status in ('pending', 'confirmed')
        and a.voided_at is null
        and a.appointment_at < candidates.slot_at + (candidates.interval_minutes * interval '1 minute')
        and a.appointment_at + (candidates.interval_minutes * interval '1 minute') > candidates.slot_at
    )
  order by candidates.slot_at
  limit greatest(1, least(coalesce(p_limit, 200), 200));
$$;

revoke all on function public.list_public_doctor_slots_page(text, text, date, integer, timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.list_public_doctor_slots_page(text, text, date, integer, timestamptz, integer)
  to anon, authenticated;
