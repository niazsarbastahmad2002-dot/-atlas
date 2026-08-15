-- Atlas tenant-isolation smoke test.
-- Run only against a non-production or synthetic-data-safe environment.
-- Every mutation is wrapped in a transaction and rolled back.

-- 1) A real clinic member can see their clinic and create normal scheduling rows.
begin;
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from public.clinic_members order by role = 'owner' desc limit 1),
  true
);
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
set local role authenticated;
select 1 / case when (
  (select count(*) from public.clinics)
  + (select count(*) from public.clinic_members)
  + (select count(*) from public.doctors)
  + (select count(*) from public.appointments)
) = 0 then 1 else 0 end as outsider_isolated;
rollback;

-- 3) RLS must remain enabled on all tenant/privacy-sensitive tables.
select 1 / case when count(*) = 10 then 1 else 0 end as rls_enabled
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
    'reminder_delivery_events',
    'trusted_devices'
  );

-- 4) Security-definer RPCs used by Atlas must never be executable by anonymous users.
select 1 / case when count(*) = 6 and bool_and(not has_function_privilege('anon', p.oid, 'EXECUTE')) then 1 else 0 end
  as sensitive_rpc_anon_denied
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_patient_access_token',
    'register_trusted_device',
    'revoke_all_trusted_devices',
    'revoke_current_trusted_device',
    'revoke_trusted_device',
    'validate_trusted_device'
  );

-- 5) An authenticated outsider may call the patient-token RPC, but it must reject
--    an appointment belonging to another clinic. This is the intended reason the
--    function is SECURITY DEFINER: it can write the private token table only after
--    performing its own tenant check.
begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000999', true);
set local role authenticated;
select 1 / case when public.create_patient_access_token(
  (select id from public.appointments order by created_at asc limit 1),
  repeat('a', 64),
  now() + interval '1 day'
) = false then 1 else 0 end as outsider_patient_token_rejected;
rollback;
