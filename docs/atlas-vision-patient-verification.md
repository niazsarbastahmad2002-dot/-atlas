# Atlas Patient — Page 11: Patient Verification

## Purpose

Show patients why they must verify their mobile number before opening private account information. This page is a **view of the existing identity system**, not a new account or verification provider.

## Existing flow

1. Patient enters an Iraqi mobile number. Explain that verification protects private appointments.
2. When existing phone-provider readiness allows it, the existing ephemeral Supabase verification client sends a code, with signup still gated by existing registration configuration.
3. Patient enters the code in one accessible numeric field with native one-time-code autofill and optional paste. Show only the **masked** mobile number.
4. Supabase Auth verifies the code; the existing service endpoint revalidates the confirmed identity before issuing the separate private patient-account session.
5. Open **My Appointments** only after that session is confirmed. No appointment data is available merely from a phone-number match.

## Interface states

- **Not ready:** Explain that patient sign-in is disabled; keep care discovery accessible. Never simulate sending a code.
- **Sending/verifying:** Disable duplicate requests and announce progress.
- **Wrong code:** Explain that the code did not work, without guessing whether it has expired.
- **Explicitly expired code:** Clear the code and guide the user to request another.
- **Resend:** Give positive confirmation only after the provider accepts the request. Show a 60-second client-side cooldown; it is a UX guard, **not** a substitute for provider/backend rate limits.
- **Network failure:** Explain how to retry, without claiming verification succeeded.
- **Too many attempts:** Surface rate limiting and ask the patient to wait, without claiming an exact provider unlock time.
- **Change number:** Return safely to phone entry without reusing an old code.

## Coordination boundaries

- **Registration:** Existing account identities and existing signup eligibility are authoritative. Do not create a separate patient identity, grant clinic membership, or bypass a disabled signup path.
- **Appointment Confirmation:** Public booking remains feature-gated. Do not enable it or change booking-finalization or appointment-token semantics for the verification UI.
- **My Appointments:** Preserve the separate HttpOnly patient-account session, private appointment ownership checks, and service-only access. Do not touch the staff/doctor browser session.

## Accessibility and localization

English, Sorani Kurdish, Badini Kurdish, and Iraqi Arabic follow the existing Atlas locale choice and RTL direction. Keep digits and masked phone LTR, touch controls at least 48px high, clear error/status announcements, and iPhone autofill. Check iPhone, iPad and desktop when runtime testing is authorized.

## Safety / release

No auth-provider activation, paid OTP service, RLS or schema changes, alternative verification identities, production changes, merge, or deployment are part of Page 11. Full CI and real-device validation are still required before any release decision.
