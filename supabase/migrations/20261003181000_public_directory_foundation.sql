-- Atlas Vision draft: explicit public clinic/doctor directory boundary.
-- IMPORTANT: this migration is intentionally prepared for review and must not
-- be applied until the consequential schema/publication change is authorized.

create table public.clinic_directory_profiles (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  description text,
  country_code text not null default 'IQ',
  city text,
  area text,
  address_text text,
  latitude double precision,
  longitude double precision,
  public_phone text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinic_directory_slug_check
    check (char_length(slug) between 3 and 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint clinic_directory_name_check
    check (char_length(btrim(display_name)) between 2 and 120),
  constraint clinic_directory_description_check
    check (description is null or char_length(description) <= 1200),
  constraint clinic_directory_country_check
    check (country_code ~ '^[A-Z]{2}$'),
  constraint clinic_directory_city_check
    check (city is null or char_length(city) <= 100),
  constraint clinic_directory_area_check
    check (area is null or char_length(area) <= 140),
  constraint clinic_directory_address_check
    check (address_text is null or char_length(address_text) <= 280),
  constraint clinic_directory_phone_check
    check (
      public_phone is null
      or (
        char_length(public_phone) <= 40
        and public_phone ~ '^[+]?[0-9() .-]{6,39}  constraint clinic_directory_latitude_check
    check (latitude is null or latitude between -90 and 90),
  constraint clinic_directory_longitude_check
    check (longitude is null or longitude between -180 and 180)
);

create table public.doctor_directory_profiles (
  clinic_id uuid not null,
  doctor_id uuid not null,
  slug text not null,
  display_name text not null,
  specialty text not null,
  subspecialty text,
  bio text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (clinic_id, doctor_id),
  constraint doctor_directory_doctor_fkey
    foreign key (clinic_id, doctor_id)
    references public.doctors(clinic_id, id)
    on delete cascade,
  constraint doctor_directory_slug_unique unique (clinic_id, slug),
  constraint doctor_directory_slug_check
    check (char_length(slug) between 3 and 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint doctor_directory_name_check
    check (char_length(btrim(display_name)) between 2 and 120),
  constraint doctor_directory_specialty_check
    check (char_length(btrim(specialty)) between 2 and 120),
  constraint doctor_directory_subspecialty_check
    check (subspecialty is null or char_length(subspecialty) <= 160),
  constraint doctor_directory_bio_check
    check (bio is null or char_length(bio) <= 1600)
);

comment on table public.clinic_directory_profiles is
  'Intentionally publishable Atlas clinic-directory fields. No row is created automatically and new rows are unpublished by default.';
comment on table public.doctor_directory_profiles is
  'Intentionally publishable Atlas doctor-directory fields. No row is created automatically and new rows are unpublished by default.';

alter table public.clinic_directory_profiles enable row level security;
alter table public.doctor_directory_profiles enable row level security;

revoke all on table public.clinic_directory_profiles from public, anon, authenticated;
revoke all on table public.doctor_directory_profiles from public, anon, authenticated;
grant select, insert, update, delete on table public.clinic_directory_profiles to authenticated;
grant select, insert, update, delete on table public.doctor_directory_profiles to authenticated;

create policy clinic_directory_manage_select
on public.clinic_directory_profiles
for select to authenticated
using (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
);

create policy clinic_directory_manage_insert
on public.clinic_directory_profiles
for insert to authenticated
with check (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
);

create policy clinic_directory_manage_update
on public.clinic_directory_profiles
for update to authenticated
using (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
)
with check (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
);

create policy clinic_directory_manage_delete
on public.clinic_directory_profiles
for delete to authenticated
using (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
);

create policy doctor_directory_manage_select
on public.doctor_directory_profiles
for select to authenticated
using (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
);

create policy doctor_directory_manage_insert
on public.doctor_directory_profiles
for insert to authenticated
with check (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
);

create policy doctor_directory_manage_update
on public.doctor_directory_profiles
for update to authenticated
using (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
)
with check (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
);

create policy doctor_directory_manage_delete
on public.doctor_directory_profiles
for delete to authenticated
using (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
);

create or replace function private.touch_directory_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();

  if tg_op = 'INSERT' then
    if new.is_published then
      new.published_at := coalesce(new.published_at, now());
    else
      new.published_at := null;
    end if;
  elsif new.is_published is distinct from old.is_published then
    if new.is_published then
      new.published_at := now();
    else
      new.published_at := null;
    end if;
  elsif not new.is_published then
    new.published_at := null;
  end if;

  return new;
end;
$$;

create trigger touch_clinic_directory_profile
before insert or update on public.clinic_directory_profiles
for each row execute function private.touch_directory_profile();

create trigger touch_doctor_directory_profile
before insert or update on public.doctor_directory_profiles
for each row execute function private.touch_directory_profile();

create index clinic_directory_published_location_idx
  on public.clinic_directory_profiles(country_code, city)
  where is_published;

create index doctor_directory_published_specialty_idx
  on public.doctor_directory_profiles(specialty)
  where is_published;

create or replace function public.get_public_clinic_profile(p_slug text)
returns table(
  slug text,
  display_name text,
  description text,
  country_code text,
  city text,
  area text,
  address_text text,
  latitude double precision,
  longitude double precision,
  public_phone text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.slug,
    p.display_name,
    p.description,
    p.country_code,
    p.city,
    p.area,
    p.address_text,
    p.latitude,
    p.longitude,
    p.public_phone
  from public.clinic_directory_profiles p
  where p.slug = p_slug
    and p.is_published
  limit 1;
$$;

create or replace function public.list_public_doctors(p_clinic_slug text)
returns table(
  slug text,
  display_name text,
  specialty text,
  subspecialty text,
  bio text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.slug,
    d.display_name,
    d.specialty,
    d.subspecialty,
    d.bio
  from public.clinic_directory_profiles c
  join public.doctor_directory_profiles d
    on d.clinic_id = c.clinic_id
  join public.doctors core
    on core.clinic_id = d.clinic_id
   and core.id = d.doctor_id
  where c.slug = p_clinic_slug
    and c.is_published
    and d.is_published
    and core.active
  order by d.display_name, d.slug;
$$;

create or replace function public.get_public_doctor_profile(
  p_clinic_slug text,
  p_doctor_slug text
)
returns table(
  clinic_slug text,
  clinic_name text,
  doctor_slug text,
  doctor_name text,
  specialty text,
  subspecialty text,
  bio text,
  country_code text,
  city text,
  area text,
  address_text text,
  latitude double precision,
  longitude double precision,
  public_phone text
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
    d.bio,
    c.country_code,
    c.city,
    c.area,
    c.address_text,
    c.latitude,
    c.longitude,
    c.public_phone
  from public.clinic_directory_profiles c
  join public.doctor_directory_profiles d
    on d.clinic_id = c.clinic_id
  join public.doctors core
    on core.clinic_id = d.clinic_id
   and core.id = d.doctor_id
  where c.slug = p_clinic_slug
    and d.slug = p_doctor_slug
    and c.is_published
    and d.is_published
    and core.active
  limit 1;
$$;

create or replace function public.search_public_doctors(
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
  area text
)
language sql
stable
security definer
set search_path = ''
as $
  select
    c.slug,
    c.display_name,
    d.slug,
    d.display_name,
    d.specialty,
    d.subspecialty,
    c.country_code,
    c.city,
    c.area
  from public.clinic_directory_profiles c
  join public.doctor_directory_profiles d
    on d.clinic_id = c.clinic_id
  join public.doctors core
    on core.clinic_id = d.clinic_id
   and core.id = d.doctor_id
  where c.is_published
    and d.is_published
    and core.active
    and (
      p_query is null
      or btrim(p_query) = ''
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
      p_city is null
      or btrim(p_city) = ''
      or (
        char_length(p_city) <= 100
        and lower(btrim(c.city)) = lower(btrim(p_city))
      )
    )
    and (
      p_specialty is null
      or btrim(p_specialty) = ''
      or (
        char_length(p_specialty) <= 120
        and lower(btrim(d.specialty)) = lower(btrim(p_specialty))
      )
    )
  order by d.display_name, c.display_name, d.slug
  limit greatest(1, least(coalesce(p_limit, 20), 30));
$;

revoke all on function public.get_public_clinic_profile(text) from public, anon, authenticated;
revoke all on function public.list_public_doctors(text) from public, anon, authenticated;
revoke all on function public.get_public_doctor_profile(text, text) from public, anon, authenticated;
revoke all on function public.search_public_doctors(text, text, text, integer) from public, anon, authenticated;

grant execute on function public.get_public_clinic_profile(text) to anon, authenticated;
grant execute on function public.list_public_doctors(text) to anon, authenticated;
grant execute on function public.get_public_doctor_profile(text, text) to anon, authenticated;
grant execute on function public.search_public_doctors(text, text, text, integer) to anon, authenticated;

      )
    ),
  constraint clinic_directory_latitude_check
    check (latitude is null or latitude between -90 and 90),
  constraint clinic_directory_longitude_check
    check (longitude is null or longitude between -180 and 180)
);

create table public.doctor_directory_profiles (
  clinic_id uuid not null,
  doctor_id uuid not null,
  slug text not null,
  display_name text not null,
  specialty text not null,
  subspecialty text,
  bio text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (clinic_id, doctor_id),
  constraint doctor_directory_doctor_fkey
    foreign key (clinic_id, doctor_id)
    references public.doctors(clinic_id, id)
    on delete cascade,
  constraint doctor_directory_slug_unique unique (clinic_id, slug),
  constraint doctor_directory_slug_check
    check (char_length(slug) between 3 and 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint doctor_directory_name_check
    check (char_length(btrim(display_name)) between 2 and 120),
  constraint doctor_directory_specialty_check
    check (char_length(btrim(specialty)) between 2 and 120),
  constraint doctor_directory_subspecialty_check
    check (subspecialty is null or char_length(subspecialty) <= 160),
  constraint doctor_directory_bio_check
    check (bio is null or char_length(bio) <= 1600)
);

comment on table public.clinic_directory_profiles is
  'Intentionally publishable Atlas clinic-directory fields. No row is created automatically and new rows are unpublished by default.';
comment on table public.doctor_directory_profiles is
  'Intentionally publishable Atlas doctor-directory fields. No row is created automatically and new rows are unpublished by default.';

alter table public.clinic_directory_profiles enable row level security;
alter table public.doctor_directory_profiles enable row level security;

revoke all on table public.clinic_directory_profiles from public, anon, authenticated;
revoke all on table public.doctor_directory_profiles from public, anon, authenticated;
grant select, insert, update, delete on table public.clinic_directory_profiles to authenticated;
grant select, insert, update, delete on table public.doctor_directory_profiles to authenticated;

create policy clinic_directory_manage_select
on public.clinic_directory_profiles
for select to authenticated
using (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
);

create policy clinic_directory_manage_insert
on public.clinic_directory_profiles
for insert to authenticated
with check (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
);

create policy clinic_directory_manage_update
on public.clinic_directory_profiles
for update to authenticated
using (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
)
with check (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
);

create policy clinic_directory_manage_delete
on public.clinic_directory_profiles
for delete to authenticated
using (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
);

create policy doctor_directory_manage_select
on public.doctor_directory_profiles
for select to authenticated
using (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
);

create policy doctor_directory_manage_insert
on public.doctor_directory_profiles
for insert to authenticated
with check (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
);

create policy doctor_directory_manage_update
on public.doctor_directory_profiles
for update to authenticated
using (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
)
with check (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
);

create policy doctor_directory_manage_delete
on public.doctor_directory_profiles
for delete to authenticated
using (
  private.is_clinic_owner(clinic_id)
  or private.can_manage_clinic(clinic_id)
);

create or replace function private.touch_directory_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();

  if tg_op = 'INSERT' then
    if new.is_published then
      new.published_at := coalesce(new.published_at, now());
    else
      new.published_at := null;
    end if;
  elsif new.is_published is distinct from old.is_published then
    if new.is_published then
      new.published_at := now();
    else
      new.published_at := null;
    end if;
  elsif not new.is_published then
    new.published_at := null;
  end if;

  return new;
end;
$$;

create trigger touch_clinic_directory_profile
before insert or update on public.clinic_directory_profiles
for each row execute function private.touch_directory_profile();

create trigger touch_doctor_directory_profile
before insert or update on public.doctor_directory_profiles
for each row execute function private.touch_directory_profile();

create index clinic_directory_published_location_idx
  on public.clinic_directory_profiles(country_code, city)
  where is_published;

create index doctor_directory_published_specialty_idx
  on public.doctor_directory_profiles(specialty)
  where is_published;

create or replace function public.get_public_clinic_profile(p_slug text)
returns table(
  slug text,
  display_name text,
  description text,
  country_code text,
  city text,
  area text,
  address_text text,
  latitude double precision,
  longitude double precision,
  public_phone text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.slug,
    p.display_name,
    p.description,
    p.country_code,
    p.city,
    p.area,
    p.address_text,
    p.latitude,
    p.longitude,
    p.public_phone
  from public.clinic_directory_profiles p
  where p.slug = p_slug
    and p.is_published
  limit 1;
$$;

create or replace function public.list_public_doctors(p_clinic_slug text)
returns table(
  slug text,
  display_name text,
  specialty text,
  subspecialty text,
  bio text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.slug,
    d.display_name,
    d.specialty,
    d.subspecialty,
    d.bio
  from public.clinic_directory_profiles c
  join public.doctor_directory_profiles d
    on d.clinic_id = c.clinic_id
  join public.doctors core
    on core.clinic_id = d.clinic_id
   and core.id = d.doctor_id
  where c.slug = p_clinic_slug
    and c.is_published
    and d.is_published
    and core.active
  order by d.display_name, d.slug;
$$;

create or replace function public.get_public_doctor_profile(
  p_clinic_slug text,
  p_doctor_slug text
)
returns table(
  clinic_slug text,
  clinic_name text,
  doctor_slug text,
  doctor_name text,
  specialty text,
  subspecialty text,
  bio text,
  country_code text,
  city text,
  area text,
  address_text text,
  latitude double precision,
  longitude double precision,
  public_phone text
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
    d.bio,
    c.country_code,
    c.city,
    c.area,
    c.address_text,
    c.latitude,
    c.longitude,
    c.public_phone
  from public.clinic_directory_profiles c
  join public.doctor_directory_profiles d
    on d.clinic_id = c.clinic_id
  join public.doctors core
    on core.clinic_id = d.clinic_id
   and core.id = d.doctor_id
  where c.slug = p_clinic_slug
    and d.slug = p_doctor_slug
    and c.is_published
    and d.is_published
    and core.active
  limit 1;
$$;

create or replace function public.search_public_doctors(
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
  area text
)
language sql
stable
security definer
set search_path = ''
as $
  select
    c.slug,
    c.display_name,
    d.slug,
    d.display_name,
    d.specialty,
    d.subspecialty,
    c.country_code,
    c.city,
    c.area
  from public.clinic_directory_profiles c
  join public.doctor_directory_profiles d
    on d.clinic_id = c.clinic_id
  join public.doctors core
    on core.clinic_id = d.clinic_id
   and core.id = d.doctor_id
  where c.is_published
    and d.is_published
    and core.active
    and (
      p_query is null
      or btrim(p_query) = ''
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
      p_city is null
      or btrim(p_city) = ''
      or (
        char_length(p_city) <= 100
        and lower(btrim(c.city)) = lower(btrim(p_city))
      )
    )
    and (
      p_specialty is null
      or btrim(p_specialty) = ''
      or (
        char_length(p_specialty) <= 120
        and lower(btrim(d.specialty)) = lower(btrim(p_specialty))
      )
    )
  order by d.display_name, c.display_name, d.slug
  limit greatest(1, least(coalesce(p_limit, 20), 30));
$;

revoke all on function public.get_public_clinic_profile(text) from public, anon, authenticated;
revoke all on function public.list_public_doctors(text) from public, anon, authenticated;
revoke all on function public.get_public_doctor_profile(text, text) from public, anon, authenticated;
revoke all on function public.search_public_doctors(text, text, text, integer) from public, anon, authenticated;

grant execute on function public.get_public_clinic_profile(text) to anon, authenticated;
grant execute on function public.list_public_doctors(text) to anon, authenticated;
grant execute on function public.get_public_doctor_profile(text, text) to anon, authenticated;
grant execute on function public.search_public_doctors(text, text, text, integer) to anon, authenticated;
