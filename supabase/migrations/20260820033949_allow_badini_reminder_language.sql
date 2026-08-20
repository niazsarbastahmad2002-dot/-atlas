alter table public.appointments drop constraint if exists appointments_reminder_language_check;
alter table public.appointments add constraint appointments_reminder_language_check
  check (reminder_language = any (array['ku'::text, 'bd'::text, 'ar'::text, 'en'::text]));

alter table public.clinic_reminder_settings drop constraint if exists clinic_reminder_settings_default_language_check;
alter table public.clinic_reminder_settings add constraint clinic_reminder_settings_default_language_check
  check (default_reminder_language = any (array['ku'::text, 'bd'::text, 'ar'::text, 'en'::text]));

alter table public.doctor_workflow_settings drop constraint if exists doctor_workflow_language_check;
alter table public.doctor_workflow_settings add constraint doctor_workflow_language_check
  check (default_reminder_language = any (array['ku'::text, 'bd'::text, 'ar'::text, 'en'::text]));

create or replace function private.whatsapp_template_language(p_language text)
returns text
language sql
immutable
set search_path = ''
as $function$
  select case lower(coalesce(p_language, 'en'))
    when 'ku' then 'ku'
    when 'ckb' then 'ku'
    when 'bd' then 'bd'
    when 'ar' then 'ar'
    when 'ar_iq' then 'ar'
    when 'en_us' then 'en_US'
    when 'en' then 'en_US'
    else 'en_US'
  end;
$function$;
