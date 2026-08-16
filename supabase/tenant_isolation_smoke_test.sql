-- Atlas tenant-isolation smoke test.
-- Run only against a production/synthetic-data-safe environment with at least
-- one provisioned clinic member. Every mutation is wrapped in a transaction
-- and rolled back.

-- 1) A real clinic member can see their clinic and create normal scheduling rows.
begin;
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from public.clinic_members order by role = 'owner' desc limit 1),
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

-- Fail with division-by-zero if no clinic is visible to the member.
select 1 / case when (select count(*) from public.clinics) >= 1 then 1 else 0 end as member_can_see_clinic;

with mine as (
  select id from public.clinics order by created_at asc limit 1
), synthetic_doctor as (
  insert into public.doctors (clinic_id, name, active, created_by, display_order)
  select id, 'Atlas Synthetic RLS Check', true, auth.uid(), 9999 from mine
  returning id, clinic_id
), synthetic_appointment as (
  insert into public.appointments (
    clinic_id,
    patient_name,
    patient_phone,
    doctor_name,
    doctor_id,
    appointment_at,
    reminder_consent,
    reminder_language
  )
  select
    clinic_id,
    'Synthetic Patient',
    '+9647500000000',
    'Atlas Synthetic RLS Check',
    id,
    now() + interval '2 days',
    false,
    'ku'
  from synthetic_doctor
  returning id
)
select 1 / case when (select count(*) from synthetic_appointment) = 1 then 1 else 0 end as member_write_allowed;
rollback;

-- 2) An unrelated authenticated user sees no tenant scheduling data.
begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000999', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select 1 / case when (
  (select count(*) from public.clinics)
  + (select count(*) from public.clinic_members)
  + (select count(*) from public.doctors)
  + (select count(*) from public.appointments)
) = 0 then 1 else 0 end as outsider_isolated;
rollback;

-- 3) RLS must remain enabled on all current public tenant/privacy-sensitive tables.
select 1 / case when count(*) = 9 then 1 else 0 end as public_rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity
  and c.relname in (
    'appointment_audit_events',
    'appointment_reminders',
    'appointments',
    'clinic_members',
    'clinic_reminder_settings',
    'clinics',
    'doctors',
    'pending_reminder_delivery_events',
    'reminder_delivery_events'
  );

-- 4) Private patient-link tables must keep RLS and deny direct browser-role reads.
select 1 / case when count(*) = 2
  and bool_and(c.relrowsecurity)
  and bool_and(not has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'SELECT'))
  and bool_and(not has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'SELECT'))
then 1 else 0 end as private_patient_tables_locked_down
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'private'
  and c.relkind = 'r'
  and c.relname in ('patient_appointment_tokens', 'patient_link_rate_limits');

-- 5) Atlas public SECURITY DEFINER RPCs are server-only: browser roles cannot
-- execute them, while service_role can.
select 1 / case when count(*) = 9
  and bool_and(p.prosecdef)
  and bool_and(not has_function_privilege('anon', p.oid, 'EXECUTE'))
  and bool_and(not has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  and bool_and(has_function_privilege('service_role', p.oid, 'EXECUTE'))
then 1 else 0 end as sensitive_rpcs_server_only
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'claim_due_whatsapp_reminders',
    'complete_whatsapp_reminder',
    'consume_patient_link_rate_limit',
    'create_patient_access_token_server',
    'fail_whatsapp_reminder',
    'get_patient_appointment',
    'patient_update_appointment',
    'record_whatsapp_delivery_status',
    'validate_whatsapp_reminder_claim'
  );

-- 6) Retired auth/token surfaces must stay absent.
select 1 / case when
  to_regclass('public.trusted_devices') is null
  and to_regclass('public.staff_onboarding_codes') is null
  and to_regprocedure('public.create_patient_access_token(uuid,text,timestamp with time zone)') is null
then 1 else 0 end as retired_surfaces_absent;

-- 7) Even the service-role-only patient-link RPC must reject an unrelated actor.
-- Create an appointment as the real member, then switch to service_role and ask
-- the RPC to act on behalf of a fake outsider. Roll everything back afterward.
begin;
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from public.clinic_members order by role = 'owner' desc limit 1),
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

with mine as (
  select id from public.clinics order by created_at asc limit 1
), synthetic_doctor as (
  insert into public.doctors (clinic_id, name, active, created_by, display_order)
  select id, 'Atlas Synthetic Token Check', true, auth.uid(), 9998 from mine
  returning id, clinic_id
), synthetic_appointment as (
  insert into public.appointments (
    clinic_id,
    patient_name,
    patient_phone,
    doctor_name,
    doctor_id,
    appointment_at,
    reminder_consent,
    reminder_language
  )
  select
    clinic_id,
    'Synthetic Token Patient',
    '+9647500000001',
    'Atlas Synthetic Token Check',
    id,
    now() + interval '3 days',
    false,
    'ku'
  from synthetic_doctor
  returning id
)
select set_config('atlas.test.appointment_id', id::text, true)
from synthetic_appointment;

reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000999', true);
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;

select 1 / case when public.create_patient_access_token_server(
  '00000000-0000-0000-0000-000000000999'::uuid,
  current_setting('atlas.test.appointment_id')::uuid,
  repeat('a', 64),
  now() + interval '1 day'
) = false then 1 else 0 end as outsider_patient_token_rejected;
rollback;
