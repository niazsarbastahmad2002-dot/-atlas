create or replace function private.whatsapp_template_language(p_language text)
returns text
language sql
immutable
set search_path = ''
as $function$
  select case lower(coalesce(p_language, 'en'))
    when 'ku' then 'ku'
    when 'ckb' then 'ku'
    when 'ar' then 'ar'
    when 'ar_iq' then 'ar'
    when 'en_us' then 'en_US'
    when 'en' then 'en_US'
    else 'en_US'
  end;
$function$;

drop trigger if exists rebuild_clinic_reminders on public.clinic_reminder_settings;

create or replace function private.schedule_appointment_reminder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_clinic public.clinic_reminder_settings%rowtype;
  v_doctor public.doctor_workflow_settings%rowtype;
  v_scheduled_for timestamptz;
  v_lead integer;
  v_enabled boolean := false;
  v_first integer;
  v_second integer;
  v_template_language text;
begin
  update public.appointment_reminders r
  set status = 'cancelled', updated_at = now(), locked_at = null, locked_by = null
  where r.appointment_id = new.id and r.status in ('queued', 'retry');

  select * into v_clinic
  from public.clinic_reminder_settings s
  where s.clinic_id = new.clinic_id;

  if new.doctor_id is not null then
    select * into v_doctor
    from public.doctor_workflow_settings d
    where d.clinic_id = new.clinic_id and d.doctor_id = new.doctor_id;
  end if;

  v_enabled := coalesce(v_doctor.reminders_enabled, v_clinic.enabled, false);
  v_first := coalesce(v_doctor.reminder_lead_minutes, v_clinic.lead_minutes);
  v_second := coalesce(v_doctor.reminder_second_lead_minutes, v_clinic.second_lead_minutes);
  v_template_language := private.whatsapp_template_language(new.reminder_language);

  if v_enabled
    and v_clinic.messaging_approved_at is not null
    and new.reminder_consent
    and new.status in ('pending', 'confirmed')
    and new.appointment_at > now() then
    foreach v_lead in array array[v_first, v_second]
    loop
      if v_lead is null then continue; end if;
      v_scheduled_for := greatest(now(), new.appointment_at - make_interval(mins => v_lead));
      insert into public.appointment_reminders (
        clinic_id, appointment_id, appointment_revision, scheduled_for, next_attempt_at,
        template_name, template_language
      ) values (
        new.clinic_id, new.id, new.appointment_revision, v_scheduled_for, v_scheduled_for,
        v_clinic.template_name, v_template_language
      )
      on conflict (appointment_id, scheduled_for, template_name, template_language)
      do update set appointment_revision = excluded.appointment_revision,
        status = 'queued', attempts = 0, next_attempt_at = excluded.next_attempt_at,
        provider_message_id = null, sent_at = null, locked_at = null, locked_by = null,
        last_error_code = null, updated_at = now()
      where public.appointment_reminders.status not in ('processing', 'sent', 'delivered', 'read');
    end loop;
  end if;
  perform private.refresh_appointment_reminder_status(new.id);
  return new;
end;
$function$;

create or replace function private.reschedule_doctor_workflow_reminders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_clinic public.clinic_reminder_settings%rowtype;
  v_appointment record;
  v_scheduled_for timestamptz;
  v_lead integer;
  v_template_language text;
begin
  if tg_op = 'UPDATE' and not (
    new.reminders_enabled is distinct from old.reminders_enabled
    or new.reminder_lead_minutes is distinct from old.reminder_lead_minutes
    or new.reminder_second_lead_minutes is distinct from old.reminder_second_lead_minutes
    or new.default_reminder_language is distinct from old.default_reminder_language
  ) then return new; end if;

  select * into v_clinic from public.clinic_reminder_settings s where s.clinic_id = new.clinic_id;

  update public.appointment_reminders r
  set status = 'cancelled', updated_at = now(), locked_at = null, locked_by = null
  where r.clinic_id = new.clinic_id and r.status in ('queued', 'retry')
    and exists (select 1 from public.appointments a where a.id = r.appointment_id and a.doctor_id = new.doctor_id);

  for v_appointment in
    select a.id, a.appointment_revision, a.appointment_at, a.reminder_language
    from public.appointments a
    where a.clinic_id = new.clinic_id and a.doctor_id = new.doctor_id
      and a.voided_at is null and a.status in ('pending', 'confirmed')
      and a.reminder_consent and a.appointment_at > now()
  loop
    v_template_language := private.whatsapp_template_language(v_appointment.reminder_language);
    if new.reminders_enabled and v_clinic.messaging_approved_at is not null then
      foreach v_lead in array array[new.reminder_lead_minutes, new.reminder_second_lead_minutes]
      loop
        if v_lead is null then continue; end if;
        v_scheduled_for := greatest(now(), v_appointment.appointment_at - make_interval(mins => v_lead));
        insert into public.appointment_reminders (
          clinic_id, appointment_id, appointment_revision, scheduled_for, next_attempt_at,
          template_name, template_language
        ) values (
          new.clinic_id, v_appointment.id, v_appointment.appointment_revision,
          v_scheduled_for, v_scheduled_for, v_clinic.template_name, v_template_language
        )
        on conflict (appointment_id, scheduled_for, template_name, template_language)
        do update set appointment_revision = excluded.appointment_revision,
          status = 'queued', attempts = 0, next_attempt_at = excluded.next_attempt_at,
          provider_message_id = null, sent_at = null, locked_at = null, locked_by = null,
          last_error_code = null, updated_at = now()
        where public.appointment_reminders.status not in ('processing', 'sent', 'delivered', 'read');
      end loop;
    end if;
    perform private.refresh_appointment_reminder_status(v_appointment.id);
  end loop;
  return new;
