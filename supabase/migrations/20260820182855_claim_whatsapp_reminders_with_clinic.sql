create or replace function public.claim_due_whatsapp_reminders_v2(
  p_worker_id uuid,
  p_limit integer default 25,
  p_global_daily_limit integer default 500
)
returns table(
  reminder_id uuid,
  clinic_id uuid,
  patient_phone text,
  clinic_name text,
  appointment_at timestamptz,
  template_name text,
  template_language text
)
language sql
security definer
set search_path = ''
as $$
  select
    x.reminder_id,
    r.clinic_id,
    x.patient_phone,
    x.clinic_name,
    x.appointment_at,
    x.template_name,
    x.template_language
  from public.claim_due_whatsapp_reminders(p_worker_id, p_limit, p_global_daily_limit) x
  join public.appointment_reminders r on r.id = x.reminder_id;
$$;

revoke all on function public.claim_due_whatsapp_reminders_v2(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_due_whatsapp_reminders_v2(uuid, integer, integer) to service_role;
