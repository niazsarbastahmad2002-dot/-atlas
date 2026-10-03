-- Atlas Vision: verified public self-booking foundation.
-- This is inert until server-side OTP delivery routes call the service-role-only functions.

create table private.public_booking_verifications (
  id uuid primary key default gen_random_uuid(),
  phone_hash text not null,
  otp_hash text not null,
  ip_hash text,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  verified_at timestamptz,
  consumed_at timestamptz,
  superseded_at timestamptz,
  provider_message_id text,
  created_at timestamptz not null default now(),
  constraint public_booking_verification_phone_hash_check
    check (phone_hash ~ '^[a-f0-9]{64}$'),
  constraint public_booking_verification_otp_hash_check
    check (otp_hash ~ '^[a-f0-9]{64}$'),
  constraint public_booking_verification_ip_hash_check
    check (ip_hash is null or ip_hash ~ '^[a-f0-9]{64}$'),
  constraint public_booking_verification_attempts_check
    check (attempts between 0 and 5),
  constraint public_booking_verification_expiry_check
    check (expires_at > created_at and expires_at <= created_at + interval '15 minutes'),
  constraint public_booking_verification_provider_id_check
    check (provider_message_id is null or char_length(provider_message_id) between 8 and 512)
);

revoke all on table private.public_booking_verifications from public, anon, authenticated;

create index public_booking_verification_phone_created_idx
  on private.public_booking_verifications(phone_hash, created_at desc);

create index public_booking_verification_ip_created_idx
  on private.public_booking_verifications(ip_hash, created_at desc)
  where ip_hash is not null;

