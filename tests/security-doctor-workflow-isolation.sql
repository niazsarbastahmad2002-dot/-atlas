\set ON_ERROR_STOP on
-- Isolated PostgreSQL 17 fixture; runs ONLY in GitHub CI with an ephemeral
-- Postgres service, NEVER against Atlas production. Every UUID is synthetic.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
CREATE SCHEMA auth;
CREATE SCHEMA private;
GRANT USAGE ON SCHEMA auth, private TO authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path TO ''
AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

CREATE TABLE public.clinics (id uuid PRIMARY KEY, owner_id uuid NOT NULL);
CREATE TABLE public.clinic_members (
  clinic_id uuid NOT NULL, user_id uuid NOT NULL, role text NOT NULL,
  assigned_doctor_id uuid, PRIMARY KEY (clinic_id, user_id)
);
CREATE TABLE public.doctors (
  clinic_id uuid NOT NULL, id uuid NOT NULL, active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (clinic_id, id)
);
CREATE TABLE public.doctor_workflow_settings (
  clinic_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  appointment_interval_minutes integer NOT NULL DEFAULT 15,
  updated_by uuid,
  PRIMARY KEY (clinic_id, doctor_id),
  FOREIGN KEY (clinic_id, doctor_id) REFERENCES public.doctors(clinic_id,id)
);

-- Match the live helper and RLS predicates reviewed on 26 Oct 2026.
CREATE FUNCTION private.can_admin_clinic(target_clinic uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
  SELECT (SELECT auth.uid()) IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.clinics c
            WHERE c.id = target_clinic AND c.owner_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM public.clinic_members cm
               WHERE cm.clinic_id = target_clinic AND cm.user_id = (SELECT auth.uid())
                 AND cm.role IN ('owner', 'manager'))
  );
