-- Atlas Work 2: remove abandoned setup/trusted-device database state and
-- prepare patient-link creation to move behind the server-only service role.

-- These two tables came from abandoned authentication experiments. Refuse to
-- remove them if they unexpectedly contain production state.
do $$
begin
  if to_regclass('public.staff_onboarding_codes') is not null
     and exists (select 1 from public.staff_onboarding_codes) then
    raise exception 'staff_onboarding_codes is not empty; refusing cleanup';
  end if;
  if to_regclass('public.trusted_devices') is not null
     and exists (select 1 from public.trusted_devices) then
    raise exception 'trusted_devices is not empty; refusing cleanup';
  end if;
end $$;

-- Membership is now based on the authenticated Supabase session directly.
-- Passkeys are managed by Supabase Auth and do not need an application table.
create or replace function private.is_clinic_member(target_clinic uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = target_clinic
      and cm.user_id = (select auth.uid())
  );
$$;

create or replace function private.can_manage_clinic(target_clinic uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = target_clinic
      and cm.user_id = (select auth.uid())
      and cm.role in ('owner', 'manager')
  );
$$;

create or replace function private.is_clinic_owner(target_clinic uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.clinics c
    where c.id = target_clinic
      and c.owner_id = (select auth.uid())
  );
$$;

-- Preserve self-removal for non-owners without the obsolete trusted-session helper.
drop policy if exists clinic_members_delete on public.clinic_members;
create policy clinic_members_delete
on public.clinic_members
for delete
to authenticated
using (
  (private.is_clinic_owner(clinic_id) and user_id <> (select auth.uid()))
  or (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and role <> 'owner'
  )
);

-- Remove abandoned trusted-device RPCs/table. Current passkey authentication is
-- provided by Supabase Auth/WebAuthn and does not use these objects.
drop function if exists public.register_trusted_device(text, text);
drop function if exists public.validate_trusted_device(text);
drop function if exists public.revoke_trusted_device(uuid);
drop function if exists public.revoke_current_trusted_device();
drop function if exists public.revoke_all_trusted_devices();
drop table if exists public.trusted_devices;
drop function if exists private.is_trusted_session();

-- Remove the abandoned first-access setup-code table after the emptiness guard.
drop table if exists public.staff_onboarding_codes;

-- Server-only replacement for patient-link token creation. The caller must be
-- the service role and must supply the already-authenticated Atlas actor id.
-- Tenant membership is re-checked inside the function before any token changes.
create or replace function public.create_patient_access_token_server(
  p_actor_id uuid,
  p_appointment_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinic uuid;
begin
  if (select auth.role()) <> 'service_role'
     or p_actor_id is null
     or p_token_hash !~ '^[a-f0-9]{64}$'
     or p_expires_at <= now() + interval '10 minutes'
     or p_expires_at > now() + interval '31 days' then
    return false;
  end if;

  select a.clinic_id
    into v_clinic
  from public.appointments a
  where a.id = p_appointment_id
    and a.status <> 'voided';

  if v_clinic is null or not exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = v_clinic
      and cm.user_id = p_actor_id
  ) then
    return false;
  end if;

  update private.patient_appointment_tokens
     set revoked_at = now()
   where appointment_id = p_appointment_id
     and revoked_at is null;

  insert into private.patient_appointment_tokens (
    clinic_id,
    appointment_id,
    token_hash,
    created_by,
    expires_at
  ) values (
    v_clinic,
    p_appointment_id,
    p_token_hash,
    p_actor_id,
    p_expires_at
  );

  return true;
end;
$$;

revoke all on function public.create_patient_access_token_server(uuid, uuid, text, timestamptz) from public;
revoke all on function public.create_patient_access_token_server(uuid, uuid, text, timestamptz) from anon;
revoke all on function public.create_patient_access_token_server(uuid, uuid, text, timestamptz) from authenticated;
grant execute on function public.create_patient_access_token_server(uuid, uuid, text, timestamptz) to service_role;
