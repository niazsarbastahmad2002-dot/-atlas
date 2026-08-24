-- Supabase public-schema defaults may grant new tables to anon/authenticated.
-- RLS was already enabled, but the Patient Loop table should use least privilege.

revoke all on table public.doctor_day_flow from anon;
revoke all on table public.doctor_day_flow from authenticated;
grant select, insert, update on table public.doctor_day_flow to authenticated;

revoke all on function public.claim_due_whatsapp_reminders_v3(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_whatsapp_reminders_v3(uuid, integer, integer)
  to service_role;

revoke all on function public.apply_whatsapp_patient_action_service(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.apply_whatsapp_patient_action_service(uuid, text, text, text, text)
  to service_role;

revoke all on function public.patient_get_day_flow(text)
  from public, anon, authenticated;
grant execute on function public.patient_get_day_flow(text)
  to service_role;
