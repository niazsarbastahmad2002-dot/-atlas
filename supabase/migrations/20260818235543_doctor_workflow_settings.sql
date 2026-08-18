create table if not exists public.doctor_workflow_settings (
  clinic_id uuid not null,
  doctor_id uuid not null,
  appointment_interval_minutes integer not null default 15,
  reminders_enabled boolean not null default false,
  reminder_lead_minutes integer not null default 1440,
  reminder_second_lead_minutes integer,
  default_reminder_language text not null default 'ku',
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (clinic_id, doctor_id),
  constraint doctor_workflow_settings_doctor_fkey foreign key (clinic_id, doctor_id)
    references public.doctors (clinic_id, id) on delete cascade,
  constraint doctor_workflow_interval_check check (appointment_interval_minutes in (5, 10, 15, 20, 30)),
  constraint doctor_workflow_first_reminder_check check (reminder_lead_minutes between 30 and 10080),
  constraint doctor_workflow_second_reminder_check check (reminder_second_lead_minutes is null or reminder_second_lead_minutes between 30 and 10080),
  constraint doctor_workflow_language_check check (default_reminder_language in ('ku', 'ar', 'en'))
);

alter table public.doctor_workflow_settings enable row level security;
grant select, update on public.doctor_workflow_settings to authenticated;
revoke insert, delete on public.doctor_workflow_settings from authenticated;

create policy doctor_workflow_settings_select on public.doctor_workflow_settings
for select to authenticated using (private.can_access_doctor(clinic_id, doctor_id));

create policy doctor_workflow_settings_update on public.doctor_workflow_settings
for update to authenticated
using (private.can_access_doctor(clinic_id, doctor_id))
with check (private.can_access_doctor(clinic_id, doctor_id) and updated_by = (select auth.uid()));

insert into public.doctor_workflow_settings (
  clinic_id, doctor_id, appointment_interval_minutes, reminders_enabled,
  reminder_lead_minutes, reminder_second_lead_minutes, default_reminder_language
)
select d.clinic_id, d.id, coalesce(c.appointment_interval_minutes, 15),
  coalesce(s.enabled, false), coalesce(s.lead_minutes, 1440), s.second_lead_minutes,
  coalesce(s.default_reminder_language, 'ku')
from public.doctors d
join public.clinics c on c.id = d.clinic_id
left join public.clinic_reminder_settings s on s.clinic_id = d.clinic_id
on conflict (clinic_id, doctor_id) do nothing;

create or replace function private.initialize_doctor_workflow_settings()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_interval integer; v_enabled boolean; v_lead integer; v_second integer; v_language text;
begin
  select c.appointment_interval_minutes into v_interval from public.clinics c where c.id = new.clinic_id;
  select s.enabled, s.lead_minutes, s.second_lead_minutes, s.default_reminder_language
    into v_enabled, v_lead, v_second, v_language
  from public.clinic_reminder_settings s where s.clinic_id = new.clinic_id;
  insert into public.doctor_workflow_settings (
    clinic_id, doctor_id, appointment_interval_minutes, reminders_enabled,
    reminder_lead_minutes, reminder_second_lead_minutes, default_reminder_language
  ) values (
    new.clinic_id, new.id, coalesce(v_interval, 15), coalesce(v_enabled, false),
    coalesce(v_lead, 1440), v_second, coalesce(v_language, 'ku')
  ) on conflict (clinic_id, doctor_id) do nothing;
  return new;
end;
$$;

drop trigger if exists initialize_doctor_workflow_settings on public.doctors;
create trigger initialize_doctor_workflow_settings after insert on public.doctors
for each row execute function private.initialize_doctor_workflow_settings();

create or replace function private.touch_doctor_workflow_settings()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists touch_doctor_workflow_settings on public.doctor_workflow_settings;
create trigger touch_doctor_workflow_settings before update on public.doctor_workflow_settings
for each row execute function private.touch_doctor_workflow_settings();

create or replace function private.schedule_appointment_reminder()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_clinic public.clinic_reminder_settings%rowtype;
  v_doctor public.doctor_workflow_settings%rowtype;
  v_scheduled_for timestamptz; v_lead integer; v_enabled boolean := false;
  v_first integer; v_second integer; v_language_matches boolean := false;
