alter table public.clinic_reminder_settings
  add column if not exists meta_template_checked_at timestamptz,
  add column if not exists meta_template_status text,
  add column if not exists meta_template_error_code text;

comment on column public.clinic_reminder_settings.meta_template_checked_at is 'Last server-side Meta message-template readiness check.';
comment on column public.clinic_reminder_settings.meta_template_status is 'Sanitized server-side Meta template readiness state.';
comment on column public.clinic_reminder_settings.meta_template_error_code is 'Sanitized Meta/bootstrap error code; never contains credentials or provider payloads.';
