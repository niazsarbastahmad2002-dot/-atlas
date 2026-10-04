-- Atlas Vision: rank published doctor search before applying the public result limit.

drop function if exists public.search_public_doctors_with_availability(text, text, text, integer);

create function public.search_public_doctors_with_availability(
  p_query text default null,
  p_city text default null,
  p_specialty text default null,
  p_limit integer default 20,
  p_sort text default 'name'
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
security definer
set search_path = ''
as $$
  select
    c.slug,
    c.display_name,
    d.slug,
    d.display_name,
    d.specialty,
    d.subspecialty,
    c.country_code,
    c.city,
    c.area,
    next_slot.slot_at
  from public.clinic_directory_profiles c
  join public.doctor_directory_profiles d
    on d.clinic_id = c.clinic_id
  join public.doctors core
    on core.clinic_id = d.clinic_id
   and core.id = d.doctor_id
  left join lateral (
    select slot.slot_at
    from public.list_public_doctor_slots(c.slug, d.slug, null, 14) slot
    order by slot.slot_at
    limit 1
  ) next_slot on true
  where c.is_published
    and d.is_published
    and core.active
    and (
      p_query is null or btrim(p_query) = ''
      or (
        char_length(p_query) <= 80
        and (
          position(lower(btrim(p_query)) in lower(d.display_name)) > 0
          or position(lower(btrim(p_query)) in lower(d.specialty)) > 0
          or position(lower(btrim(p_query)) in lower(coalesce(d.subspecialty, ''))) > 0
          or position(lower(btrim(p_query)) in lower(c.display_name)) > 0
        )
      )
    )
    and (
      p_city is null or btrim(p_city) = ''
      or (char_length(p_city) <= 100 and lower(btrim(c.city)) = lower(btrim(p_city)))
    )
    and (
      p_specialty is null or btrim(p_specialty) = ''
      or (char_length(p_specialty) <= 120 and lower(btrim(d.specialty)) = lower(btrim(p_specialty)))
    )
  order by
    case when coalesce(p_sort, 'name') = 'soonest'
      then case when next_slot.slot_at is null then 1 else 0 end
      else 0
    end,
    case when coalesce(p_sort, 'name') = 'soonest' then next_slot.slot_at end,
    d.display_name,
    c.display_name,
    d.slug
  limit greatest(1, least(coalesce(p_limit, 20), 30));
$$;

revoke all on function public.search_public_doctors_with_availability(text, text, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.search_public_doctors_with_availability(text, text, text, integer, text)
  to anon, authenticated;
