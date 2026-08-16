-- Atlas now creates patient links through the service-role-only
-- create_patient_access_token_server RPC. Remove the retired signed-in
-- SECURITY DEFINER entry point after the new application build is live.
drop function if exists public.create_patient_access_token(uuid, text, timestamptz);
