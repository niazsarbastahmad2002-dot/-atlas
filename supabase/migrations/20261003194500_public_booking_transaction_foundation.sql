-- Atlas public self-booking transaction foundation.
-- Dormant until Atlas has a real verified-phone booking flow.
-- Only trusted server/service-role code may finalize a public booking.

create or replace function public.create_public_booking_service(
  p_clinic_slug text,
  p_doctor_slug text,
  p_slot_at timestamptz,
  p_patient_name text,
  p_patient_phone text,
  p_idempotency_key uuid,
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
  v_clinic_id uuid;
  v_doctor_id uuid;
  v_doctor_name text;
  v_clinic_published boolean;
  v_doctor_published boolean;
  v_doctor_active boolean;
  v_booking_enabled boolean;
  v_patient_name text := btrim(coalesce(p_patient_name, ''));
  v_existing public.appointments%rowtype;
  v_appointment_id uuid;
begin
  if (select auth.role()) <> 'service_role' then
    return query select 'forbidden'::text, null::uuid;
    return;
  end if;

  if p_clinic_slug is null
     or p_doctor_slug is null
     or char_length(p_clinic_slug) not between 3 and 80
     or char_length(p_doctor_slug) not between 3 and 80
     or p_clinic_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or p_doctor_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or p_slot_at is null
     or p_slot_at <= now()
     or p_idempotency_key is null
     or char_length(v_patient_name) not between 2 and 120
     or v_patient_name ~ '[[:cntrl:]]'
     or p_patient_phone is null
     or p_patient_phone !~ '^\\+9647[0-9]{9}$'
     or p_reminder_language is null
     or p_reminder_language not in ('ku', 'bd', 'ar', 'en')
     or p_reminder_consent is null then
    return query select 'invalid'::text, null::uuid;
    return;
  end if;

  select
    c.clinic_id,
    d.doctor_id,
    core_doctor.name,
    c.is_published,
    d.is_published,
    core_doctor.active,
    coalesce(booking.enabled, false)
  into
    v_clinic_id,
    v_doctor_id,
    v_doctor_name,
    v_clinic_published,
    v_doctor_published,
    v_doctor_active,
    v_booking_enabled
  from public.clinic_directory_profiles c
  join public.doctor_directory_profiles d
    on d.clinic_id = c.clinic_id
  join public.doctors core_doctor
    on core_doctor.clinic_id = d.clinic_id
   and core_doctor.id = d.doctor_id
  left join public.clinic_public_booking_settings booking
    on booking.clinic_id = c.clinic_id
  where c.slug = p_clinic_slug
    and d.slug = p_doctor_slug
  limit 1;

  if v_clinic_id is null or v_doctor_id is null then
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
       and v_existing.patient_name = v_patient_name
       and v_existing.patient_phone = p_patient_phone
       and v_existing.contact_relationship = 'patient'
       and v_existing.doctor_id = v_doctor_id
       and v_existing.appointment_at = p_slot_at
       and v_existing.reminder_consent = p_reminder_consent
       and v_existing.reminder_language = p_reminder_language then
      return query select 'duplicate'::text, v_existing.id;
    else
      return query select 'idempotency_mismatch'::text, null::uuid;
    end if;
    return;
  end if;

  if not (
    coalesce(v_clinic_published, false)
    and coalesce(v_doctor_published, false)
    and coalesce(v_doctor_active, false)
    and coalesce(v_booking_enabled, false)
  ) then
    return query select 'unavailable'::text, null::uuid;
    return;
  end if;

  if not exists (
    select 1
    from public.list_public_doctor_slots(
      p_clinic_slug,
      p_doctor_slug,
      timezone('Asia/Baghdad', p_slot_at)::date,
      1
    ) slot
    where slot.slot_at = p_slot_at
  ) then
    return query select 'unavailable'::text, null::uuid;
    return;
  end if;

  perform set_config('atlas.actor_type', 'patient', true);

  insert into public.appointments (
    clinic_id,
    patient_name,
    patient_phone,
    contact_relationship,
    doctor_name,
    doctor_id,
    appointment_at,
    idempotency_key,
    reminder_consent,
    reminder_language,
    status
  ) values (
    v_clinic_id,
    v_patient_name,
    p_patient_phone,
    'patient',
    v_doctor_name,
    v_doctor_id,
    p_slot_at,
    p_idempotency_key,
    p_reminder_consent,
    p_reminder_language,
    'pending'
  )
  on conflict (clinic_id, idempotency_key) do nothing
  returning id into v_appointment_id;

  if v_appointment_id is null then
    select *
    into v_existing
    from public.appointments a
    where a.clinic_id = v_clinic_id
      and a.idempotency_key = p_idempotency_key
    limit 1;

    if found
       and v_existing.voided_at is null
       and v_existing.patient_name = v_patient_name
       and v_existing.patient_phone = p_patient_phone
       and v_existing.contact_relationship = 'patient'
       and v_existing.doctor_id = v_doctor_id
       and v_existing.appointment_at = p_slot_at
       and v_existing.reminder_consent = p_reminder_consent
       and v_existing.reminder_language = p_reminder_language then
      return query select 'duplicate'::text, v_existing.id;
    end if;

    return query select 'idempotency_mismatch'::text, null::uuid;
    return;
  end if;

  return query select 'created'::text, v_appointment_id;
  return;
exception
  when unique_violation then
    -- The doctor/slot uniqueness index remains the final race-condition authority.
    return query select 'slot_taken'::text, null::uuid;
    return;
end;
$$;

revoke all on function public.create_public_booking_service(
  text, text, timestamptz, text, text, uuid, text, boolean
) from public, anon, authenticated;

grant execute on function public.create_public_booking_service(
  text, text, timestamptz, text, text, uuid, text, boolean
) to service_role;

     or p_reminder_language is null
     or p_reminder_language not in ('ku', 'bd', 'ar', 'en')
     or p_reminder_consent is null then
    return query select 'invalid'::text, null::uuid;
    return;
  end if;

  select
    c.clinic_id,
    d.doctor_id,
    core_doctor.name
  into
    v_clinic_id,
    v_doctor_id,
    v_doctor_name
  from public.clinic_directory_profiles c
  join public.doctor_directory_profiles d
    on d.clinic_id = c.clinic_id
  join public.doctors core_doctor
    on core_doctor.clinic_id = d.clinic_id
   and core_doctor.id = d.doctor_id
   and core_doctor.active
  join public.clinic_public_booking_settings booking
    on booking.clinic_id = c.clinic_id
   and booking.enabled
  where c.slug = p_clinic_slug
    and d.slug = p_doctor_slug
    and c.is_published
    and d.is_published
  limit 1;

  if v_clinic_id is null or v_doctor_id is null then
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
       and v_existing.patient_name = v_patient_name
       and v_existing.patient_phone = p_patient_phone
       and v_existing.contact_relationship = 'patient'
       and v_existing.doctor_id = v_doctor_id
       and v_existing.appointment_at = p_slot_at
       and v_existing.reminder_consent = p_reminder_consent
       and v_existing.reminder_language = p_reminder_language then
      return query select 'duplicate'::text, v_existing.id;
    else
      return query select 'idempotency_mismatch'::text, null::uuid;
    end if;
    return;
  end if;

  if not exists (
    select 1
    from public.list_public_doctor_slots(
      p_clinic_slug,
      p_doctor_slug,
      timezone('Asia/Baghdad', p_slot_at)::date,
      1
    ) slot
    where slot.slot_at = p_slot_at
  ) then
    return query select 'unavailable'::text, null::uuid;
    return;
  end if;

  perform set_config('atlas.actor_type', 'patient', true);

  insert into public.appointments (
    clinic_id,
    patient_name,
    patient_phone,
    contact_relationship,
    doctor_name,
    doctor_id,
    appointment_at,
    idempotency_key,
    reminder_consent,
    reminder_language,
    status
  ) values (
    v_clinic_id,
    v_patient_name,
    p_patient_phone,
    'patient',
    v_doctor_name,
    v_doctor_id,
    p_slot_at,
    p_idempotency_key,
    p_reminder_consent,
    p_reminder_language,
    'pending'
  )
  returning id into v_appointment_id;

  return query select 'created'::text, v_appointment_id;
  return;
exception
  when unique_violation then
    -- The doctor/slot uniqueness index remains the final race-condition authority.
    return query select 'slot_taken'::text, null::uuid;
    return;
end;
$$;

revoke all on function public.create_public_booking_service(
  text, text, timestamptz, text, text, uuid, text, boolean
) from public, anon, authenticated;

grant execute on function public.create_public_booking_service(
  text, text, timestamptz, text, text, uuid, text, boolean
) to service_role;

     or p_reminder_language is null
     or p_reminder_language not in ('ku', 'bd', 'ar', 'en')
     or p_reminder_consent is null then
    return query select 'invalid'::text, null::uuid;
    return;
  end if;

  select
    c.clinic_id,
    d.doctor_id,
    core_doctor.name,
    c.is_published,
    d.is_published,
    core_doctor.active,
    coalesce(booking.enabled, false)
  into
    v_clinic_id,
    v_doctor_id,
    v_doctor_name,
    v_clinic_published,
    v_doctor_published,
    v_doctor_active,
    v_booking_enabled
  from public.clinic_directory_profiles c
  join public.doctor_directory_profiles d
    on d.clinic_id = c.clinic_id
  join public.doctors core_doctor
    on core_doctor.clinic_id = d.clinic_id
   and core_doctor.id = d.doctor_id
  left join public.clinic_public_booking_settings booking
    on booking.clinic_id = c.clinic_id
  where c.slug = p_clinic_slug
    and d.slug = p_doctor_slug
  limit 1;

  if v_clinic_id is null or v_doctor_id is null then
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
       and v_existing.patient_name = v_patient_name
       and v_existing.patient_phone = p_patient_phone
       and v_existing.contact_relationship = 'patient'
       and v_existing.doctor_id = v_doctor_id
       and v_existing.appointment_at = p_slot_at
       and v_existing.reminder_consent = p_reminder_consent
       and v_existing.reminder_language = p_reminder_language then
      return query select 'duplicate'::text, v_existing.id;
    else
      return query select 'idempotency_mismatch'::text, null::uuid;
    end if;
    return;
  end if;

  if not (
    coalesce(v_clinic_published, false)
    and coalesce(v_doctor_published, false)
    and coalesce(v_doctor_active, false)
    and coalesce(v_booking_enabled, false)
  ) then
    return query select 'unavailable'::text, null::uuid;
    return;
  end if;

  if not exists (
    select 1
    from public.list_public_doctor_slots(
      p_clinic_slug,
      p_doctor_slug,
      timezone('Asia/Baghdad', p_slot_at)::date,
      1
    ) slot
    where slot.slot_at = p_slot_at
  ) then
    return query select 'unavailable'::text, null::uuid;
    return;
  end if;

  perform set_config('atlas.actor_type', 'patient', true);

  insert into public.appointments (
    clinic_id,
    patient_name,
    patient_phone,
    contact_relationship,
    doctor_name,
    doctor_id,
    appointment_at,
    idempotency_key,
    reminder_consent,
    reminder_language,
    status
  ) values (
    v_clinic_id,
    v_patient_name,
    p_patient_phone,
    'patient',
    v_doctor_name,
    v_doctor_id,
    p_slot_at,
    p_idempotency_key,
    p_reminder_consent,
    p_reminder_language,
    'pending'
  )
  on conflict (clinic_id, idempotency_key) do nothing
  returning id into v_appointment_id;

  if v_appointment_id is null then
    select *
    into v_existing
    from public.appointments a
    where a.clinic_id = v_clinic_id
      and a.idempotency_key = p_idempotency_key
    limit 1;

    if found
       and v_existing.voided_at is null
       and v_existing.patient_name = v_patient_name
       and v_existing.patient_phone = p_patient_phone
       and v_existing.contact_relationship = 'patient'
       and v_existing.doctor_id = v_doctor_id
       and v_existing.appointment_at = p_slot_at
       and v_existing.reminder_consent = p_reminder_consent
       and v_existing.reminder_language = p_reminder_language then
      return query select 'duplicate'::text, v_existing.id;
    end if;

    return query select 'idempotency_mismatch'::text, null::uuid;
    return;
  end if;

  return query select 'created'::text, v_appointment_id;
  return;
exception
  when unique_violation then
    -- The doctor/slot uniqueness index remains the final race-condition authority.
    return query select 'slot_taken'::text, null::uuid;
    return;
end;
$$;

revoke all on function public.create_public_booking_service(
  text, text, timestamptz, text, text, uuid, text, boolean
) from public, anon, authenticated;

grant execute on function public.create_public_booking_service(
  text, text, timestamptz, text, text, uuid, text, boolean
) to service_role;

     or p_reminder_language is null
     or p_reminder_language not in ('ku', 'bd', 'ar', 'en')
     or p_reminder_consent is null then
    return query select 'invalid'::text, null::uuid;
    return;
  end if;

  select
    c.clinic_id,
    d.doctor_id,
    core_doctor.name
  into
    v_clinic_id,
    v_doctor_id,
    v_doctor_name
  from public.clinic_directory_profiles c
  join public.doctor_directory_profiles d
    on d.clinic_id = c.clinic_id
  join public.doctors core_doctor
    on core_doctor.clinic_id = d.clinic_id
   and core_doctor.id = d.doctor_id
   and core_doctor.active
  join public.clinic_public_booking_settings booking
    on booking.clinic_id = c.clinic_id
   and booking.enabled
  where c.slug = p_clinic_slug
    and d.slug = p_doctor_slug
    and c.is_published
    and d.is_published
  limit 1;

  if v_clinic_id is null or v_doctor_id is null then
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
       and v_existing.patient_name = v_patient_name
       and v_existing.patient_phone = p_patient_phone
       and v_existing.contact_relationship = 'patient'
       and v_existing.doctor_id = v_doctor_id
       and v_existing.appointment_at = p_slot_at
       and v_existing.reminder_consent = p_reminder_consent
       and v_existing.reminder_language = p_reminder_language then
      return query select 'duplicate'::text, v_existing.id;
    else
      return query select 'idempotency_mismatch'::text, null::uuid;
    end if;
    return;
  end if;

  if not exists (
    select 1
    from public.list_public_doctor_slots(
      p_clinic_slug,
      p_doctor_slug,
      timezone('Asia/Baghdad', p_slot_at)::date,
      1
    ) slot
    where slot.slot_at = p_slot_at
  ) then
    return query select 'unavailable'::text, null::uuid;
    return;
  end if;

  perform set_config('atlas.actor_type', 'patient', true);

  insert into public.appointments (
    clinic_id,
    patient_name,
    patient_phone,
    contact_relationship,
    doctor_name,
    doctor_id,
    appointment_at,
    idempotency_key,
    reminder_consent,
    reminder_language,
    status
  ) values (
    v_clinic_id,
    v_patient_name,
    p_patient_phone,
    'patient',
    v_doctor_name,
    v_doctor_id,
    p_slot_at,
    p_idempotency_key,
    p_reminder_consent,
    p_reminder_language,
    'pending'
  )
  returning id into v_appointment_id;

  return query select 'created'::text, v_appointment_id;
  return;
exception
  when unique_violation then
    -- The doctor/slot uniqueness index remains the final race-condition authority.
    return query select 'slot_taken'::text, null::uuid;
    return;
end;
$$;

revoke all on function public.create_public_booking_service(
  text, text, timestamptz, text, text, uuid, text, boolean
) from public, anon, authenticated;

grant execute on function public.create_public_booking_service(
  text, text, timestamptz, text, text, uuid, text, boolean
) to service_role;
