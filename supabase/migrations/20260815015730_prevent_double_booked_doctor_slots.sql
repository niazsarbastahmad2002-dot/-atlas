-- Prevent two active appointments from occupying the same doctor/time slot.
-- Cancelled/completed/no-show/voided history remains reusable and retained.
create unique index if not exists appointments_active_doctor_slot_idx
  on public.appointments (clinic_id, doctor_id, appointment_at)
  where doctor_id is not null
    and voided_at is null
    and status in ('pending', 'confirmed');
