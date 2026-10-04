-- Cover the patient appointment ownership clinic foreign key for deletes and clinic-scoped maintenance.
create index if not exists patient_appointment_accounts_clinic_idx
on private.patient_appointment_accounts (clinic_id);