$fn$;
CREATE FUNCTION private.can_access_doctor(target_clinic uuid,target_doctor uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
  SELECT (SELECT auth.uid()) IS NOT NULL AND (
    private.can_admin_clinic(target_clinic)
    OR EXISTS (SELECT 1 FROM public.clinic_members cm
               WHERE cm.clinic_id = target_clinic
                 AND cm.user_id = (SELECT auth.uid())
                 AND cm.role = 'receptionist'
                 AND cm.assigned_doctor_id = target_doctor)
  );
$fn$;
GRANT EXECUTE ON FUNCTION private.can_admin_clinic(uuid),
  private.can_access_doctor(uuid,uuid) TO authenticated;
ALTER TABLE public.doctor_workflow_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY doctor_workflow_settings_select ON public.doctor_workflow_settings
  FOR SELECT TO authenticated USING (private.can_access_doctor(clinic_id,doctor_id));
CREATE POLICY doctor_workflow_settings_update ON public.doctor_workflow_settings
  FOR UPDATE TO authenticated
  USING (private.can_access_doctor(clinic_id,doctor_id))
  WITH CHECK (private.can_access_doctor(clinic_id,doctor_id)
              AND updated_by = (SELECT auth.uid()));

-- Two synthetic, fully independent clinics, 2 doctors in clinic A.
-- Users: A owner 11, A manager 12, A receptionist 13, B owner 21,
-- B receptionist 23, and unrelated signed-in outsider 99.
INSERT INTO public.clinics VALUES
  ('00000000-0000-4000-8000-0000000000a0','00000000-0000-4000-8000-000000000011'),
  ('00000000-0000-4000-8000-0000000000b0','00000000-0000-4000-8000-000000000021');
INSERT INTO public.doctors(clinic_id,id) VALUES
  ('00000000-0000-4000-8000-0000000000a0','00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000a0','00000000-0000-4000-8000-0000000000a2'),
  ('00000000-0000-4000-8000-0000000000b0','00000000-0000-4000-8000-0000000000b1');
INSERT INTO public.clinic_members(clinic_id,user_id,role,assigned_doctor_id) VALUES
  ('00000000-0000-4000-8000-0000000000a0','00000000-0000-4000-8000-000000000011','owner',NULL),
  ('00000000-0000-4000-8000-0000000000a0','00000000-0000-4000-8000-000000000012','manager',NULL),
  ('00000000-0000-4000-8000-0000000000a0','00000000-0000-4000-8000-000000000013','receptionist','00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000b0','00000000-0000-4000-8000-000000000021','owner',NULL),
  ('00000000-0000-4000-8000-0000000000b0','00000000-0000-4000-8000-000000000023','receptionist','00000000-0000-4000-8000-0000000000b1');
INSERT INTO public.doctor_workflow_settings(clinic_id,doctor_id) VALUES
  ('00000000-0000-4000-8000-0000000000a0','00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000a0','00000000-0000-4000-8000-0000000000a2'),
  ('00000000-0000-4000-8000-0000000000b0','00000000-0000-4000-8000-0000000000b1');

-- Model the existing overbroad privileges before applying the EXACT proposed
-- correction. The test fails if the proposal leaves any forbidden privilege.
GRANT ALL PRIVILEGES ON TABLE public.doctor_workflow_settings TO anon, service_role;
GRANT SELECT, UPDATE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.doctor_workflow_settings TO authenticated;

-- Apply the same review-only SQL file the founder would approve for production.
\i docs/security/doctor-workflow-grants-proposal-20261026.sql

DO $$
DECLARE p text;
BEGIN
  FOREACH p IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
    IF has_table_privilege('anon','public.doctor_workflow_settings',p) THEN
      RAISE EXCEPTION 'anon retains forbidden privilege %',p;
    END IF;
    IF p IN ('SELECT','UPDATE') THEN
      IF NOT has_table_privilege('authenticated','public.doctor_workflow_settings',p) THEN
        RAISE EXCEPTION 'authenticated missing required privilege %',p;
      END IF;
    ELSIF has_table_privilege('authenticated','public.doctor_workflow_settings',p) THEN
      RAISE EXCEPTION 'authenticated retains forbidden privilege %',p;
    END IF;
    IF NOT has_table_privilege('service_role','public.doctor_workflow_settings',p) THEN
      RAISE EXCEPTION 'service_role unexpectedly lost %',p;
    END IF;
  END LOOP;
END $$;

-- Anonymous SQL access is rejected (even though it is RLS-enabled).
SET ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.doctor_workflow_settings;
    RAISE EXCEPTION 'anon SELECT unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    EXECUTE 'TRUNCATE TABLE public.doctor_workflow_settings';
    RAISE EXCEPTION 'anon TRUNCATE unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;
RESET ROLE;

-- Synthetic sign-in claims are local to this disposable test database.
-- Owner A can access exactly two A rows, manager A likewise.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',false);
DO $$ DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.doctor_workflow_settings;
  IF n <> 2 THEN RAISE EXCEPTION 'A owner must see 2, got %',n; END IF;
  UPDATE public.doctor_workflow_settings SET updated_by=auth.uid()
    WHERE doctor_id='00000000-0000-4000-8000-0000000000a2';
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'A owner allowed update must affect 1 row'; END IF;
  UPDATE public.doctor_workflow_settings SET updated_by=auth.uid()
    WHERE clinic_id='00000000-0000-4000-8000-0000000000b0';
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'A owner changed B rows'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
DO $$ DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.doctor_workflow_settings;
  IF n<>2 THEN RAISE EXCEPTION 'A manager access mismatch %',n; END IF;
END $$;

-- A receptionist sees/edits A1 only, not A2 or clinic B.
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000013',false);
DO $$ DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.doctor_workflow_settings;
  IF n<>1 THEN RAISE EXCEPTION 'A receptionist access mismatch %',n; END IF;
  UPDATE public.doctor_workflow_settings SET updated_by=auth.uid()
    WHERE doctor_id='00000000-0000-4000-8000-0000000000a1';
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'A receptionist own-doctor UPDATE failed'; END IF;
  UPDATE public.doctor_workflow_settings SET updated_by=auth.uid()
    WHERE doctor_id='00000000-0000-4000-8000-0000000000a2'
       OR clinic_id='00000000-0000-4000-8000-0000000000b0';
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'A receptionist modified other doctor/clinic'; END IF;
  BEGIN
    UPDATE public.doctor_workflow_settings
      SET updated_by='00000000-0000-4000-8000-000000000099'
      WHERE doctor_id='00000000-0000-4000-8000-0000000000a1';
    RAISE EXCEPTION 'spoofed updated_by unexpectedly accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- B's receptionist sees B1 only, never a clinic A row.
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000023',false);
DO $$ DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.doctor_workflow_settings;
  IF n<>1 THEN RAISE EXCEPTION 'B receptionist access mismatch %',n; END IF;
  UPDATE public.doctor_workflow_settings SET updated_by=auth.uid()
    WHERE clinic_id='00000000-0000-4000-8000-0000000000a0';
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'B receptionist updated clinic A'; END IF;
END $$;
-- B's owner sees exactly B1.
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000021',false);
DO $$ DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.doctor_workflow_settings;
  IF n<>1 THEN RAISE EXCEPTION 'B owner access mismatch %',n; END IF;
END $$;
-- Signed-in nonmember sees nothing and cannot update anything.
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',false);
DO $$ DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.doctor_workflow_settings;
  IF n<>0 THEN RAISE EXCEPTION 'nonmember saw % rows',n; END IF;
  UPDATE public.doctor_workflow_settings SET updated_by=auth.uid();
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'nonmember changed % rows',n; END IF;
END $$;
RESET ROLE;

-- No public read of settings is needed for a definer slot lookup: a
-- synthetic definer can still read controlled internal settings on behalf
-- of anon. The real Atlas public RPC is checked separately in production.
CREATE FUNCTION public.security_test_public_slot()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
  SELECT appointment_interval_minutes
    FROM public.doctor_workflow_settings
    WHERE clinic_id='00000000-0000-4000-8000-0000000000a0'
      AND doctor_id='00000000-0000-4000-8000-0000000000a1';
$fn$;
REVOKE ALL ON FUNCTION public.security_test_public_slot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.security_test_public_slot() TO anon, authenticated;
SET ROLE anon;
DO $$ DECLARE n int;
BEGIN
  SELECT public.security_test_public_slot() INTO n;
  IF n<>15 THEN RAISE EXCEPTION 'public definer compatibility failed %',n; END IF;
END $$;
RESET ROLE;

-- Service role retains elevated maintenance access in this disposable DB.
SET ROLE service_role;
UPDATE public.doctor_workflow_settings SET appointment_interval_minutes=20;
RESET ROLE;
SELECT count(*) AS synthetic_settings_rows FROM public.doctor_workflow_settings;
