-- Atomically finalize a phone-verified public booking and issue its private patient link.
-- Service-role only. The caller must first validate the patient's Supabase access token.

create or replace function public.finalize_verified_public_booking_service(
  p_verified_user_id uuid,
  p_clinic_slug text,
  p_doctor_slug text,
  p_slot_at timestamptz,
  p_patient_name text,
  p_idempotency_key uuid,
  p_patient_token_hash text,
  p_patient_token_expires_at timestamptz,
  p_reminder_language text default 'ku',
  p_reminder_consent boolean default false
)
returns table(
  result text,
  appointment_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_verified_phone text;
  v_result text;
  v_appointment_id uuid;
  v_clinic_id uuid;
begin
  if (select auth.role()) <> 'service_role' then
    return query select 'forbidden'::text, null::uuid;
    return;
  end if;

  if p_verified_user_id is null
     or p_patient_token_hash !~ '^[a-f0-9]{64}$'
     or p_patient_token_expires_at <= now() + interval '10 minutes'
     or p_patient_token_expires_at > now() + interval '31 days' then
    return query select 'invalid'::text, null::uuid;
    return;
  end if;

  select case
    when u.phone ~ '^\+9647[0-9]{9}$' then u.phone
    when u.phone ~ '^9647[0-9]{9}$' then '+' || u.phone
    else null
  end
  into v_verified_phone
  from auth.users u
  where u.id = p_verified_user_id
    and u.phone_confirmed_at is not null
  limit 1;

  if v_verified_phone is null then
    return query select 'verification_required'::text, null::uuid;
    return;
  end if;

  select b.result, b.appointment_id
  into v_result, v_appointment_id
  from public.create_public_booking_service(
    p_clinic_slug,
    p_doctor_slug,
    p_slot_at,
    p_patient_name,
    v_verified_phone,
    p_idempotency_key,
    p_reminder_language,
    p_reminder_consent
  ) b
  limit 1;

  if v_result not in ('created', 'duplicate') or v_appointment_id is null then
    return query select coalesce(v_result, 'failed')::text, v_appointment_id;
    return;
  end if;

  select a.clinic_id
  into v_clinic_id
  from public.appointments a
  where a.id = v_appointment_id
    and a.patient_phone = v_verified_phone
    and a.contact_relationship = 'patient'
    and a.voided_at is null
  limit 1;

  if v_clinic_id is null then
    return query select 'verification_mismatch'::text, null::uuid;
    return;
  end if;

  if exists (
    select 1
    from private.patient_appointment_tokens t
    where t.token_hash = p_patient_token_hash
      and t.clinic_id = v_clinic_id
      and t.appointment_id = v_appointment_id
      and t.created_by = p_verified_user_id
      and t.revoked_at is null
      and t.expires_at > now()
  ) then
    return query select v_result, v_appointment_id;
    return;
  end if;

  update private.patient_appointment_tokens
  set revoked_at = now()
  where appointment_id = v_appointment_id
    and revoked_at is null;

  insert into private.patient_appointment_tokens (
    clinic_id,
    appointment_id,
    token_hash,
    created_by,
    expires_at
  ) values (
    v_clinic_id,
    v_appointment_id,
    p_patient_token_hash,
    p_verified_user_id,
    p_patient_token_expires_at
  );

  return query select v_result, v_appointment_id;
  return;
exception
  when unique_violation then
    return query select 'token_conflict'::text, null::uuid;
    return;
end;
$$;

revoke all on function public.finalize_verified_public_booking_service(
  uuid, text, text, timestamptz, text, uuid, text, timestamptz, text, boolean
) from public, anon, authenticated;

grant execute on function public.finalize_verified_public_booking_service(
  uuid, text, text, timestamptz, text, uuid, text, timestamptz, text, boolean
) to service_role;
