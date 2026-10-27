\set ON_ERROR_STOP on
-- Disposable PostgreSQL 17 CI-only fixture. NEVER run against production.
-- Only synthetic identities, clinics, doctors and appointments; no secrets.
-- Exercise the ACTUAL patient-account migration, not a rewritten SQL copy.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE SCHEMA private;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- auth.role() in Supabase reads the JWT role claim, not current_user.
-- This is a local simulation of that claim for function-level testing.
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE
  SET search_path TO ''
  AS $$ SELECT nullif(current_setting('request.jwt.claim.role', true), '')::text $$;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  phone text,
  phone_confirmed_at timestamptz
);
CREATE TABLE public.patient_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  display_name text,
  preferred_language text
);
CREATE TABLE public.clinics (
  id uuid PRIMARY KEY,
  name text NOT NULL
);
CREATE TABLE public.doctors (
  id uuid PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id),
  specialty text
);
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id),
  doctor_id uuid,
  doctor_name text,
  appointment_at timestamptz NOT NULL,
  status text NOT NULL,
  reminder_language text,
  voided_at timestamptz
);
CREATE TABLE private.patient_appointment_accounts (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  clinic_id uuid NOT NULL,
  appointment_id uuid NOT NULL
);
CREATE TABLE private.patient_appointment_tokens (
  clinic_id uuid NOT NULL,
  appointment_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  expires_at timestamptz NOT NULL
);

-- CI substitutes the exact repository migration here. This is intentionally
-- the only fixture dependency on the production patient-account SQL.
\i supabase/migrations/20261004160000_patient_account_portal.sql

INSERT INTO auth.users (id,phone,phone_confirmed_at) VALUES
 ('00000000-0000-4000-8000-0000000000a1','9647500000001',now()),
 ('00000000-0000-4000-8000-0000000000b1','+9647500000002',now()),
 ('00000000-0000-4000-8000-0000000000c1','9647500000003',NULL);
INSERT INTO public.patient_profiles VALUES
 ('00000000-0000-4000-8000-0000000000a1','Synthetic Patient A','en'),
 ('00000000-0000-4000-8000-0000000000b1','Synthetic Patient B','ku');
INSERT INTO public.clinics VALUES
 ('00000000-0000-4000-8000-0000000000a0','Synthetic Clinic A'),
 ('00000000-0000-4000-8000-0000000000b0','Synthetic Clinic B');
INSERT INTO public.doctors VALUES
 ('00000000-0000-4000-8000-000000000d11','00000000-0000-4000-8000-0000000000a0','Family medicine'),
 ('00000000-0000-4000-8000-000000000d22','00000000-0000-4000-8000-0000000000b0','Pediatrics');
INSERT INTO public.appointments VALUES
 ('00000000-0000-4000-8000-000000000a11','00000000-0000-4000-8000-0000000000a0','00000000-0000-4000-8000-000000000d11','Synthetic Doctor A',now()+interval '2 days','confirmed','en',NULL),
 ('00000000-0000-4000-8000-000000000a12','00000000-0000-4000-8000-0000000000a0','00000000-0000-4000-8000-000000000d11','Synthetic Doctor A',now()-interval '2 days','cancelled','en',now()),
 ('00000000-0000-4000-8000-000000000a13','00000000-0000-4000-8000-0000000000a0','00000000-0000-4000-8000-000000000d11','Synthetic Doctor A',now()+interval '3 days','confirmed','en',NULL),
 ('00000000-0000-4000-8000-000000000b11','00000000-0000-4000-8000-0000000000b0','00000000-0000-4000-8000-000000000d22','Synthetic Doctor B',now()+interval '4 days','confirmed','ku',NULL);