begin
  update public.appointment_reminders r
  set status = 'cancelled', updated_at = now(), locked_at = null, locked_by = null
  where r.appointment_id = new.id and r.status in ('queued', 'retry');

  select * into v_clinic from public.clinic_reminder_settings s where s.clinic_id = new.clinic_id;
  if new.doctor_id is not null then
    select * into v_doctor from public.doctor_workflow_settings d
    where d.clinic_id = new.clinic_id and d.doctor_id = new.doctor_id;
  end if;

  v_enabled := coalesce(v_doctor.reminders_enabled, v_clinic.enabled, false);
  v_first := coalesce(v_doctor.reminder_lead_minutes, v_clinic.lead_minutes);
  v_second := coalesce(v_doctor.reminder_second_lead_minutes, v_clinic.second_lead_minutes);
  v_language_matches := new.reminder_language = v_clinic.template_language
    or (new.reminder_language in ('en','ar','ku') and split_part(v_clinic.template_language, '_', 1) = new.reminder_language);

  if v_enabled and v_clinic.messaging_approved_at is not null and new.reminder_consent
    and v_language_matches and new.status in ('pending', 'confirmed') and new.appointment_at > now() then
    foreach v_lead in array array[v_first, v_second] loop
      if v_lead is null then continue; end if;
      v_scheduled_for := greatest(now(), new.appointment_at - make_interval(mins => v_lead));
      insert into public.appointment_reminders (
        clinic_id, appointment_id, appointment_revision, scheduled_for, next_attempt_at,
        template_name, template_language
      ) values (
        new.clinic_id, new.id, new.appointment_revision, v_scheduled_for, v_scheduled_for,
        v_clinic.template_name, v_clinic.template_language
      ) on conflict (appointment_id, scheduled_for, template_name, template_language)
      do update set appointment_revision = excluded.appointment_revision, status = 'queued', attempts = 0,
        next_attempt_at = excluded.next_attempt_at, provider_message_id = null, sent_at = null,
        locked_at = null, locked_by = null, last_error_code = null, updated_at = now()
      where public.appointment_reminders.status not in ('processing', 'sent', 'delivered', 'read');
    end loop;
  end if;
  perform private.refresh_appointment_reminder_status(new.id);
  return new;
end;
$$;

create or replace function private.reschedule_doctor_workflow_reminders()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_clinic public.clinic_reminder_settings%rowtype; v_appointment record;
  v_scheduled_for timestamptz; v_lead integer; v_language_matches boolean;
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
    where a.clinic_id = new.clinic_id and a.doctor_id = new.doctor_id and a.voided_at is null
      and a.status in ('pending', 'confirmed') and a.reminder_consent and a.appointment_at > now()
  loop
    v_language_matches := v_appointment.reminder_language = v_clinic.template_language
      or (v_appointment.reminder_language in ('en','ar','ku') and split_part(v_clinic.template_language, '_', 1) = v_appointment.reminder_language);
    if new.reminders_enabled and v_clinic.messaging_approved_at is not null and v_language_matches then
      foreach v_lead in array array[new.reminder_lead_minutes, new.reminder_second_lead_minutes] loop
        if v_lead is null then continue; end if;
        v_scheduled_for := greatest(now(), v_appointment.appointment_at - make_interval(mins => v_lead));
        insert into public.appointment_reminders (
          clinic_id, appointment_id, appointment_revision, scheduled_for, next_attempt_at,
          template_name, template_language
        ) values (
          new.clinic_id, v_appointment.id, v_appointment.appointment_revision,
          v_scheduled_for, v_scheduled_for, v_clinic.template_name, v_clinic.template_language
        ) on conflict (appointment_id, scheduled_for, template_name, template_language)
        do update set appointment_revision = excluded.appointment_revision, status = 'queued', attempts = 0,
          next_attempt_at = excluded.next_attempt_at, provider_message_id = null, sent_at = null,
          locked_at = null, locked_by = null, last_error_code = null, updated_at = now()
        where public.appointment_reminders.status not in ('processing', 'sent', 'delivered', 'read');
      end loop;
    end if;
    perform private.refresh_appointment_reminder_status(v_appointment.id);
  end loop;
  return new;
end;
$$;

drop trigger if exists reschedule_doctor_workflow_reminders on public.doctor_workflow_settings;
create trigger reschedule_doctor_workflow_reminders after update on public.doctor_workflow_settings
for each row execute function private.reschedule_doctor_workflow_reminders();

create or replace function private.reschedule_clinic_reminders_after_settings_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_appointment record; v_doctor public.doctor_workflow_settings%rowtype;
  v_scheduled_for timestamptz; v_lead integer; v_language_matches boolean;
begin
  if tg_op = 'UPDATE' and not (
    new.template_name is distinct from old.template_name
    or new.template_language is distinct from old.template_language
    or new.messaging_approved_at is distinct from old.messaging_approved_at
  ) then return new; end if;

  update public.appointment_reminders r
  set status = 'cancelled', updated_at = now(), locked_at = null, locked_by = null
  where r.clinic_id = new.clinic_id and r.status in ('queued', 'retry');

  for v_appointment in
    select a.id, a.doctor_id, a.appointment_revision, a.appointment_at, a.reminder_language
    from public.appointments a
    where a.clinic_id = new.clinic_id and a.voided_at is null and a.status in ('pending', 'confirmed')
      and a.reminder_consent and a.appointment_at > now()
  loop
    select * into v_doctor from public.doctor_workflow_settings d
    where d.clinic_id = new.clinic_id and d.doctor_id = v_appointment.doctor_id;
    v_language_matches := v_appointment.reminder_language = new.template_language
      or (v_appointment.reminder_language in ('en','ar','ku') and split_part(new.template_language, '_', 1) = v_appointment.reminder_language);
    if coalesce(v_doctor.reminders_enabled, false) and new.messaging_approved_at is not null and v_language_matches then
      foreach v_lead in array array[v_doctor.reminder_lead_minutes, v_doctor.reminder_second_lead_minutes] loop
        if v_lead is null then continue; end if;
        v_scheduled_for := greatest(now(), v_appointment.appointment_at - make_interval(mins => v_lead));
        insert into public.appointment_reminders (
          clinic_id, appointment_id, appointment_revision, scheduled_for, next_attempt_at,
          template_name, template_language
        ) values (
          new.clinic_id, v_appointment.id, v_appointment.appointment_revision,
          v_scheduled_for, v_scheduled_for, new.template_name, new.template_language
        ) on conflict (appointment_id, scheduled_for, template_name, template_language)
        do update set appointment_revision = excluded.appointment_revision, status = 'queued', attempts = 0,
          next_attempt_at = excluded.next_attempt_at, provider_message_id = null, sent_at = null,
          locked_at = null, locked_by = null, last_error_code = null, updated_at = now()
        where public.appointment_reminders.status not in ('processing', 'sent', 'delivered', 'read');
      end loop;
    end if;
    perform private.refresh_appointment_reminder_status(v_appointment.id);
  end loop;
  return new;
