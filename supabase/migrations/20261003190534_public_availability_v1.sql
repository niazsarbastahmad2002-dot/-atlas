-- Atlas Vision stacked draft: public-bookable hours and live slot reads.
-- GATED: do not apply before the public directory boundary is explicitly authorized.
-- Public booking hours affect only patient self-service discovery. Reception can
-- continue to schedule manually outside these windows.

create table public.clinic_public_booking_settings (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  enabled boolean not null default false,
  min_lead_minutes integer not null default 120,
  booking_horizon_days integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinic_public_booking_lead_check
    check (min_lead_minutes between 0 and 10080),
  constraint clinic_public_booking_horizon_check
    check (booking_horizon_days between 1 and 90)
);

create table public.doctor_public_booking_hours (
  clinic_id uuid not null,
  doctor_id uuid not null,
  weekday smallint not null,
  starts_at time without time zone not null,
  ends_at time without time zone not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (clinic_id, doctor_id, weekday),
  constraint doctor_public_booking_hours_doctor_fkey
    foreign key (clinic_id, doctor_id)
    references public.doctors(clinic_id, id)
    on delete cascade,
  constraint doctor_public_booking_weekday_check
    check (weekday between 0 and 6),
  constraint doctor_public_booking_window_check
    check (starts_at < ends_at)
);

create table public.doctor_public_booking_closed_dates (
  clinic_id uuid not null,
  doctor_id uuid not null,
  booking_date date not null,
  is_closed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (clinic_id, doctor_id, booking_date),
  constraint doctor_public_booking_closed_doctor_fkey
    foreign key (clinic_id, doctor_id)
    references public.doctors(clinic_id, id)
    on delete cascade
);

comment on table public.clinic_public_booking_settings is
  'Opt-in controls for Atlas patient self-service availability. Disabled by default.';
comment on table public.doctor_public_booking_hours is
  'One public-bookable weekly window per doctor/day for Atlas v1. Does not restrict staff scheduling.';
comment on table public.doctor_public_booking_closed_dates is
  'Explicit per-doctor dates hidden from public booking availability. Does not cancel existing appointments.';

alter table public.clinic_public_booking_settings enable row level security;
alter table public.doctor_public_booking_hours enable row level security;
alter table public.doctor_public_booking_closed_dates enable row level security;

revoke all on table public.clinic_public_booking_settings from public, anon, authenticated;
revoke all on table public.doctor_public_booking_hours from public, anon, authenticated;
revoke all on table public.doctor_public_booking_closed_dates from public, anon, authenticated;

grant select on table public.clinic_public_booking_settings to authenticated;
grant insert (clinic_id, enabled, min_lead_minutes, booking_horizon_days)
  on public.clinic_public_booking_settings to authenticated;
grant update (enabled, min_lead_minutes, booking_horizon_days)
  on public.clinic_public_booking_settings to authenticated;

grant select on table public.doctor_public_booking_hours to authenticated;
grant insert (clinic_id, doctor_id, weekday, starts_at, ends_at, is_enabled)
  on public.doctor_public_booking_hours to authenticated;
grant update (starts_at, ends_at, is_enabled)
  on public.doctor_public_booking_hours to authenticated;

grant select on table public.doctor_public_booking_closed_dates to authenticated;
grant insert (clinic_id, doctor_id, booking_date, is_closed)
  on public.doctor_public_booking_closed_dates to authenticated;
grant update (is_closed)
  on public.doctor_public_booking_closed_dates to authenticated;

create policy clinic_public_booking_settings_select
on public.clinic_public_booking_settings
for select to authenticated
using (private.can_manage_clinic(clinic_id) or private.is_clinic_owner(clinic_id));

create policy clinic_public_booking_settings_insert
on public.clinic_public_booking_settings
for insert to authenticated
with check (private.can_manage_clinic(clinic_id) or private.is_clinic_owner(clinic_id));

create policy clinic_public_booking_settings_update
on public.clinic_public_booking_settings
for update to authenticated
using (private.can_manage_clinic(clinic_id) or private.is_clinic_owner(clinic_id))
with check (private.can_manage_clinic(clinic_id) or private.is_clinic_owner(clinic_id));

create policy doctor_public_booking_hours_select
on public.doctor_public_booking_hours
for select to authenticated
using (private.can_manage_clinic(clinic_id) or private.is_clinic_owner(clinic_id));

create policy doctor_public_booking_hours_insert
on public.doctor_public_booking_hours
for insert to authenticated
with check (private.can_manage_clinic(clinic_id) or private.is_clinic_owner(clinic_id));

create policy doctor_public_booking_hours_update
on public.doctor_public_booking_hours
for update to authenticated
using (private.can_manage_clinic(clinic_id) or private.is_clinic_owner(clinic_id))
with check (private.can_manage_clinic(clinic_id) or private.is_clinic_owner(clinic_id));

create policy doctor_public_booking_closed_dates_select
on public.doctor_public_booking_closed_dates
for select to authenticated
using (private.can_manage_clinic(clinic_id) or private.is_clinic_owner(clinic_id));

create policy doctor_public_booking_closed_dates_insert
on public.doctor_public_booking_closed_dates
for insert to authenticated
with check (private.can_manage_clinic(clinic_id) or private.is_clinic_owner(clinic_id));

create policy doctor_public_booking_closed_dates_update
on public.doctor_public_booking_closed_dates
for update to authenticated
using (private.can_manage_clinic(clinic_id) or private.is_clinic_owner(clinic_id))
with check (private.can_manage_clinic(clinic_id) or private.is_clinic_owner(clinic_id));

create or replace function private.touch_public_booking_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

revoke all on function private.touch_public_booking_row() from public, anon, authenticated;

create trigger touch_clinic_public_booking_settings
before insert or update on public.clinic_public_booking_settings
for each row execute function private.touch_public_booking_row();

create trigger touch_doctor_public_booking_hours
before insert or update on public.doctor_public_booking_hours
for each row execute function private.touch_public_booking_row();

create trigger touch_doctor_public_booking_closed_dates
before insert or update on public.doctor_public_booking_closed_dates
for each row execute function private.touch_public_booking_row();

create index doctor_public_booking_closed_date_idx
  on public.doctor_public_booking_closed_dates(clinic_id, doctor_id, booking_date)
  where is_closed;

create or replace function public.list_public_doctor_slots(
  p_clinic_slug text,
  p_doctor_slug text,
  p_from_date date default null,
  p_days integer default 7
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
      (
        slot_local
        at time zone 'Asia/Baghdad'
      ) as slot_at
    from open_dates
    cross join lateral generate_series(
      open_dates.service_date + open_dates.starts_at,
      open_dates.service_date + open_dates.ends_at
        - (open_dates.interval_minutes * interval '1 minute'),
      open_dates.interval_minutes * interval '1 minute'
    ) slot_local
    where (
      slot_local at time zone 'Asia/Baghdad'
    ) >= now() + (open_dates.min_lead_minutes * interval '1 minute')
  )
  select
    candidates.slot_at,
    candidates.interval_minutes
  from candidates
  where not exists (
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
  limit 200;
$$;

revoke all on function public.list_public_doctor_slots(text, text, date, integer)
  from public, anon, authenticated;
grant execute on function public.list_public_doctor_slots(text, text, date, integer)
  to anon, authenticated;
