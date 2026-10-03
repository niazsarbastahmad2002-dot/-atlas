# Atlas Vision — verified public booking transaction foundation

This layer prepares the final database write for patient self-booking without exposing a booking flow before real phone verification is live.

## Contract

- Only trusted server code using the Supabase service role may call the booking finalizer.
- Anonymous and ordinary authenticated clients have no execute grant.
- The clinic and doctor must still be published, the doctor must still be active, and public booking must still be enabled.
- The requested timestamp must still be returned by the same bounded public-slot RPC used by the patient-facing availability UI.
- Atlas writes into the existing appointments table so current uniqueness, reminder, Smart Fill, audit, and scheduling triggers remain authoritative.
- The existing unique active doctor/time index remains the final race-condition guard.
- Retries use the existing clinic/idempotency key contract.
- Appointment audit attribution is set to patient.
- V1 accepts only an Iraqi +964 mobile because Atlas's current patient communications and verification plan are Iraq-first.

## Deliberately dormant

Production phone OTP and WhatsApp OTP are currently disabled. No public booking form or Book button should call this function until the server can prove ownership of the submitted phone number.
