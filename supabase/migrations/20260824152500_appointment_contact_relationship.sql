alter table public.appointments
  add column if not exists contact_relationship text not null default 'patient';

alter table public.appointments
  drop constraint if exists appointments_contact_relationship_check;

alter table public.appointments
  add constraint appointments_contact_relationship_check
  check (contact_relationship in ('patient', 'parent_guardian', 'relative_caregiver'));

alter table public.appointment_audit_events
  drop constraint if exists appointment_audit_events_actor_type_check;

alter table public.appointment_audit_events
  add constraint appointment_audit_events_actor_type_check
  check (actor_type in ('staff', 'patient', 'contact', 'system'));

create or replace function private.write_appointment_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_actor_type text;
  v_before jsonb;
  v_after jsonb;
  v_changed_fields text[];
begin
  v_actor_type := coalesce(
    nullif(current_setting('atlas.actor_type', true), ''),
    case when (select auth.uid()) is null then 'system' else 'staff' end
  );

  if tg_op = 'INSERT' then
    v_action := 'created';
    v_after := jsonb_build_object(
      'status', new.status,
      'appointment_at', new.appointment_at
    );
  elsif new.status = 'voided' and old.status <> 'voided' then
    v_action := 'voided';
    v_before := jsonb_build_object('status', old.status);
    v_after := jsonb_build_object('status', new.status);
  elsif new.status is distinct from old.status then
    v_action := 'status_changed';
    v_before := jsonb_build_object('status', old.status);
    v_after := jsonb_build_object('status', new.status);
  elsif new.appointment_at is distinct from old.appointment_at then
    v_action := 'rescheduled';
    v_before := jsonb_build_object('appointment_at', old.appointment_at);
    v_after := jsonb_build_object('appointment_at', new.appointment_at);
  elsif new.patient_name is distinct from old.patient_name
    or new.patient_phone is distinct from old.patient_phone
    or new.contact_relationship is distinct from old.contact_relationship
    or new.doctor_name is distinct from old.doctor_name
    or new.doctor_id is distinct from old.doctor_id
    or new.reminder_consent is distinct from old.reminder_consent
    or new.reminder_language is distinct from old.reminder_language then
    v_action := 'details_updated';
    v_changed_fields := array_remove(array[
      case when new.patient_name is distinct from old.patient_name then 'patient_name' end,
      case when new.patient_phone is distinct from old.patient_phone then 'patient_phone' end,
      case when new.contact_relationship is distinct from old.contact_relationship then 'contact_relationship' end,
      case when new.doctor_name is distinct from old.doctor_name or new.doctor_id is distinct from old.doctor_id then 'doctor' end,
      case when new.reminder_consent is distinct from old.reminder_consent then 'reminder_consent' end,
      case when new.reminder_language is distinct from old.reminder_language then 'reminder_language' end
    ], null);
    -- Record only field names, never patient/contact values.
    v_after := jsonb_build_object('changed_fields', to_jsonb(v_changed_fields));
  else
    return new;
  end if;

  insert into public.appointment_audit_events (
    clinic_id,
    appointment_id,
    actor_id,
    actor_type,
    action,
    from_status,
    to_status,
    reason,
    entity_type,
    entity_id,
    before_state,
    after_state
  ) values (
    new.clinic_id,
    new.id,
    (select auth.uid()),
    v_actor_type,
    v_action,
    case when tg_op = 'UPDATE' then old.status else null end,
    new.status,
    case when v_action = 'voided' then new.void_reason else null end,
    'appointment',
    new.id,
    v_before,
    v_after
  );

  return new;
end;
$$;

