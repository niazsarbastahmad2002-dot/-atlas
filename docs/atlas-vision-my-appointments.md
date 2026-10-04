# Atlas Vision — My Appointments

## V1 scope

My Appointments is the first patient-account surface built on the private Atlas patient identity foundation.

It deliberately lists only appointments that were self-booked by the same verified Atlas patient identity. Atlas does not auto-claim older receptionist-created appointments merely because a phone number matches.

## Session boundary

Patient portal sign-in uses the existing ephemeral Supabase phone verification client only to prove the phone identity. After verification, the server issues a separate opaque Atlas patient session:

- random 32-byte token;
- only the SHA-256 hash is stored in the private database;
- the raw token is kept in an HttpOnly, Secure, SameSite=Lax cookie;
- cookie scope is /patient-account;
- session lifetime is seven days;
- the session is separate from the professional Supabase browser session, so opening My Appointments cannot replace a receptionist/doctor login.

No paid OTP provider is enabled by this work. If production phone verification is not ready, the patient-account page explains that sign-in is unavailable while care discovery remains usable.

## Appointment boundary

The patient browser never receives direct table access to clinic appointments.

A service-role-only RPC returns a minimal appointment list for the verified account:

- appointment identifier;
- clinic name;
- doctor name and specialty;
- appointment time;
- appointment status;
- reminder language.

It never returns patient phone, private clinic settings, notes, reminders, memberships, or clinical data.

## Manage appointment

The Manage action does not create another appointment-management system.

The server rechecks the patient session and durable appointment ownership, then mints a fresh short-lived private appointment token and redirects into the existing /patient/[token] experience. Existing saved patient links are not revoked.

## Future work

Later Atlas can add profile editing, account recovery/session management, and carefully designed claiming of pre-existing appointments. Claiming old appointments must not be based on a phone-number match alone without an explicit privacy-safe proof flow.
