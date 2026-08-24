-- Atlas Patient Loop: make WhatsApp actions update the real clinic schedule.
-- The web patient page remains a private fallback/details surface.

alter table public.appointments
  add column if not exists arrival_signal text,
  add column if not exists arrival_signal_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'appointments_arrival_signal_check'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_arrival_signal_check
      check (arrival_signal is null or arrival_signal in ('on_my_way', 'running_late'));
  end if;
end $$;

create table if not exists public.doctor_day_flow (
  clinic_id uuid not null,
  doctor_id uuid not null,
  service_day date not null,
  delay_minutes integer not null default 0,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (clinic_id, doctor_id, service_day),
  constraint doctor_day_flow_doctor_fkey
    foreign key (clinic_id, doctor_id)
    references public.doctors(clinic_id, id) on delete cascade,
  constraint doctor_day_flow_delay_check
    check (delay_minutes in (-15, 0, 15, 30, 45, 60, 90, 120))
);

create index if not exists doctor_day_flow_updated_by_idx
  on public.doctor_day_flow(updated_by)
  where updated_by is not null;

alter table public.doctor_day_flow enable row level security;
grant select, insert, update on public.doctor_day_flow to authenticated;
revoke delete on public.doctor_day_flow from authenticated;

drop policy if exists doctor_day_flow_select on public.doctor_day_flow;
create policy doctor_day_flow_select
  on public.doctor_day_flow
  for select to authenticated
  using (private.can_access_doctor(clinic_id, doctor_id));

drop policy if exists doctor_day_flow_insert on public.doctor_day_flow;
create policy doctor_day_flow_insert
  on public.doctor_day_flow
  for insert to authenticated
  with check (
    private.can_access_doctor(clinic_id, doctor_id)
    and updated_by = (select auth.uid())
  );

drop policy if exists doctor_day_flow_update on public.doctor_day_flow;
create policy doctor_day_flow_update
  on public.doctor_day_flow
  for update to authenticated
  using (private.can_access_doctor(clinic_id, doctor_id))
  with check (
    private.can_access_doctor(clinic_id, doctor_id)
    and updated_by = (select auth.uid())
  );

