-- Meta currently does not accept Atlas's Sorani/Badini message-template locales.
-- Keep the patient's Atlas language unchanged, but route the WhatsApp provider
-- template through Iraqi Arabic until Meta supports the Kurdish variants.

create or replace function private.whatsapp_template_language(p_language text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case lower(coalesce(p_language, 'en'))
    when 'ku' then 'ar'
    when 'ckb' then 'ar'
    when 'bd' then 'ar'
    when 'ar' then 'ar'
    when 'ar_iq' then 'ar'
    when 'en_us' then 'en_US'
    when 'en' then 'en_US'
    else 'en_US'
  end;
$$;

-- Align only unsent work. Historical sent/delivered/read rows keep the provider
-- language that was actually attempted at the time.
update public.appointment_reminders
set template_language = 'ar', updated_at = now()
where template_language in ('ku', 'ckb', 'bd')
  and status in ('queued', 'retry');