create or replace function public.reserve_public_booking_verification_service(
  p_id uuid,
  p_phone_hash text,
  p_otp_hash text,
  p_ip_hash text,
  p_expires_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone_count integer;
  v_ip_count integer;
begin
  if (select auth.role()) <> 'service_role'
    or p_id is null
    or p_phone_hash !~ '^[a-f0-9]{64}$'
    or p_otp_hash !~ '^[a-f0-9]{64}$'
    or (p_ip_hash is not null and p_ip_hash !~ '^[a-f0-9]{64}$')
    or p_expires_at <= now()
    or p_expires_at > now() + interval '10 minutes'
  then
    return 'invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('atlas-public-booking-phone:' || p_phone_hash, 0));
  if p_ip_hash is not null then
    perform pg_advisory_xact_lock(hashtextextended('atlas-public-booking-ip:' || p_ip_hash, 0));
  end if;

  select count(*)::integer
  into v_phone_count
  from private.public_booking_verifications
  where phone_hash = p_phone_hash
    and created_at >= now() - interval '1 hour';

  if v_phone_count >= 6 then
    return 'rate_limited';
  end if;

  if p_ip_hash is not null then
    select count(*)::integer
    into v_ip_count
    from private.public_booking_verifications
    where ip_hash = p_ip_hash
      and created_at >= now() - interval '1 hour';

    if v_ip_count >= 20 then
      return 'rate_limited';
    end if;
  end if;

  update private.public_booking_verifications
  set superseded_at = now()
  where phone_hash = p_phone_hash
    and consumed_at is null
    and superseded_at is null
    and expires_at > now();

  insert into private.public_booking_verifications (
    id,
    phone_hash,
    otp_hash,
    ip_hash,
    expires_at
  ) values (
    p_id,
    p_phone_hash,
    p_otp_hash,
    p_ip_hash,
    p_expires_at
  );

  delete from private.public_booking_verifications
  where created_at < now() - interval '1 day'
    and (
      consumed_at is not null
      or superseded_at is not null
      or expires_at < now()
    );

  return 'ok';
end;
$$;

create or replace function public.attach_public_booking_provider_message_service(
  p_id uuid,
  p_phone_hash text,
  p_provider_message_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  if (select auth.role()) <> 'service_role'
    or p_id is null
    or p_phone_hash !~ '^[a-f0-9]{64}$'
    or char_length(coalesce(p_provider_message_id, '')) not between 8 and 512
  then
    return false;
  end if;

  update private.public_booking_verifications
  set provider_message_id = p_provider_message_id
  where id = p_id
    and phone_hash = p_phone_hash
    and consumed_at is null
    and superseded_at is null
    and expires_at > now();

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

create or replace function public.verify_public_booking_code_service(
  p_id uuid,
  p_phone_hash text,
  p_candidate_otp_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row private.public_booking_verifications%rowtype;
  v_next_attempts integer;
begin
  if (select auth.role()) <> 'service_role'
    or p_id is null
    or p_phone_hash !~ '^[a-f0-9]{64}$'
    or p_candidate_otp_hash !~ '^[a-f0-9]{64}$'
  then
    return 'invalid_challenge';
  end if;

  select *
  into v_row
  from private.public_booking_verifications
  where id = p_id
  for update;

  if not found
    or v_row.phone_hash <> p_phone_hash
    or v_row.consumed_at is not null
    or v_row.superseded_at is not null
  then
    return 'invalid_challenge';
  end if;

  if v_row.expires_at <= now() then
    return 'expired_code';
  end if;

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
    update private.public_booking_verifications
    set attempts = v_next_attempts
    where id = p_id;

    if v_next_attempts >= 5 then
      return 'too_many_attempts';
    end if;
    return 'incorrect_code';
  end if;

  update private.public_booking_verifications
  set attempts = attempts + 1,
      verified_at = now()
  where id = p_id;

  return 'ok';
end;
$$;

create or replace function public.create_verified_public_booking_service(
  p_verification_id uuid,
  p_phone_hash text,
  p_patient_phone text,
  p_patient_name text,
  p_contact_relationship text,
  p_clinic_slug text,
  p_doctor_slug text,
  p_slot_at timestamptz,
  p_reminder_consent boolean,
  p_reminder_language text,
  p_idempotency_key uuid,
  p_patient_token_hash text,
  p_patient_token_expires_at timestamptz
)
returns table(result text, appointment_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_verification private.public_booking_verifications%rowtype;
  v_clinic_id uuid;
  v_doctor_id uuid;
  v_doctor_name text;
  v_interval integer;
  v_min_lead integer;
  v_horizon integer;
  v_service_date date;
  v_local_slot timestamp without time zone;
  v_starts_at time without time zone;
  v_ends_at time without time zone;
  v_existing public.appointments%rowtype;
  v_appointment_id uuid;
begin
  if (select auth.role()) <> 'service_role'
    or p_verification_id is null
    or p_phone_hash !~ '^[a-f0-9]{64}$'
    or p_patient_phone !~ '^\\+9647[0-9]{9}$'
    or p_patient_name <> btrim(p_patient_name)
    or char_length(p_patient_name) not between 2 and 120
    or p_patient_name ~ '[[:cntrl:]]'
    or p_contact_relationship not in ('patient', 'parent_guardian', 'relative_caregiver')
    or p_clinic_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or char_length(p_clinic_slug) not between 3 and 80
    or p_doctor_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or char_length(p_doctor_slug) not between 3 and 80
    or p_slot_at is null
    or p_reminder_language not in ('ku', 'bd', 'ar', 'en')
    or p_idempotency_key is null
    or p_patient_token_hash !~ '^[a-f0-9]{64}$'
    or p_patient_token_expires_at <= now() + interval '10 minutes'
    or p_patient_token_expires_at > now() + interval '31 days'
  then
    return query select 'invalid'::text, null::uuid;
    return;
  end if;

  select *
  into v_verification
  from private.public_booking_verifications
  where id = p_verification_id
  for update;

  if not found
    or v_verification.phone_hash <> p_phone_hash
    or v_verification.verified_at is null
    or v_verification.consumed_at is not null
    or v_verification.superseded_at is not null
    or v_verification.expires_at <= now()
  then
    return query select 'verification_required'::text, null::uuid;
    return;
  end if;

  select
    c.clinic_id,
    d.doctor_id,
    core_doctor.name,
    coalesce(dws.appointment_interval_minutes, core_clinic.appointment_interval_minutes, 15)::integer,
    settings.min_lead_minutes,
    settings.booking_horizon_days
  into
    v_clinic_id,
    v_doctor_id,
    v_doctor_name,
    v_interval,
    v_min_lead,
    v_horizon
  from public.clinic_directory_profiles c
  join public.doctor_directory_profiles d
    on d.clinic_id = c.clinic_id
  join public.doctors core_doctor
    on core_doctor.clinic_id = d.clinic_id
   and core_doctor.id = d.doctor_id
  join public.clinics core_clinic
    on core_clinic.id = c.clinic_id
  join public.clinic_public_booking_settings settings
    on settings.clinic_id = c.clinic_id
   and settings.enabled
  left join public.doctor_workflow_settings dws
    on dws.clinic_id = d.clinic_id
   and dws.doctor_id = d.doctor_id
  where c.slug = p_clinic_slug
    and d.slug = p_doctor_slug
    and c.is_published
    and d.is_published
    and core_doctor.active
  limit 1;

  if v_clinic_id is null then
    return query select 'unavailable'::text, null::uuid;
    return;
  end if;

  select *
  into v_existing
  from public.appointments a
  where a.clinic_id = v_clinic_id
    and a.idempotency_key = p_idempotency_key
  limit 1;

  if found then
    if v_existing.voided_at is null
      and v_existing.patient_name = p_patient_name
      and v_existing.patient_phone = p_patient_phone
      and v_existing.contact_relationship = p_contact_relationship
      and v_existing.doctor_id = v_doctor_id
      and v_existing.appointment_at = p_slot_at
      and v_existing.reminder_consent = p_reminder_consent
      and v_existing.reminder_language = p_reminder_language
    then
      update private.patient_appointment_tokens
      set revoked_at = now()
      where appointment_id = v_existing.id
        and revoked_at is null;

      insert into private.patient_appointment_tokens (
        clinic_id,
        appointment_id,
        token_hash,
        created_by,
        expires_at
      ) values (
        v_clinic_id,
        v_existing.id,
        p_patient_token_hash,
        null,
        p_patient_token_expires_at
      );

      update private.public_booking_verifications
      set consumed_at = coalesce(consumed_at, now())
      where id = p_verification_id;

      return query select 'duplicate'::text, v_existing.id;
      return;
    end if;

    return query select 'idempotency_conflict'::text, null::uuid;
    return;
  end if;

  v_local_slot := p_slot_at at time zone 'Asia/Baghdad';
  v_service_date := v_local_slot::date;

  if p_slot_at < now() + (v_min_lead * interval '1 minute')
    or v_service_date < timezone('Asia/Baghdad', now())::date
    or v_service_date > timezone('Asia/Baghdad', now())::date + (v_horizon - 1)
    or extract(second from v_local_slot) <> 0
  then
    return query select 'slot_unavailable'::text, null::uuid;
    return;
  end if;

  select hours.starts_at, hours.ends_at
  into v_starts_at, v_ends_at
  from public.doctor_public_booking_hours hours
  where hours.clinic_id = v_clinic_id
    and hours.doctor_id = v_doctor_id
    and hours.weekday = extract(dow from v_service_date)::smallint
    and hours.is_enabled
  limit 1;

  if v_starts_at is null
    or v_local_slot::time < v_starts_at
    or v_local_slot::time + (v_interval * interval '1 minute') > v_ends_at
    or mod(
      extract(epoch from (v_local_slot::time - v_starts_at))::integer,
      v_interval * 60
    ) <> 0
    or exists (
      select 1
      from public.doctor_public_booking_closed_dates closed
      where closed.clinic_id = v_clinic_id
        and closed.doctor_id = v_doctor_id
        and closed.booking_date = v_service_date
        and closed.is_closed
    )
  then
    return query select 'slot_unavailable'::text, null::uuid;
    return;
  end if;

  if exists (
    select 1
    from public.appointments a
    where a.clinic_id = v_clinic_id
      and a.doctor_id = v_doctor_id
      and a.status in ('pending', 'confirmed')
      and a.voided_at is null
      and a.appointment_at < p_slot_at + (v_interval * interval '1 minute')
      and a.appointment_at + (v_interval * interval '1 minute') > p_slot_at
  ) then
    return query select 'slot_taken'::text, null::uuid;
    return;
  end if;

  perform set_config('atlas.actor_type', case when p_contact_relationship = 'patient' then 'patient' else 'contact' end, true);

  begin
    insert into public.appointments (
      clinic_id,
      patient_name,
      patient_phone,
      contact_relationship,
      doctor_name,
      doctor_id,
      appointment_at,
      status,
      idempotency_key,
      reminder_consent,
      reminder_language
    ) values (
      v_clinic_id,
      p_patient_name,
      p_patient_phone,
      p_contact_relationship,
      v_doctor_name,
      v_doctor_id,
      p_slot_at,
      'pending',
      p_idempotency_key,
      p_reminder_consent,
      p_reminder_language
    )
    returning id into v_appointment_id;
  exception
    when unique_violation then
      if exists (
        select 1
        from public.appointments a
        where a.clinic_id = v_clinic_id
          and a.doctor_id = v_doctor_id
          and a.appointment_at = p_slot_at
          and a.status in ('pending', 'confirmed')
      ) then
        return query select 'slot_taken'::text, null::uuid;
      end if;
      raise;
  end;

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
    null,
    p_patient_token_expires_at
  );

  update private.public_booking_verifications
  set consumed_at = now()
  where id = p_verification_id;

  return query select 'booked'::text, v_appointment_id;
end;
$$;

revoke all on function public.reserve_public_booking_verification_service(uuid, text, text, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.attach_public_booking_provider_message_service(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.verify_public_booking_code_service(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.create_verified_public_booking_service(
  uuid, text, text, text, text, text, text, timestamptz, boolean, text, uuid, text, timestamptz
) from public, anon, authenticated;

grant execute on function public.reserve_public_booking_verification_service(uuid, text, text, text, timestamptz)
  to service_role;
grant execute on function public.attach_public_booking_provider_message_service(uuid, text, text)
  to service_role;
grant execute on function public.verify_public_booking_code_service(uuid, text, text)
  to service_role;
grant execute on function public.create_verified_public_booking_service(
  uuid, text, text, text, text, text, text, timestamptz, boolean, text, uuid, text, timestamptz
) to service_role;
