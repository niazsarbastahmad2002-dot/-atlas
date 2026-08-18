-- A patient can attend or miss an appointment without having confirmed it first.
-- Keep outcome timing protection, but do not force reception through a fake Confirm step.

create or replace function private.prepare_appointment_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reminders_enabled boolean := false;
  v_template_language text;
begin
  if tg_op = 'UPDATE' then
    if new.clinic_id is distinct from old.clinic_id
      or new.idempotency_key is distinct from old.idempotency_key
      or new.created_at is distinct from old.created_at then
      raise exception 'immutable appointment identity' using errcode = '42501';
    end if;
    if new.status is distinct from old.status and not (
      (old.status = 'pending' and new.status in ('confirmed', 'cancelled', 'completed', 'no_show', 'voided'))
      or (old.status = 'confirmed' and new.status in ('pending', 'cancelled', 'completed', 'no_show', 'voided'))
      or (old.status = 'cancelled' and new.status in ('pending', 'voided'))
      or (old.status in ('completed', 'no_show') and new.status in ('confirmed', 'voided'))
    ) then
      raise exception 'invalid appointment status transition' using errcode = '23514';
    end if;

    if new.status = 'voided' and old.status <> 'voided' then
      if new.void_reason is null or char_length(btrim(new.void_reason)) not between 3 and 240 then
        raise exception 'void reason required' using errcode = '23514';
      end if;
      new.void_reason := btrim(new.void_reason);
      new.voided_at := now();
      new.voided_by := (select auth.uid());
      if new.voided_by is null then
        raise exception 'authenticated actor required' using errcode = '42501';
      end if;
    elsif new.status <> 'voided' then
      new.void_reason := null;
      new.voided_at := null;
      new.voided_by := null;
    end if;

    if new.patient_name is distinct from old.patient_name
      or new.patient_phone is distinct from old.patient_phone
      or new.doctor_name is distinct from old.doctor_name
      or new.doctor_id is distinct from old.doctor_id
      or new.appointment_at is distinct from old.appointment_at
      or new.status is distinct from old.status
      or new.reminder_consent is distinct from old.reminder_consent
      or new.reminder_language is distinct from old.reminder_language then
      new.appointment_revision := old.appointment_revision + 1;
    else
      new.appointment_revision := old.appointment_revision;
    end if;
    if new.reminder_consent is distinct from old.reminder_consent then
      new.reminder_consent_at := case when new.reminder_consent then now() else null end;
    else
      new.reminder_consent_at := old.reminder_consent_at;
    end if;
  else
    if new.status = 'voided' then
      raise exception 'appointments cannot be created voided' using errcode = '23514';
    end if;
    new.appointment_revision := 1;
    new.reminder_consent_at := case when new.reminder_consent then now() else null end;
  end if;

  select coalesce(s.enabled and s.messaging_approved_at is not null, false), s.template_language
    into v_reminders_enabled, v_template_language
  from public.clinic_reminder_settings s where s.clinic_id = new.clinic_id;

  new.updated_at := now();
  if tg_op = 'INSERT'
    or new.status is distinct from old.status
    or new.appointment_at is distinct from old.appointment_at
    or new.reminder_consent is distinct from old.reminder_consent
    or new.reminder_language is distinct from old.reminder_language then
    if new.status not in ('pending', 'confirmed') then
      new.reminder_status := 'cancelled';
    elsif v_reminders_enabled and new.reminder_consent
      and new.reminder_language = v_template_language and new.appointment_at > now() then
      new.reminder_status := 'queued';
    else
      new.reminder_status := 'disabled';
    end if;
  end if;
  return new;
end;
$$;
