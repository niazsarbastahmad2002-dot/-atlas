-- Keep the activity/export paths indexed without retaining duplicate btree work.
-- This migration is intentionally non-destructive to application data.

drop index if exists public.appointment_audit_clinic_time_idx;

create index if not exists clinic_export_audit_requested_by_idx
  on public.clinic_export_audit (requested_by)
  where requested_by is not null;
