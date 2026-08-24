-- Atlas WhatsApp-first auth hardening.
-- 1) Atomic OTP rate limiting/verification under concurrency.
-- 2) Only the newest challenge for a phone remains valid.
-- 3) Direct phone-hash -> auth user identity mapping for scale.
-- 4) Account deletion cascades from auth.users -> owned clinics atomically.
-- 5) Add covering indexes identified by the database performance advisor.

alter table private.whatsapp_auth_challenges
  add column if not exists verified_at timestamptz null,
  add column if not exists superseded_at timestamptz null,
  add column if not exists session_established_at timestamptz null;

create index if not exists whatsapp_auth_challenges_created_at_idx
  on private.whatsapp_auth_challenges (created_at);

create table if not exists private.whatsapp_phone_identities (
  phone_hash text primary key check (phone_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.whatsapp_phone_identities enable row level security;
revoke all on table private.whatsapp_phone_identities from public, anon, authenticated;

create or replace function public.reserve_whatsapp_auth_challenge_service(
  p_id uuid,
  p_phone_hash text,
  p_otp_hash text,
  p_ip_hash text,
  p_expires_at timestamptz
) returns text
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $$
declare
  v_phone_count integer;
  v_ip_count integer;
begin
  if p_id is null
     or p_phone_hash !~ '^[a-f0-9]{64}$'
     or p_otp_hash !~ '^[a-f0-9]{64}$'
     or (p_ip_hash is not null and p_ip_hash !~ '^[a-f0-9]{64}$')
     or p_expires_at <= now()
     or p_expires_at > now() + interval '15 minutes' then
    return 'invalid';
  end if;

  -- Serialize requests for the same phone and IP so parallel requests cannot
  -- race around the sliding-window limits.
  perform pg_advisory_xact_lock(hashtextextended('atlas-wa-phone:' || p_phone_hash, 0));
  if p_ip_hash is not null then
    perform pg_advisory_xact_lock(hashtextextended('atlas-wa-ip:' || p_ip_hash, 0));
  end if;

  select count(*)::integer into v_phone_count
  from private.whatsapp_auth_challenges
  where phone_hash = p_phone_hash
    and created_at >= now() - interval '1 hour';

  if v_phone_count >= 6 then
    return 'rate_limited';
  end if;

  if p_ip_hash is not null then
    select count(*)::integer into v_ip_count
    from private.whatsapp_auth_challenges
    where ip_hash = p_ip_hash
      and created_at >= now() - interval '1 hour';

    if v_ip_count >= 20 then
      return 'rate_limited';
    end if;
  end if;

  -- The newest code wins. Older unconsumed challenges for this phone become
  -- unusable before the new challenge is inserted.
  update private.whatsapp_auth_challenges
  set superseded_at = now()
  where phone_hash = p_phone_hash
    and consumed_at is null
    and superseded_at is null
    and expires_at > now();

  insert into private.whatsapp_auth_challenges (
    id, phone_hash, otp_hash, ip_hash, expires_at
  ) values (
    p_id, p_phone_hash, p_otp_hash, p_ip_hash, p_expires_at
  );

  -- Opportunistic bounded-lifetime cleanup; authentication history older than
  -- one day is not needed for the live challenge path.
  delete from private.whatsapp_auth_challenges
  where created_at < now() - interval '1 day'
    and (consumed_at is not null or superseded_at is not null or expires_at < now());

  return 'ok';
end;
$$;

create or replace function public.verify_whatsapp_auth_challenge_service(
  p_id uuid,
  p_phone_hash text,
  p_candidate_otp_hash text
) returns text
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $$
declare
  v_row private.whatsapp_auth_challenges%rowtype;
  v_next_attempts integer;
begin
  if p_id is null
     or p_phone_hash !~ '^[a-f0-9]{64}$'
     or p_candidate_otp_hash !~ '^[a-f0-9]{64}$' then
    return 'invalid_challenge';
  end if;

  select * into v_row
  from private.whatsapp_auth_challenges
  where id = p_id
  for update;

  if not found
     or v_row.phone_hash <> p_phone_hash
     or v_row.consumed_at is not null
     or v_row.superseded_at is not null then
    return 'invalid_challenge';
  end if;

  if v_row.expires_at <= now() then
    return 'expired_code';
  end if;

  -- A correctly verified challenge can be retried while Atlas establishes the
  -- Supabase session. It is finalized immediately after session success.
  if v_row.verified_at is not null then
    if v_row.otp_hash = p_candidate_otp_hash then
      return 'ok';
    end if;
    return 'invalid_challenge';
  end if;

  if v_row.attempts >= 5 then
    return 'too_many_attempts';
  end if;

  if v_row.otp_hash <> p_candidate_otp_hash then
    v_next_attempts := v_row.attempts + 1;
    update private.whatsapp_auth_challenges
    set attempts = v_next_attempts
    where id = p_id;
    if v_next_attempts >= 5 then
      return 'too_many_attempts';
    end if;
    return 'incorrect_code';
  end if;

  update private.whatsapp_auth_challenges
  set attempts = attempts + 1,
      verified_at = now()
  where id = p_id;

  return 'ok';
end;
$$;

create or replace function public.finalize_whatsapp_auth_challenge_service(
  p_id uuid,
  p_phone_hash text
) returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $$
declare
  v_rows integer;
begin
  if p_id is null or p_phone_hash !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  if exists (
    select 1 from private.whatsapp_auth_challenges
    where id = p_id
      and phone_hash = p_phone_hash
      and session_established_at is not null
      and consumed_at is not null
  ) then
    return true;
  end if;

  update private.whatsapp_auth_challenges
  set session_established_at = now(),
      consumed_at = now()
  where id = p_id
    and phone_hash = p_phone_hash
    and verified_at is not null
    and consumed_at is null
    and superseded_at is null;

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

create or replace function public.resolve_whatsapp_identity_service(
  p_phone text,
  p_phone_hash text
) returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'auth'
as $$
declare
  v_user_id uuid;
  v_mapped_user_id uuid;
begin
  if p_phone !~ '^\+[1-9][0-9]{7,14}$'
     or p_phone_hash !~ '^[a-f0-9]{64}$' then
    return null;
  end if;

  select i.user_id into v_user_id
  from private.whatsapp_phone_identities i
  join auth.users u on u.id = i.user_id
  where i.phone_hash = p_phone_hash
    and (u.phone = p_phone or u.raw_user_meta_data ->> 'atlas_phone' = p_phone)
  limit 1;

  if v_user_id is not null then
    return v_user_id;
  end if;

  -- Transitional bootstrap for users created before the identity index existed.
  select u.id into v_user_id
  from auth.users u
  where u.phone = p_phone
     or u.raw_user_meta_data ->> 'atlas_phone' = p_phone
  order by case when u.phone = p_phone then 0 else 1 end, u.created_at asc
  limit 1;

  if v_user_id is null then
    return null;
  end if;

  select i.user_id into v_mapped_user_id
  from private.whatsapp_phone_identities i
  where i.phone_hash = p_phone_hash;

  if v_mapped_user_id is not null and v_mapped_user_id <> v_user_id then
    return null;
  end if;

  delete from private.whatsapp_phone_identities
  where user_id = v_user_id
    and phone_hash <> p_phone_hash;

  insert into private.whatsapp_phone_identities (phone_hash, user_id)
  values (p_phone_hash, v_user_id)
  on conflict (phone_hash) do update
    set updated_at = now()
    where private.whatsapp_phone_identities.user_id = excluded.user_id;

  return v_user_id;
end;
$$;

create or replace function public.bind_whatsapp_identity_service(
  p_phone_hash text,
  p_user_id uuid
) returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'auth'
as $$
declare
  v_existing_user_id uuid;
  v_rows integer;
begin
  if p_phone_hash !~ '^[a-f0-9]{64}$'
     or p_user_id is null
     or not exists (select 1 from auth.users where id = p_user_id) then
    return false;
  end if;

  select user_id into v_existing_user_id
  from private.whatsapp_phone_identities
  where phone_hash = p_phone_hash;

  if v_existing_user_id is not null and v_existing_user_id <> p_user_id then
    return false;
  end if;

  delete from private.whatsapp_phone_identities
  where user_id = p_user_id
    and phone_hash <> p_phone_hash;

  insert into private.whatsapp_phone_identities (phone_hash, user_id)
  values (p_phone_hash, p_user_id)
  on conflict (phone_hash) do update
    set updated_at = now()
    where private.whatsapp_phone_identities.user_id = excluded.user_id;

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

revoke all on function public.reserve_whatsapp_auth_challenge_service(uuid,text,text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.verify_whatsapp_auth_challenge_service(uuid,text,text) from public, anon, authenticated;
revoke all on function public.finalize_whatsapp_auth_challenge_service(uuid,text) from public, anon, authenticated;
revoke all on function public.resolve_whatsapp_identity_service(text,text) from public, anon, authenticated;
revoke all on function public.bind_whatsapp_identity_service(text,uuid) from public, anon, authenticated;

grant execute on function public.reserve_whatsapp_auth_challenge_service(uuid,text,text,text,timestamptz) to service_role;
grant execute on function public.verify_whatsapp_auth_challenge_service(uuid,text,text) to service_role;
grant execute on function public.finalize_whatsapp_auth_challenge_service(uuid,text) to service_role;
grant execute on function public.resolve_whatsapp_identity_service(text,text) to service_role;
grant execute on function public.bind_whatsapp_identity_service(text,uuid) to service_role;

-- Account deletion is now one atomic database operation: deleting auth.users
-- cascades to clinics, and the existing clinic foreign keys cascade clinic data.
alter table public.clinics drop constraint if exists clinics_owner_id_fkey;
alter table public.clinics
  add constraint clinics_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete cascade;

-- Cover foreign keys surfaced by the Supabase performance advisor.
create index if not exists staff_invite_links_assigned_doctor_id_idx
  on private.staff_invite_links (assigned_doctor_id);
create index if not exists staff_invite_links_created_by_idx
  on private.staff_invite_links (created_by);
create index if not exists staff_invite_links_used_by_idx
  on private.staff_invite_links (used_by)
  where used_by is not null;
create index if not exists whatsapp_connections_token_secret_id_idx
  on private.whatsapp_connections (token_secret_id)
  where token_secret_id is not null;
create index if not exists smart_fill_open_slots_doctor_id_idx
  on public.smart_fill_open_slots (doctor_id);
create index if not exists smart_fill_open_slots_filled_by_appointment_id_idx
  on public.smart_fill_open_slots (filled_by_appointment_id)
  where filled_by_appointment_id is not null;
create index if not exists smart_fill_waitlist_doctor_id_idx
  on public.smart_fill_waitlist (doctor_id);