end;
$$;

create or replace function public.claim_due_whatsapp_reminders(
  p_worker_id uuid, p_limit integer default 25, p_global_daily_limit integer default 500
)
returns table(
  reminder_id uuid, patient_phone text, clinic_name text, appointment_at timestamptz,
  template_name text, template_language text
)
language plpgsql security definer set search_path = '' as $$
declare v_global_remaining integer;
begin
  update public.appointment_reminders r set status = 'failed', last_error_code = 'worker_timeout',
    locked_at = null, locked_by = null, updated_at = now()
  where r.status = 'processing' and r.locked_at < now() - interval '2 minutes';
  delete from public.pending_reminder_delivery_events e where e.received_at < now() - interval '7 days';
  perform pg_advisory_xact_lock(hashtext('atlas_whatsapp_global_quota'));
  select greatest(0, least(greatest(coalesce(p_global_daily_limit, 0), 0), 10000) - count(*)::integer)
    into v_global_remaining
  from public.appointment_reminders r
  where r.status = 'processing' or r.sent_at >= (date_trunc('day', now() at time zone 'Asia/Baghdad') at time zone 'Asia/Baghdad');

  return query
  with active_clinics as materialized (
    select s.clinic_id, s.daily_message_limit from public.clinic_reminder_settings s
    where s.messaging_approved_at is not null and exists (
      select 1 from public.appointment_reminders r
      where r.clinic_id = s.clinic_id and r.status in ('queued', 'retry')
        and r.scheduled_for <= now() and r.next_attempt_at <= now()
    ) for update of s skip locked
  ), clinic_used as (
    select r.clinic_id, count(*)::integer as used_count from public.appointment_reminders r
    where r.status = 'processing' or r.sent_at >= (date_trunc('day', now() at time zone 'Asia/Baghdad') at time zone 'Asia/Baghdad')
    group by r.clinic_id
  ), candidates as (
    select r.id, r.scheduled_for, r.created_at, ac.daily_message_limit, coalesce(cu.used_count, 0) as used_count,
      row_number() over (partition by r.clinic_id order by r.scheduled_for, r.created_at, r.id) as clinic_rank
    from public.appointment_reminders r
    join active_clinics ac on ac.clinic_id = r.clinic_id
    left join clinic_used cu on cu.clinic_id = r.clinic_id
    join public.appointments a on a.id = r.appointment_id and a.clinic_id = r.clinic_id and a.appointment_revision = r.appointment_revision
    where r.status in ('queued', 'retry') and r.attempts < r.max_attempts
      and r.scheduled_for <= now() and r.next_attempt_at <= now() and a.reminder_consent
      and a.status in ('pending', 'confirmed') and a.appointment_at > now()
  ), due_ids as (
    select c.id from candidates c
    where c.clinic_rank <= greatest(0, c.daily_message_limit - c.used_count)
    order by c.clinic_rank, c.scheduled_for, c.created_at, c.id
    limit least(greatest(1, least(coalesce(p_limit, 25), 100)), v_global_remaining)
  ), due as (
    select r.id from public.appointment_reminders r join due_ids d on d.id = r.id
    join public.appointments a on a.id = r.appointment_id and a.clinic_id = r.clinic_id and a.appointment_revision = r.appointment_revision
    where r.status in ('queued', 'retry') and r.attempts < r.max_attempts
      and r.scheduled_for <= now() and r.next_attempt_at <= now() and a.reminder_consent
      and a.status in ('pending', 'confirmed') and a.appointment_at > now()
    for update of r, a skip locked
  ), claimed as (
    update public.appointment_reminders r set status = 'processing', attempts = r.attempts + 1,
      locked_at = now(), locked_by = p_worker_id, updated_at = now()
    from due where r.id = due.id
    returning r.id, r.appointment_id, r.clinic_id, r.template_name, r.template_language
  )
  select c.id, a.patient_phone, cl.name, a.appointment_at, c.template_name, c.template_language
  from claimed c join public.appointments a on a.id = c.appointment_id and a.clinic_id = c.clinic_id
  join public.clinics cl on cl.id = c.clinic_id;
end;
$$;
