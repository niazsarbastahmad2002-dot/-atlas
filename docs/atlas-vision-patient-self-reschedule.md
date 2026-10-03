# Atlas Vision — private patient self-rescheduling

Patients with an existing private Atlas appointment link can move their appointment to another real public-bookable slot for the same doctor.

## Safety contract

- The private appointment token remains the identity/authorization boundary.
- Reschedule reads and writes are service-role-only RPCs; anon and ordinary authenticated clients cannot call them directly.
- Offered times come from the same public availability source used by doctor profiles.
- The current appointment row is updated rather than creating a second appointment.
- The appointment is locked during the mutation.
- The database's active doctor/time uniqueness rule remains the final concurrency guard.
- Existing appointment audit/reminder/revision triggers continue to run because the normal appointment row is updated.
- Audit attribution is patient.
- The UI shows at most eight near-term alternatives even though the bounded RPC may return more.
- If a slot is taken between display and submit, Atlas returns a clear slot-taken result and leaves the appointment unchanged.

## Product boundary

Self-rescheduling only appears when the clinic has explicitly published the doctor and configured public-bookable hours. It does not infer availability from empty calendar gaps and does not constrain receptionist scheduling outside those public hours.
