-- Atlas reminder cadence: support a simple two-stage reminder plan.
-- New clinics default to one day + two hours before the appointment.

alter table public.clinic_reminder_settings
  add column if not exists second_lead_minutes integer;

alter table public.clinic_reminder_settings
  alter column second_lead_minutes set default 120;

update public.clinic_reminder_settings
set second_lead_minutes = case
  when lead_minutes = 120 then 1440
  else 120
end
where second_lead_minutes is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'clinic_reminder_settings_second_lead_minutes_check'
      and conrelid = 'public.clinic_reminder_settings'::regclass
  ) then
    alter table public.clinic_reminder_settings
      add constraint clinic_reminder_settings_second_lead_minutes_check
      check (second_lead_minutes is null or second_lead_minutes between 30 and 10080);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'clinic_reminder_settings_distinct_leads_check'
      and conrelid = 'public.clinic_reminder_settings'::regclass
  ) then
    alter table public.clinic_reminder_settings
      add constraint clinic_reminder_settings_distinct_leads_check
      check (second_lead_minutes is null or second_lead_minutes <> lead_minutes);
  end if;
end $$;

create or replace function private.schedule_appointment_reminder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.clinic_reminder_settings%rowtype;
  v_scheduled_for timestamptz;
  v_lead integer;
begin
  update public.appointment_reminders r
  set status = 'cancelled', updated_at = now(), locked_at = null, locked_by = null
  where r.appointment_id = new.id and r.status in ('queued', 'retry');

  select * into v_settings
  from public.clinic_reminder_settings s
  where s.clinic_id = new.clinic_id;

  if coalesce(v_settings.enabled, false)
    and v_settings.messaging_approved_at is not null
    and new.reminder_consent
    and new.reminder_language = v_settings.template_language
    and new.status in ('pending', 'confirmed')
    and new.appointment_at > now() then

    foreach v_lead in array array[v_settings.lead_minutes, v_settings.second_lead_minutes]
    loop
      if v_lead is null then
        continue;
      end if;

      v_scheduled_for := greatest(now(), new.appointment_at - make_interval(mins => v_lead));

      insert into public.appointment_reminders (
        clinic_id, appointment_id, appointment_revision, scheduled_for, next_attempt_at,
        template_name, template_language
      ) values (
        new.clinic_id, new.id, new.appointment_revision, v_scheduled_for, v_scheduled_for,
        v_settings.template_name, new.reminder_language
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
$$;

create or replace function private.reschedule_clinic_reminders_after_settings_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment record;
  v_scheduled_for timestamptz;
  v_lead integer;
begin
  if tg_op = 'UPDATE' and not (
    new.enabled is distinct from old.enabled
    or new.lead_minutes is distinct from old.lead_minutes
    or new.second_lead_minutes is distinct from old.second_lead_minutes
    or new.template_name is distinct from old.template_name
    or new.template_language is distinct from old.template_language
    or new.messaging_approved_at is distinct from old.messaging_approved_at
  ) then
    return new;
  end if;

  update public.appointment_reminders r
  set status = 'cancelled', updated_at = now(), locked_at = null, locked_by = null
  where r.clinic_id = new.clinic_id and r.status in ('queued', 'retry');

  if coalesce(new.enabled, false) and new.messaging_approved_at is not null then
    for v_appointment in
      select a.id, a.appointment_revision, a.appointment_at, a.reminder_language
      from public.appointments a
      where a.clinic_id = new.clinic_id
        and a.voided_at is null
        and a.status in ('pending', 'confirmed')
        and a.reminder_consent
        and a.reminder_language = new.template_language
        and a.appointment_at > now()
    loop
      foreach v_lead in array array[new.lead_minutes, new.second_lead_minutes]
      loop
        if v_lead is null then
          continue;
        end if;

        v_scheduled_for := greatest(now(), v_appointment.appointment_at - make_interval(mins => v_lead));

        insert into public.appointment_reminders (
          clinic_id, appointment_id, appointment_revision, scheduled_for, next_attempt_at,
          template_name, template_language
        ) values (
          new.clinic_id, v_appointment.id, v_appointment.appointment_revision,
          v_scheduled_for, v_scheduled_for, new.template_name, v_appointment.reminder_language
        )
        on conflict (appointment_id, scheduled_for, template_name, template_language)
        do update set appointment_revision = excluded.appointment_revision,
          status = 'queued', attempts = 0, next_attempt_at = excluded.next_attempt_at,
          provider_message_id = null, sent_at = null, locked_at = null, locked_by = null,
          last_error_code = null, updated_at = now()
        where public.appointment_reminders.status not in ('processing', 'sent', 'delivered', 'read');
      end loop;

      perform private.refresh_appointment_reminder_status(v_appointment.id);
    end loop;
  else
    update public.appointments a
    set reminder_status = 'disabled', updated_at = now()
    where a.clinic_id = new.clinic_id
      and a.voided_at is null
      and a.status in ('pending', 'confirmed')
      and a.appointment_at > now();
  end if;

  return new;
end;
$$;

drop trigger if exists reschedule_clinic_reminders_after_settings_change
  on public.clinic_reminder_settings;

create trigger reschedule_clinic_reminders_after_settings_change
after insert or update on public.clinic_reminder_settings
for each row execute function private.reschedule_clinic_reminders_after_settings_change();
