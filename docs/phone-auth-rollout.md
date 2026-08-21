# Atlas phone authentication rollout

Atlas is phone-first. Supabase Auth remains the identity authority; clinic ownership and membership remain separate application authorization concepts enforced by Postgres/RLS.

## Target production architecture

- **Identity:** Supabase Auth phone OTP.
- **Canonical phone format:** E.164 (`+9647XXXXXXXXX`, etc.).
- **Default delivery:** SMS through a production Supabase-supported SMS provider.
- **Recommended provider for Atlas:** Twilio Verify, because it supports reliable SMS and gives Atlas a clean path to Supabase-supported WhatsApp OTP later.
- **WhatsApp OTP:** disabled until Twilio/Twilio Verify and a real WhatsApp sender are configured and verified end-to-end. Atlas must never display a WhatsApp OTP choice just because Meta reminders are configured; reminder delivery and Supabase Auth OTP delivery are separate systems.
- **Authorization:** `auth.uid()` plus clinic owner/member records and RLS. A phone number never grants clinic membership by itself.
- **OTP storage:** Atlas never stores OTP values.

## Current rollout flags

```env
ATLAS_LEGACY_AUTH_ENABLED=false
NEXT_PUBLIC_ATLAS_PHONE_SIGNUP_ENABLED=false
NEXT_PUBLIC_ATLAS_WHATSAPP_OTP_ENABLED=false
```

`/api/auth/readiness` exposes only safe booleans for operational verification. It must never expose provider credentials.

## Supabase dashboard configuration

Before production rollout:

1. Open **Supabase → Authentication → Providers → Phone** for the Atlas project.
2. Enable Phone authentication.
3. Configure a production SMS provider. Prefer **Twilio Verify** for Atlas if available.
4. Configure provider credentials only in Supabase's protected provider settings. Do not put SMS provider secrets in `NEXT_PUBLIC_*` variables or Atlas client code.
5. Review OTP rate limits and expiry. Atlas also enforces a client resend cooldown, but the provider/Supabase rate limit is the security boundary.
6. Keep Email enabled temporarily only for the legacy-account migration window.
7. Do not enable the Atlas WhatsApp OTP UI yet.

After configuration, verify `/api/auth/readiness` reports `reachable: true` and `supabasePhoneEnabled: true`.

## Existing-account migration — preserve IDs

Do **not** create replacement users and do not update `auth.users` directly with SQL.

1. Deploy the migration-capable release with `ATLAS_LEGACY_AUTH_ENABLED=true` and `NEXT_PUBLIC_ATLAS_PHONE_SIGNUP_ENABLED=false`.
2. Each pre-phone user signs in through the unlinked `/login/legacy` route. The legacy magic-link call uses `shouldCreateUser: false`, so it cannot manufacture a replacement account.
3. In Settings, the signed-in user chooses **Add/Change phone number**.
4. Atlas calls Supabase `auth.updateUser({ phone })` for the already-authenticated user.
5. The user receives the provider OTP and Atlas verifies it with `type: "phone_change"`.
6. Confirm the same Supabase auth user ID still owns/belongs to the same clinics.
7. Repeat for every pre-phone Atlas account.
8. Confirm the live project has no required account left without a verified phone.
9. Set `ATLAS_LEGACY_AUTH_ENABLED=false`.
10. Set `NEXT_PUBLIC_ATLAS_PHONE_SIGNUP_ENABLED=true`.
11. After confirming there are no legacy invitation/migration needs, disable normal Email authentication in Supabase if desired. Historical email fields can remain inside existing auth records; they are not the Atlas primary UI identity.

This sequence preserves references such as `clinics.owner_id`, `clinic_members.user_id`, `doctors.created_by`, appointment actor references, and audit actor references because the Supabase user ID never changes.

## New-user behavior

1. User enters a mobile number and country code.
2. Atlas normalizes it to E.164.
3. Supabase sends the OTP.
4. User verifies the OTP; only then does Supabase create/authenticate the identity when open phone signup is enabled.
5. Atlas loads clinics available under RLS.
   - zero clinics → clinic creation/onboarding
   - one clinic → open it
   - multiple clinics → explicit clinic chooser
6. A normal newly authenticated user is never inserted into another clinic.
7. An invited user joins only after a valid one-use invitation is redeemed server-side.

## Clinic deletion behavior

Clinic deletion and account deletion are different operations.

- Deleting a clinic removes that clinic and its clinic-owned records according to the database's existing protected cascade rules.
- It does **not** delete the Supabase auth user.
- If the user still has another accessible clinic, Atlas opens that clinic.
- If the deleted clinic was the user's final workspace, Atlas signs out the current session and returns to `/login?notice=clinic_deleted`.
- After the user verifies their phone again, the zero-clinic dashboard offers clinic creation so they can experience the fresh clinic onboarding flow again.

## WhatsApp OTP activation

Only enable `NEXT_PUBLIC_ATLAS_WHATSAPP_OTP_ENABLED=true` after all of the following are true:

1. Supabase Phone Auth is using Twilio or Twilio Verify.
2. A real WhatsApp sender is configured for that provider.
3. A test phone receives a WhatsApp OTP from the production provider.
4. The newest OTP verifies successfully through Supabase and creates a session.
5. Rate-limit and resend behavior are verified.

The existing Atlas Meta/WhatsApp reminder integration does not satisfy these requirements by itself.

## Required release verification

Before merging/deploying to production, require:

- TypeScript typecheck.
- Unit and security regression suite.
- Production Next.js build.
- Production dependency audit.
- Playwright browser smoke tests, including a 390×844 iPhone viewport.
- iOS simulator compile.
- Invalid/malformed phone rejection before provider contact.
- OTP send and successful OTP verification against the real SMS provider.
- Incorrect and expired OTP behavior.
- Resend/cooldown/rate-limit behavior.
- Returning-user phone login.
- New-user phone signup with zero clinics → create clinic.
- Explicit invite redemption → joined clinic.
- Stranger phone signup → no membership in an existing clinic.
- Logout/login again.
- Existing-account migration with unchanged auth user ID and unchanged clinic ownership/membership.
- Cross-clinic RLS checks.
- Delete final clinic → auth account preserved → sign-in → fresh create-clinic onboarding.

Do not promote the release while any real-provider or existing-account migration check above is incomplete.
