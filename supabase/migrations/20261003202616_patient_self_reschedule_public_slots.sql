-- Atlas Vision: let a private patient link see and claim another real public slot.
-- Service-role only; the patient web route remains the only caller.

create or replace function public.patient_list_reschedule_slots(
  p_token_hash text,
  p_days integer default 7
)
returns table(
  slot_at timestamptz,
  appointment_interval_minutes integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_clinic_slug text;
  v_doctor_slug text;
  v_current_slot timestamptz;
begin
  if (select auth.role()) <> 'service_role'
     or p_token_hash !~ '^[a-f0-9]{64}$' then
    return;
  end if;

  select
    cdp.slug,
    ddp.slug,
    a.appointment_at
  into
    v_clinic_slug,
    v_doctor_slug,
    v_current_slot
  from private.patient_appointment_tokens t
  join public.appointments a
    on a.id = t.appointment_id
   and a.clinic_id = t.clinic_id
  join public.clinic_directory_profiles cdp
    on cdp.clinic_id = a.clinic_id
   and cdp.is_published
  join public.doctor_directory_profiles ddp
    on ddp.clinic_id = a.clinic_id
   and ddp.doctor_id = a.doctor_id
   and ddp.is_published
  where t.token_hash = p_token_hash
    and t.revoked_at is null
    and t.expires_at > now()
    and a.voided_at is null
    and a.status in ('pending', 'confirmed')
    and a.appointment_at > now()
  limit 1;

  if v_clinic_slug is null or v_doctor_slug is null then
    return;
  end if;

  update private.patient_appointment_tokens
  set last_used_at = now()
  where token_hash = p_token_hash
    and revoked_at is null
    and expires_at > now();

  return query
  select s.slot_at, s.appointment_interval_minutes
  from public.list_public_doctor_slots(
    v_clinic_slug,
    v_doctor_slug,
    null,
    greatest(1, least(coalesce(p_days, 7), 14))
  ) s
  where s.slot_at <> v_current_slot
  order by s.slot_at
  limit 60;
end;
$$;

revoke all on function public.patient_list_reschedule_slots(text, integer)
  from public, anon, authenticated;
grant execute on function public.patient_list_reschedule_slots(text, integer)
  to service_role;

create or replace function public.patient_reschedule_appointment(
  p_token_hash text,
  p_slot_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment_id uuid;
  v_current_slot timestamptz;
  v_clinic_slug text;
  v_doctor_slug text;
begin
  if (select auth.role()) <> 'service_role'
     or p_token_hash !~ '^[a-f0-9]{64}$'
     or p_slot_at is null
     or p_slot_at <= now() then
    return 'invalid';
  end if;

  select
    a.id,
    a.appointment_at,
    cdp.slug,
    ddp.slug
  into
    v_appointment_id,
    v_current_slot,
    v_clinic_slug,
    v_doctor_slug
  from private.patient_appointment_tokens t
  join public.appointments a
    on a.id = t.appointment_id
   and a.clinic_id = t.clinic_id
  join public.clinic_directory_profiles cdp
    on cdp.clinic_id = a.clinic_id
   and cdp.is_published
  join public.doctor_directory_profiles ddp
    on ddp.clinic_id = a.clinic_id
   and ddp.doctor_id = a.doctor_id
   and ddp.is_published
  where t.token_hash = p_token_hash
    and t.revoked_at is null
    and t.expires_at > now()
    and a.voided_at is null
    and a.status in ('pending', 'confirmed')
    and a.appointment_at > now()
  for update of a
  limit 1;

  if v_appointment_id is null then
    return 'unavailable';
  end if;

  if v_current_slot = p_slot_at then
    return 'unchanged';
  end if;

  if not exists (
    select 1
    from public.list_public_doctor_slots(
      v_clinic_slug,
      v_doctor_slug,
      timezone('Asia/Baghdad', p_slot_at)::date,
      1
    ) s
    where s.slot_at = p_slot_at
  ) then
    return 'unavailable';
  end if;

  perform set_config('atlas.actor_type', 'patient', true);

  update public.appointments
  set appointment_at = p_slot_at
  where id = v_appointment_id;

  update private.patient_appointment_tokens
  set last_used_at = now()
  where token_hash = p_token_hash
    and revoked_at is null;

  return 'updated';
exception
  when unique_violation then
    return 'slot_taken';
end;
$$;

revoke all on function public.patient_reschedule_appointment(text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.patient_reschedule_appointment(text, timestamptz)
  to service_role;