INSERT INTO private.patient_appointment_accounts VALUES
 ('00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-0000000000a0','00000000-0000-4000-8000-000000000a11'),
 ('00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-0000000000a0','00000000-0000-4000-8000-000000000a12'),
 -- Poisoned ownership: A points to B appointment but falsely claims clinic A.
 ('00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-0000000000a0','00000000-0000-4000-8000-000000000b11'),
 ('00000000-0000-4000-8000-0000000000b1','00000000-0000-4000-8000-0000000000b0','00000000-0000-4000-8000-000000000b11'),
 ('00000000-0000-4000-8000-0000000000c1','00000000-0000-4000-8000-0000000000a0','00000000-0000-4000-8000-000000000a13');

-- Check effective EXECUTE privileges for all five actual migrated RPCs.
DO $$
DECLARE signature text;
BEGIN
 FOREACH signature IN ARRAY ARRAY[
  'public.create_patient_account_session_service(uuid,text,timestamp with time zone)',
  'public.resolve_patient_account_session_service(text)',
  'public.revoke_patient_account_session_service(text)',
  'public.list_patient_account_appointments_service(uuid)',
  'public.issue_patient_account_appointment_token_service(uuid,uuid,text,timestamp with time zone)'
 ] LOOP
  IF has_function_privilege('anon',signature,'EXECUTE')
    OR has_function_privilege('authenticated',signature,'EXECUTE')
    OR NOT has_function_privilege('service_role',signature,'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected patient-account RPC privileges: %',signature;
  END IF;
 END LOOP;
END $$;

SET ROLE anon;
SELECT set_config('request.jwt.claim.role','anon',false);
DO $$ BEGIN
 BEGIN
  PERFORM * FROM public.list_patient_account_appointments_service('00000000-0000-4000-8000-0000000000a1');
  RAISE EXCEPTION 'Anonymous appointment RPC unexpectedly executable';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',false);
DO $$ BEGIN
 BEGIN
  PERFORM * FROM public.list_patient_account_appointments_service('00000000-0000-4000-8000-0000000000a1');
  RAISE EXCEPTION 'Authenticated browser appointment RPC unexpectedly executable';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;

-- An explicit non-service JWT role must not bypass the function guard.
-- SQL NULL comparison semantics are different and are not tested here.
SET ROLE service_role;
SELECT set_config('request.jwt.claim.role','anon',false);
DO $$ DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.list_patient_account_appointments_service('00000000-0000-4000-8000-0000000000a1');
 IF n<>0 THEN RAISE EXCEPTION 'Missing service claim returned % rows',n; END IF;
END $$;
SELECT set_config('request.jwt.claim.role','service_role',false);

-- Actual migrated function: two patients in separate clinics.
DO $$
DECLARE n integer; ok boolean; owner_id uuid;
BEGIN
 SELECT count(*) INTO n FROM public.list_patient_account_appointments_service('00000000-0000-4000-8000-0000000000a1');
 IF n<>1 THEN RAISE EXCEPTION 'Patient A should see only own non-voided A appointment; got %',n; END IF;
 SELECT appointment_id INTO owner_id FROM public.list_patient_account_appointments_service('00000000-0000-4000-8000-0000000000a1');
 IF owner_id <> '00000000-0000-4000-8000-000000000a11' THEN RAISE EXCEPTION 'Patient A saw wrong appointment'; END IF;
 SELECT count(*) INTO n FROM public.list_patient_account_appointments_service('00000000-0000-4000-8000-0000000000b1');
 IF n<>1 THEN RAISE EXCEPTION 'Patient B should see only own clinic B appointment; got %',n; END IF;
 SELECT appointment_id INTO owner_id FROM public.list_patient_account_appointments_service('00000000-0000-4000-8000-0000000000b1');
 IF owner_id <> '00000000-0000-4000-8000-000000000b11' THEN RAISE EXCEPTION 'Patient B saw wrong appointment'; END IF;
 SELECT count(*) INTO n FROM public.list_patient_account_appointments_service(NULL);
 IF n<>0 THEN RAISE EXCEPTION 'Null patient unexpectedly sees appointments'; END IF;

 -- A can issue a Manage token for own A1, not B1, voided A2 or unowned A3.
 SELECT public.issue_patient_account_appointment_token_service(
  '00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-000000000a11',repeat('a',64),now()+interval '30 minutes') INTO ok;
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'A own appointment token denied'; END IF;
 SELECT public.issue_patient_account_appointment_token_service(
  '00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-000000000b11',repeat('b',64),now()+interval '30 minutes') INTO ok;
 IF ok IS DISTINCT FROM false THEN RAISE EXCEPTION 'A cross-clinic B token allowed'; END IF;
 SELECT public.issue_patient_account_appointment_token_service(
  '00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-000000000a12',repeat('c',64),now()+interval '30 minutes') INTO ok;
 IF ok IS DISTINCT FROM false THEN RAISE EXCEPTION 'Voided A appointment token allowed'; END IF;
 SELECT public.issue_patient_account_appointment_token_service(
  '00000000-0000-4000-8000-0000000000b1','00000000-0000-4000-8000-000000000a11',repeat('d',64),now()+interval '30 minutes') INTO ok;
 IF ok IS DISTINCT FROM false THEN RAISE EXCEPTION 'B cross-patient A token allowed'; END IF;
 SELECT public.issue_patient_account_appointment_token_service(
  '00000000-0000-4000-8000-0000000000c1','00000000-0000-4000-8000-000000000a13',repeat('e',64),now()+interval '30 minutes') INTO ok;
 IF ok IS DISTINCT FROM false THEN RAISE EXCEPTION 'Unverified patient token allowed'; END IF;
 SELECT public.issue_patient_account_appointment_token_service(
  '00000000-0000-4000-8000-0000000000b1','00000000-0000-4000-8000-000000000b11',repeat('f',64),now()+interval '30 minutes') INTO ok;
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'B own appointment token denied'; END IF;
 SELECT public.issue_patient_account_appointment_token_service(
  '00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-000000000a11',repeat('1',64),now()+interval '1 minute') INTO ok;
 IF ok IS DISTINCT FROM false THEN RAISE EXCEPTION 'Too-short Manage token expiry allowed'; END IF;

 SELECT public.create_patient_account_session_service(
  '00000000-0000-4000-8000-0000000000a1',repeat('2',64),now()+interval '1 day') INTO ok;
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Verified A session denied'; END IF;
 SELECT user_id INTO owner_id FROM public.resolve_patient_account_session_service(repeat('2',64));
 IF owner_id IS DISTINCT FROM '00000000-0000-4000-8000-0000000000a1' THEN RAISE EXCEPTION 'Session A resolved to wrong patient'; END IF;
 SELECT public.create_patient_account_session_service(
  '00000000-0000-4000-8000-0000000000c1',repeat('3',64),now()+interval '1 day') INTO ok;
 IF ok IS DISTINCT FROM false THEN RAISE EXCEPTION 'Unverified patient session allowed'; END IF;
 SELECT public.revoke_patient_account_session_service(repeat('2',64)) INTO ok;
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Session A revoke failed'; END IF;
 SELECT count(*) INTO n FROM public.resolve_patient_account_session_service(repeat('2',64));
 IF n<>0 THEN RAISE EXCEPTION 'Revoked session still resolves'; END IF;
END $$;
RESET ROLE;

-- Verify only the two authorized Manage token rows were written.
DO $$ DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM private.patient_appointment_tokens;
 IF n<>2 THEN RAISE EXCEPTION 'Expected exactly 2 authorized tokens; got %',n; END IF;
 IF EXISTS (
  SELECT 1 FROM private.patient_appointment_tokens
  WHERE (created_by='00000000-0000-4000-8000-0000000000a1' AND appointment_id<>'00000000-0000-4000-8000-000000000a11')
     OR (created_by='00000000-0000-4000-8000-0000000000b1' AND appointment_id<>'00000000-0000-4000-8000-000000000b11')
     OR created_by NOT IN ('00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-0000000000b1')
 ) THEN RAISE EXCEPTION 'Unauthorized token persisted'; END IF;
END $$;
SELECT 'PASS: isolated two-patient/two-clinic SQL RPC authorization' AS result;
