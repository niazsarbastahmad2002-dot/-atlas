create index if not exists clinic_members_assigned_doctor_fk_idx
on public.clinic_members (assigned_doctor_id)
where assigned_doctor_id is not null;
