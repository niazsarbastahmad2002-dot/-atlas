# Atlas Vision — patient self-booking verification

Atlas now has the application flow needed to turn a real public slot into a private patient appointment without giving the patient clinic workspace access.

## Ready in code

- The doctor profile can turn live slot chips into booking links.
- The booking page rechecks that the selected slot is still live.
- A separate Supabase browser client requests/verifies the patient's phone OTP without persisting an Atlas staff/session cookie.
- The finalize API validates the Supabase access token server-side and derives the patient's phone from the verified identity; it never trusts a submitted phone field.
- Finalization is rate-limited per verified auth identity.
- The database independently requires a phone-confirmed auth user.
- Appointment creation and private patient-link issuance happen inside the trusted database transaction.
- The patient is not inserted into clinic membership.
- The patient lands directly on the existing private appointment experience after success.

## Launch gate

`ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED` defaults to false.

Patient self-booking must remain off until:

1. Supabase Phone Auth has a real production messaging provider.
2. A real Iraqi phone can receive an OTP.
3. Correct, incorrect, expired, resend, and rate-limit behavior are verified.
4. The full booking flow succeeds with synthetic/non-clinical booking data.
5. The cost of the chosen OTP provider is explicitly accepted.

Turning on ordinary clinic phone signup is not enough by itself; the separate patient-booking flag prevents accidental launch.

## Current money boundary

Supabase requires a third-party phone messaging provider. WhatsApp OTP is supported through Twilio/Twilio Verify. Those providers are usage-priced, so provider activation and any live OTP send are deliberately outside the no-spend implementation phase.
