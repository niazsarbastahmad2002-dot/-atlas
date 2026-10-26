-- REVIEW-ONLY / NOT AN AUTOMATIC SUPABASE MIGRATION.
-- Proposed narrow PostgreSQL ACL fix for existing public.doctor_workflow_settings.
-- DO NOT execute on production without separate founder approval and isolated
-- two-clinic/receptionist compatibility tests. Source: live catalog 2026-10-26.
--
-- Intended effective privileges:
--   PUBLIC / anon: none
--   authenticated: SELECT, UPDATE (both still subject to existing RLS)
--   service_role: unchanged
-- Existing table schema, policies, triggers, default privileges untouched.
--
-- Execution only after separate production approval:
begin;

revoke all privileges on table public.doctor_workflow_settings from public, anon;
revoke all privileges on table public.doctor_workflow_settings from authenticated;
grant select, update on table public.doctor_workflow_settings to authenticated;

commit;

-- Post-approval verification should check pg_class.relacl and
-- has_table_privilege for SELECT, UPDATE, INSERT, DELETE, TRUNCATE,
-- REFERENCES, TRIGGER, MAINTAIN for anon and authenticated. Then test
-- own-clinic owner/manager and assigned receptionist GET/POST; reject
-- anonymous, non-member and cross-clinic/other-doctor reads and writes.
-- Trigger-driven service-role behavior and public slot RPC must still work.
-- Rollback plan: restore only the previously captured exact per-role ACL,
-- never blindly GRANT ALL to a client role.