end;
$function$;

create or replace function private.reschedule_clinic_reminders_after_settings_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_appointment record;
  v_doctor public.doctor_workflow_settings%rowtype;
  v_scheduled_for timestamptz;
  v_lead integer;
  v_template_language text;
begin
  if tg_op = 'UPDATE' and not (
    new.template_name is distinct from old.template_name
    or new.messaging_approved_at is distinct from old.messaging_approved_at
  ) then return new; end if;

  update public.appointment_reminders r
  set status = 'cancelled', updated_at = now(), locked_at = null, locked_by = null
  where r.clinic_id = new.clinic_id and r.status in ('queued', 'retry');

  for v_appointment in
    select a.id, a.doctor_id, a.appointment_revision, a.appointment_at, a.reminder_language
    from public.appointments a
    where a.clinic_id = new.clinic_id and a.voided_at is null
      and a.status in ('pending', 'confirmed') and a.reminder_consent and a.appointment_at > now()
  loop
    select * into v_doctor from public.doctor_workflow_settings d
    where d.clinic_id = new.clinic_id and d.doctor_id = v_appointment.doctor_id;
    v_template_language := private.whatsapp_template_language(v_appointment.reminder_language);
    if coalesce(v_doctor.reminders_enabled, false) and new.messaging_approved_at is not null then
      foreach v_lead in array array[v_doctor.reminder_lead_minutes, v_doctor.reminder_second_lead_minutes]
      loop
        if v_lead is null then continue; end if;
        v_scheduled_for := greatest(now(), v_appointment.appointment_at - make_interval(mins => v_lead));
        insert into public.appointment_reminders (
          clinic_id, appointment_id, appointment_revision, scheduled_for, next_attempt_at,
          template_name, template_language
        ) values (
          new.clinic_id, v_appointment.id, v_appointment.appointment_revision,
          v_scheduled_for, v_scheduled_for, new.template_name, v_template_language
        )
        on conflict (appointment_id, scheduled_for, template_name, template_language)
        do update set appointment_revision = excluded.appointment_revision,
          status = 'queued', attempts = 0, next_attempt_at = excluded.next_attempt_at,
          provider_message_id = null, sent_at = null, locked_at = null, locked_by = null,
          last_error_code = null, updated_at = now()
        where public.appointment_reminders.status not in ('processing', 'sent', 'delivered', 'read');
      end loop;
    end if;
    perform private.refresh_appointment_reminder_status(v_appointment.id);
  end loop;
  return new;
end;
$function$;

create or replace function public.validate_whatsapp_reminder_claim(p_reminder_id uuid, p_worker_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.appointment_reminders r
    join public.appointments a on a.id = r.appointment_id and a.clinic_id = r.clinic_id
      and a.appointment_revision = r.appointment_revision
    join public.clinic_reminder_settings s on s.clinic_id = r.clinic_id
      and s.messaging_approved_at is not null
    left join public.doctor_workflow_settings d on d.clinic_id = a.clinic_id and d.doctor_id = a.doctor_id
    where r.id = p_reminder_id and r.status = 'processing' and r.locked_by = p_worker_id
      and r.locked_at >= now() - interval '2 minutes'
      and coalesce(d.reminders_enabled, s.enabled, false)
      and a.reminder_consent and a.status in ('pending', 'confirmed') and a.appointment_at > now()
  );
$function$;
