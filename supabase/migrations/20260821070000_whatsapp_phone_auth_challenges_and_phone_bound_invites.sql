create table if not exists private.whatsapp_auth_challenges (
  id uuid primary key default gen_random_uuid(),
  phone_hash text not null check (phone_hash ~ '^[a-f0-9]{64}$'),
  otp_hash text not null check (otp_hash ~ '^[a-f0-9]{64}$'),
  ip_hash text null check (ip_hash is null or ip_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 10),
  consumed_at timestamptz null,
  provider_message_id text null check (provider_message_id is null or char_length(provider_message_id) between 1 and 255),
  created_at timestamptz not null default now()
);

alter table private.whatsapp_auth_challenges enable row level security;
revoke all on table private.whatsapp_auth_challenges from public, anon, authenticated;

create index if not exists whatsapp_auth_challenges_phone_created_idx
  on private.whatsapp_auth_challenges (phone_hash, created_at desc);
create index if not exists whatsapp_auth_challenges_ip_created_idx
  on private.whatsapp_auth_challenges (ip_hash, created_at desc)
  where ip_hash is not null;
create index if not exists whatsapp_auth_challenges_expiry_idx
  on private.whatsapp_auth_challenges (expires_at)
  where consumed_at is null;

alter table private.staff_invite_links
  add column if not exists invited_phone_hash text null
  check (invited_phone_hash is null or invited_phone_hash ~ '^[a-f0-9]{64}$');

create index if not exists staff_invite_links_invited_phone_hash_idx
  on private.staff_invite_links (invited_phone_hash)
  where invited_phone_hash is not null and used_at is null;

create or replace function public.create_phone_staff_invite_link_service(
  p_clinic_id uuid,
  p_assigned_doctor_id uuid,
  p_token_hash text,
  p_invited_phone_hash text,
  p_created_by uuid,
  p_expires_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $$
declare
  v_id uuid;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$'
     or p_invited_phone_hash !~ '^[a-f0-9]{64}$'
     or p_expires_at <= now()
     or p_expires_at > now() + interval '7 days' then
    return null;
  end if;

  if not exists (
    select 1 from public.clinics c
    where c.id = p_clinic_id and c.owner_id = p_created_by
  ) then
    return null;
  end if;

  if not exists (
    select 1 from public.doctors d
    where d.id = p_assigned_doctor_id
      and d.clinic_id = p_clinic_id
      and d.active = true
  ) then
    return null;
  end if;

  insert into private.staff_invite_links (
    clinic_id, assigned_doctor_id, token_hash, invited_phone_hash, expires_at, created_by
  ) values (
    p_clinic_id, p_assigned_doctor_id, p_token_hash, p_invited_phone_hash, p_expires_at, p_created_by
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.redeem_phone_staff_invite_link_service(
  p_token_hash text,
  p_user_id uuid,
  p_verified_phone_hash text
) returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $$
declare
  v_clinic_id uuid;
  v_doctor_id uuid;
  v_expected_phone_hash text;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_verified_phone_hash !~ '^[a-f0-9]{64}$' then
    return null;
  end if;

  select l.clinic_id, l.assigned_doctor_id, l.invited_phone_hash
    into v_clinic_id, v_doctor_id, v_expected_phone_hash
  from private.staff_invite_links l
  where l.token_hash = p_token_hash
    and l.used_at is null
    and l.expires_at > now()
  for update;

  if v_clinic_id is null
     or v_expected_phone_hash is null
     or v_expected_phone_hash <> p_verified_phone_hash then
    return null;
  end if;

  if exists (
    select 1 from public.clinics c
    where c.id = v_clinic_id and c.owner_id = p_user_id
  ) then
    return null;
  end if;

  if not exists (
    select 1 from public.doctors d
    where d.id = v_doctor_id
      and d.clinic_id = v_clinic_id
      and d.active = true
  ) then
    return null;
  end if;

  insert into public.clinic_members (clinic_id, user_id, role, assigned_doctor_id)
  values (v_clinic_id, p_user_id, 'receptionist', v_doctor_id)
  on conflict (clinic_id, user_id) do update
    set role = 'receptionist', assigned_doctor_id = excluded.assigned_doctor_id
    where public.clinic_members.role <> 'owner';

  if not exists (
    select 1 from public.clinic_members m
    where m.clinic_id = v_clinic_id
      and m.user_id = p_user_id
      and m.role = 'receptionist'
      and m.assigned_doctor_id = v_doctor_id
  ) then
    return null;
  end if;

  update private.staff_invite_links
  set used_at = now(), used_by = p_user_id
  where token_hash = p_token_hash and used_at is null;

  return v_clinic_id;
end;
$$;

revoke all on function public.create_phone_staff_invite_link_service(uuid,uuid,text,text,uuid,timestamptz) from public, anon, authenticated;
revoke all on function public.redeem_phone_staff_invite_link_service(text,uuid,text) from public, anon, authenticated;
grant execute on function public.create_phone_staff_invite_link_service(uuid,uuid,text,text,uuid,timestamptz) to service_role;
grant execute on function public.redeem_phone_staff_invite_link_service(text,uuid,text) to service_role;
