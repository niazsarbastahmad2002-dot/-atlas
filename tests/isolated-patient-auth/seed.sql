-- psql variable user_a and user_b must be real local Auth UUIDs.
insert into public.patient_profiles values
  (:'user_a'::uuid, 'Local Synthetic A', 'en'),
  (:'user_b'::uuid, 'Local Synthetic B', 'ku');
insert into public.clinics values
  ('00000000-0000-4000-8000-00000000a100', 'QA Alpha Clinic Exclusive'),
  ('00000000-0000-4000-8000-00000000b100', 'QA Beta Clinic Exclusive');
insert into public.doctors values
  ('00000000-0000-4000-8000-00000000a200', '00000000-0000-4000-8000-00000000a100', 'Family medicine'),
  ('00000000-0000-4000-8000-00000000b200', '00000000-0000-4000-8000-00000000b100', 'Pediatrics');
insert into public.appointments values
  ('00000000-0000-4000-8000-00000000a300', '00000000-0000-4000-8000-00000000a100', '00000000-0000-4000-8000-00000000a200', 'Local Doctor A', now() + interval '2 days', 'confirmed', 'en', null),
  ('00000000-0000-4000-8000-00000000b300', '00000000-0000-4000-8000-00000000b100', '00000000-0000-4000-8000-00000000b200', 'Local Doctor B', now() + interval '4 days', 'confirmed', 'ku', null);
insert into private.patient_appointment_accounts values
  (:'user_a'::uuid, '00000000-0000-4000-8000-00000000a100', '00000000-0000-4000-8000-00000000a300'),
  (:'user_b'::uuid, '00000000-0000-4000-8000-00000000b100', '00000000-0000-4000-8000-00000000b300');
-- Poisoned record must NEVER leak Beta to patient A because the clinics differ.
insert into private.patient_appointment_accounts values
  (:'user_a'::uuid, '00000000-0000-4000-8000-00000000a100', '00000000-0000-4000-8000-00000000b300');
-- Direct browser access is denied, irrespective of JWT identity.
revoke all on all tables in schema private from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
notify pgrst, 'reload schema';
