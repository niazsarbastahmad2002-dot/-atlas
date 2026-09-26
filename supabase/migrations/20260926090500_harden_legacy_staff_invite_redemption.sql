-- Keep manually shared receptionist invitations usable while preserving the
-- stronger phone-bound invitation contract introduced later.
--
-- Manual links are intentionally unbound to a phone number because the clinic
-- administrator shares the one-use link through the platform share sheet. They
-- are active immediately after creation. Phone-bound links must never be
-- redeemable through this legacy/manual RPC.

create or replace function public.create_staff_invite_link_service(
  p_clinic_id uuid,
  p_assigned_doctor_id uuid,
  p_token_hash text,
  p_created_by uuid,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_id uuid;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$'
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
    clinic_id,
    assigned_doctor_id,
    token_hash,
    expires_at,
    created_by,
    sent_at
  ) values (
    p_clinic_id,
    p_assigned_doctor_id,
    p_token_hash,
    p_expires_at,
    p_created_by,
    now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.redeem_staff_invite_link_service(
  p_token_hash text,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_clinic_id uuid;
  v_doctor_id uuid;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_user_id is null then
    return null;
  end if;

  select l.clinic_id, l.assigned_doctor_id
    into v_clinic_id, v_doctor_id
  from private.staff_invite_links l
  where l.token_hash = p_token_hash
    and l.used_at is null
    and l.revoked_at is null
    and l.sent_at is not null
    and l.invited_phone_hash is null
    and l.expires_at > now()
  for update;

  if v_clinic_id is null then
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
    and sent_at is not null
    and invited_phone_hash is null;

  return v_clinic_id;
end;
$$;

revoke all on function public.create_staff_invite_link_service(uuid, uuid, text, uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function public.redeem_staff_invite_link_service(text, uuid)
  from public, anon, authenticated;

grant execute on function public.create_staff_invite_link_service(uuid, uuid, text, uuid, timestamptz)
  to service_role;
grant execute on function public.redeem_staff_invite_link_service(text, uuid)
  to service_role;
