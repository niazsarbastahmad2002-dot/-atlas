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

  -- Create as pending. It becomes redeemable only after Meta accepts the send.
  insert into private.staff_invite_links (
    clinic_id, assigned_doctor_id, token_hash, invited_phone_hash, expires_at, created_by
  ) values (
    p_clinic_id, p_assigned_doctor_id, p_token_hash, p_invited_phone_hash, p_expires_at, p_created_by
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.activate_phone_staff_invite_link_service(
  p_token_hash text,
  p_provider_message_id text,
  p_created_by uuid
) returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $$
declare
  v_id uuid;
  v_clinic_id uuid;
  v_phone_hash text;
  v_rows integer;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$'
     or p_provider_message_id is null
     or char_length(p_provider_message_id) not between 1 and 255
     or p_created_by is null then
    return false;
  end if;

  select id, clinic_id, invited_phone_hash
    into v_id, v_clinic_id, v_phone_hash
  from private.staff_invite_links
  where token_hash = p_token_hash
    and created_by = p_created_by
    and used_at is null
    and revoked_at is null
    and sent_at is null
    and expires_at > now()
  for update;

  if v_id is null or v_phone_hash is null then
    return false;
  end if;

  -- Only after the new message has been accepted do older live links stop working.
  update private.staff_invite_links
  set revoked_at = now()
  where clinic_id = v_clinic_id
    and invited_phone_hash = v_phone_hash
    and id <> v_id
    and used_at is null
    and revoked_at is null
    and sent_at is not null
    and expires_at > now();

  update private.staff_invite_links
  set provider_message_id = p_provider_message_id,
      sent_at = now()
  where id = v_id
    and sent_at is null;

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

create or replace function public.preview_staff_invite_link_service(p_token_hash text)
returns table(clinic_id uuid, clinic_name text, doctor_name text, expires_at timestamptz)
language sql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $$
  select l.clinic_id, c.name, d.name, l.expires_at
  from private.staff_invite_links l
  join public.clinics c on c.id = l.clinic_id
  join public.doctors d on d.id = l.assigned_doctor_id and d.clinic_id = l.clinic_id
  where l.token_hash = p_token_hash
    and l.used_at is null
    and l.revoked_at is null
    and l.sent_at is not null
    and l.expires_at > now()
    and d.active = true
  limit 1
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
    and l.revoked_at is null
    and l.sent_at is not null
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
  where token_hash = p_token_hash
    and used_at is null
    and revoked_at is null
    and sent_at is not null;

  return v_clinic_id;
end;
$$;

revoke all on function public.activate_phone_staff_invite_link_service(text,text,uuid) from public, anon, authenticated;
grant execute on function public.activate_phone_staff_invite_link_service(text,text,uuid) to service_role;