create table if not exists private.whatsapp_patient_action_events (
  id uuid primary key default gen_random_uuid(),
  provider_message_id text not null unique,
  context_provider_message_id text,
  reminder_id uuid not null references public.appointment_reminders(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now(),
  constraint whatsapp_patient_action_events_action_check
    check (action in ('confirm', 'cancel', 'earlier', 'on_my_way', 'running_late')),
  constraint whatsapp_patient_action_events_provider_id_check
    check (char_length(provider_message_id) between 8 and 512),
  constraint whatsapp_patient_action_events_context_id_check
    check (context_provider_message_id is null or char_length(context_provider_message_id) between 8 and 512)
);

create index if not exists whatsapp_patient_action_events_reminder_idx
  on private.whatsapp_patient_action_events(reminder_id, created_at desc);
create index if not exists whatsapp_patient_action_events_appointment_idx
  on private.whatsapp_patient_action_events(appointment_id, created_at desc);
create index if not exists whatsapp_patient_action_events_clinic_idx
  on private.whatsapp_patient_action_events(clinic_id, created_at desc);

alter table private.whatsapp_patient_action_events enable row level security;
revoke all on private.whatsapp_patient_action_events from public, anon, authenticated;
grant all on private.whatsapp_patient_action_events to service_role;

create or replace function private.clear_arrival_signal_when_inactive()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status not in ('pending', 'confirmed') then
    new.arrival_signal := null;
    new.arrival_signal_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists clear_arrival_signal_when_inactive on public.appointments;
create trigger clear_arrival_signal_when_inactive
before update of status on public.appointments
for each row execute function private.clear_arrival_signal_when_inactive();

-- Rich reminder claim. The existing v2 function keeps all quota, locking and
-- retry behavior; v3 only adds the context needed to render a patient-native
-- WhatsApp message. With two reminders, the earlier one confirms attendance and
-- the later one handles day-of arrival. A single reminder inside six hours is
-- treated as day-of; otherwise it is a confirmation reminder.
create or replace function public.claim_due_whatsapp_reminders_v3(
  p_worker_id uuid,
  p_limit integer default 25,
  p_global_daily_limit integer default 500
)
returns table(
  reminder_id uuid,
  appointment_id uuid,
  clinic_id uuid,
  patient_phone text,
  clinic_name text,
  doctor_name text,
  appointment_at timestamptz,
  scheduled_for timestamptz,
  template_name text,
  template_language text,
  message_kind text,
  delay_minutes integer
)
language sql
security definer
set search_path = ''
as $$
  select
    x.reminder_id,
    r.appointment_id,
    x.clinic_id,
    x.patient_phone,
    x.clinic_name,
    a.doctor_name,
    x.appointment_at,
    r.scheduled_for,
    x.template_name,
    x.template_language,
    case
      when exists (
        select 1
        from public.appointment_reminders later
        where later.appointment_id = r.appointment_id
          and later.appointment_revision = r.appointment_revision
          and later.id <> r.id
          and later.scheduled_for > r.scheduled_for
          and later.status <> 'cancelled'
      ) then 'confirm'
      when a.appointment_at - r.scheduled_for <= interval '6 hours' then 'day_of'
      else 'confirm'
    end as message_kind,
    coalesce(flow.delay_minutes, 0) as delay_minutes
  from public.claim_due_whatsapp_reminders_v2(
    p_worker_id,
    p_limit,
    p_global_daily_limit
  ) x
  join public.appointment_reminders r on r.id = x.reminder_id
  join public.appointments a
    on a.id = r.appointment_id
   and a.clinic_id = r.clinic_id
  left join public.doctor_day_flow flow
    on flow.clinic_id = a.clinic_id
   and flow.doctor_id = a.doctor_id
   and flow.service_day = (a.appointment_at at time zone 'Asia/Baghdad')::date;
$$;

revoke all on function public.claim_due_whatsapp_reminders_v3(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_whatsapp_reminders_v3(uuid, integer, integer)
  to service_role;

-- Apply one authenticated WhatsApp quick-reply to the real appointment. The
-- server verifies the webhook signature and the signed button payload before
-- calling this RPC; this function additionally binds the action to the patient
-- phone and original outbound message and deduplicates Meta webhook retries.
create or replace function public.apply_whatsapp_patient_action_service(
  p_reminder_id uuid,
  p_action text,
  p_patient_phone text,
  p_provider_message_id text,
  p_context_provider_message_id text default null
)
returns table(
  result text,
  clinic_id uuid,
  appointment_id uuid,
  reminder_language text
)
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
    a.patient_phone
  into
    v_clinic_id,
    v_appointment_id,
    v_reminder_language,
    v_outbound_message_id,
    v_status,
    v_appointment_at,
    v_doctor_id,
    v_patient_name,
    v_patient_phone
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

  perform set_config('atlas.actor_type', 'patient', true);

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

revoke all on function public.apply_whatsapp_patient_action_service(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.apply_whatsapp_patient_action_service(uuid, text, text, text, text)
  to service_role;

-- The private web fallback can show the same human-entered clinic timing without
-- revealing clinic/doctor identifiers to the browser.
create or replace function public.patient_get_day_flow(p_token_hash text)
returns table(
  delay_minutes integer,
  timing_updated_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select f.delay_minutes, f.updated_at
  from private.patient_appointment_tokens t
  join public.appointments a
    on a.id = t.appointment_id
   and a.clinic_id = t.clinic_id
  join public.doctor_day_flow f
    on f.clinic_id = a.clinic_id
   and f.doctor_id = a.doctor_id
   and f.service_day = (a.appointment_at at time zone 'Asia/Baghdad')::date
  where t.token_hash = p_token_hash
    and t.revoked_at is null
    and t.expires_at > now()
    and a.voided_at is null
  limit 1;
$$;

revoke all on function public.patient_get_day_flow(text) from public, anon, authenticated;
grant execute on function public.patient_get_day_flow(text) to service_role;