create or replace function public.apply_whatsapp_patient_action_service(
  p_reminder_id uuid,
  p_action text,
  p_patient_phone text,
  p_provider_message_id text,
  p_context_provider_message_id text default null::text
)
returns table(result text, clinic_id uuid, appointment_id uuid, reminder_language text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
  v_clinic_id uuid;
  v_appointment_id uuid;
  v_reminder_language text;
  v_outbound_message_id text;
  v_status text;
  v_appointment_at timestamptz;
  v_doctor_id uuid;
  v_patient_name text;
  v_patient_phone text;
  v_contact_relationship text;
  v_event_id uuid;
begin
  if p_action not in ('confirm', 'cancel', 'earlier', 'on_my_way', 'running_late')
    or p_provider_message_id is null
    or char_length(p_provider_message_id) not between 8 and 512
    or (p_context_provider_message_id is not null and char_length(p_context_provider_message_id) not between 8 and 512)
  then
    return query select 'invalid'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  v_phone := regexp_replace(coalesce(p_patient_phone, ''), '[^0-9]', '', 'g');
  if v_phone !~ '^9647[0-9]{9}$' then
    return query select 'phone_mismatch'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  select
    r.clinic_id,
    r.appointment_id,
    a.reminder_language,
    r.provider_message_id,
    a.status,
    a.appointment_at,
    a.doctor_id,
    a.patient_name,
    a.patient_phone,
    a.contact_relationship
  into
    v_clinic_id,
    v_appointment_id,
    v_reminder_language,
    v_outbound_message_id,
    v_status,
    v_appointment_at,
    v_doctor_id,
    v_patient_name,
    v_patient_phone,
    v_contact_relationship
  from public.appointment_reminders r
  join public.appointments a
    on a.id = r.appointment_id
   and a.clinic_id = r.clinic_id
  where r.id = p_reminder_id
    and r.provider_message_id is not null
    and a.voided_at is null
  for update of r, a;

  if v_appointment_id is null then
    return query select 'unavailable'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  if v_patient_phone <> ('+' || v_phone) then
    return query select 'phone_mismatch'::text, v_clinic_id, v_appointment_id, v_reminder_language;
    return;
  end if;

  if p_context_provider_message_id is not null
    and p_context_provider_message_id <> v_outbound_message_id then
    return query select 'context_mismatch'::text, v_clinic_id, v_appointment_id, v_reminder_language;
    return;
  end if;

  if exists (
    select 1 from private.whatsapp_patient_action_events e
    where e.provider_message_id = p_provider_message_id
  ) then
    return query select 'duplicate'::text, v_clinic_id, v_appointment_id, v_reminder_language;
    return;
  end if;

  if v_status not in ('pending', 'confirmed') then
    return query select 'inactive'::text, v_clinic_id, v_appointment_id, v_reminder_language;
    return;
  end if;

  if p_action = 'earlier' and v_appointment_at <= now() then
    return query select 'too_late'::text, v_clinic_id, v_appointment_id, v_reminder_language;
    return;
  end if;

  if p_action in ('on_my_way', 'running_late')
    and not (now() between v_appointment_at - interval '12 hours' and v_appointment_at + interval '4 hours') then
    return query select 'too_early_or_late'::text, v_clinic_id, v_appointment_id, v_reminder_language;
    return;
  end if;

  if p_action in ('confirm', 'cancel') and now() > v_appointment_at + interval '4 hours' then
    return query select 'too_late'::text, v_clinic_id, v_appointment_id, v_reminder_language;
    return;
  end if;

  insert into private.whatsapp_patient_action_events (
    provider_message_id,
    context_provider_message_id,
    reminder_id,
    appointment_id,
    clinic_id,
    action
  ) values (
    p_provider_message_id,
    p_context_provider_message_id,
    p_reminder_id,
    v_appointment_id,
    v_clinic_id,
    p_action
  )
  on conflict (provider_message_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return query select 'duplicate'::text, v_clinic_id, v_appointment_id, v_reminder_language;
    return;
  end if;

  perform set_config(
    'atlas.actor_type',
    case when v_contact_relationship = 'patient' then 'patient' else 'contact' end,
    true
  );

  if p_action = 'confirm' then
    if v_status = 'pending' then
      update public.appointments
      set status = 'confirmed'
      where id = v_appointment_id;
    end if;

  elsif p_action = 'cancel' then
    update public.appointments
    set status = 'cancelled', arrival_signal = null, arrival_signal_at = null
    where id = v_appointment_id;

  elsif p_action = 'earlier' then
    if v_doctor_id is null then
      raise exception 'doctor_required_for_earlier_slot';
    end if;
    insert into public.smart_fill_waitlist (
      clinic_id,
      doctor_id,
      source_appointment_id,
      patient_name,
      patient_phone,
      reminder_language,
      latest_acceptable_at,
      contact_consent_at,
      status,
      updated_at
    ) values (
      v_clinic_id,
      v_doctor_id,
      v_appointment_id,
      v_patient_name,
      v_patient_phone,
      v_reminder_language,
      v_appointment_at,
      now(),
      'active',
      now()
    )
    on conflict (source_appointment_id)
    do update set
      clinic_id = excluded.clinic_id,
      doctor_id = excluded.doctor_id,
      patient_name = excluded.patient_name,
      patient_phone = excluded.patient_phone,
      reminder_language = excluded.reminder_language,
      latest_acceptable_at = excluded.latest_acceptable_at,
      contact_consent_at = now(),
      status = 'active',
      updated_at = now();

  elsif p_action = 'on_my_way' then
    update public.appointments
    set
      status = case when status = 'pending' then 'confirmed' else status end,
      arrival_signal = 'on_my_way',
      arrival_signal_at = now()
    where id = v_appointment_id;

  elsif p_action = 'running_late' then
    update public.appointments
    set
      status = case when status = 'pending' then 'confirmed' else status end,
      arrival_signal = 'running_late',
      arrival_signal_at = now()
    where id = v_appointment_id;
  end if;

  return query select p_action, v_clinic_id, v_appointment_id, v_reminder_language;
end;
$$;
