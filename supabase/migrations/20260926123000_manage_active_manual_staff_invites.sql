-- Give clinic administrators a safe view of active manually shared staff
-- invitations and allow explicit early revocation without exposing token hashes.
--
-- These RPCs are server-only. The caller supplies the authenticated owner ID
-- after Atlas verifies the session; the database independently confirms that
-- the supplied owner still owns the clinic.

create or replace function public.list_manual_staff_invites_service(
  p_clinic_id uuid,
  p_owner_id uuid
)
returns table (
  invitation_id uuid,
  doctor_name text,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
security definer
set search_path = pg_catalog, public, private
as $$
  select
    l.id,
    d.name,
    l.created_at,
    l.expires_at
  from private.staff_invite_links l
  join public.doctors d
    on d.id = l.assigned_doctor_id
   and d.clinic_id = l.clinic_id
  where l.clinic_id = p_clinic_id
    and l.used_at is null
    and l.revoked_at is null
    and l.sent_at is not null
    and l.invited_phone_hash is null
    and l.expires_at > now()
    and d.active = true
    and exists (
      select 1
      from public.clinics c
      where c.id = p_clinic_id
        and c.owner_id = p_owner_id
    )
  order by l.expires_at asc, l.created_at asc
$$;

create or replace function public.revoke_manual_staff_invite_service(
  p_invitation_id uuid,
  p_clinic_id uuid,
  p_owner_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not exists (
    select 1
    from public.clinics c
    where c.id = p_clinic_id
      and c.owner_id = p_owner_id
  ) then
    return false;
  end if;

  update private.staff_invite_links l
  set revoked_at = now()
  where l.id = p_invitation_id
    and l.clinic_id = p_clinic_id
    and l.used_at is null
    and l.revoked_at is null
    and l.sent_at is not null
    and l.invited_phone_hash is null
    and l.expires_at > now();

  return found;
end;
$$;

revoke all on function public.list_manual_staff_invites_service(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.revoke_manual_staff_invite_service(uuid, uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.list_manual_staff_invites_service(uuid, uuid)
  to service_role;
grant execute on function public.revoke_manual_staff_invite_service(uuid, uuid, uuid)
  to service_role;

comment on function public.list_manual_staff_invites_service(uuid, uuid) is
  'Server-only owner-checked list of active manually shared staff invitations; does not expose invite secrets.';
comment on function public.revoke_manual_staff_invite_service(uuid, uuid, uuid) is
  'Server-only owner-checked revocation of an active manually shared staff invitation.';
