-- The receptionist app now creates patient links through the server-only
-- create_patient_access_token_server RPC using the service role. Remove the
-- older signed-in SECURITY DEFINER entry point once the new application build
-- is deployed.
drop function if exists public.create_patient_access_token(uuid, text, timestamptz);
