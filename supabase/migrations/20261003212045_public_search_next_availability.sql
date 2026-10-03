-- Atlas Vision: enrich public doctor search with the next real public opening.
-- This wrapper is SECURITY INVOKER and only composes existing public RPCs.

create or replace function public.search_public_doctors_with_availability(
  p_query text default null,
  p_city text default null,
  p_specialty text default null,
  p_limit integer default 20
)
returns table(
  clinic_slug text,
  clinic_name text,
  doctor_slug text,
  doctor_name text,
  specialty text,
  subspecialty text,
  country_code text,
  city text,
  area text,
  next_available_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    match.clinic_slug,
    match.clinic_name,
    match.doctor_slug,
    match.doctor_name,
    match.specialty,
    match.subspecialty,
    match.country_code,
    match.city,
    match.area,
    next_slot.slot_at
  from public.search_public_doctors(
    p_query,
    p_city,
    p_specialty,
    greatest(1, least(coalesce(p_limit, 20), 30))
  ) match
  left join lateral (
    select slot.slot_at
    from public.list_public_doctor_slots(
      match.clinic_slug,
      match.doctor_slug,
      null,
      14
    ) slot
    order by slot.slot_at
    limit 1
  ) next_slot on true
  order by match.doctor_name, match.clinic_name, match.doctor_slug;
$$;

revoke all on function public.search_public_doctors_with_availability(text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.search_public_doctors_with_availability(text, text, text, integer)
  to anon, authenticated;
