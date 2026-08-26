# Atlas phone authentication rollout

Atlas is phone-first. Supabase Auth remains the identity authority; clinic ownership and membership remain separate application authorization concepts enforced by Postgres/RLS.

## Target production architecture

- **Identity:** Supabase Auth phone OTP.
- **Canonical phone format:** E.164 (`+9647XXXXXXXXX`, etc.).
- **Default delivery:** SMS through a production Supabase-supported SMS provider unless the direct-Meta WhatsApp transport is deliberately activated.
- **Native Supabase WhatsApp:** Supabase's `channel: "whatsapp"` path currently requires Twilio or Twilio Verify with a WhatsApp sender.
- **Direct Meta WhatsApp:** Atlas can instead use Supabase's signed Send SMS Hook. Supabase still generates and verifies the OTP; Atlas only transports that OTP through the approved Meta Cloud API authentication template. This preserves one identity authority and avoids building a second OTP system.
- **WhatsApp OTP:** disabled until the selected production transport and sender are verified end-to-end. Atlas must never display WhatsApp OTP merely because appointment reminders are configured.
- **Authorization:** `auth.uid()` plus clinic owner/member records and RLS. A phone number never grants clinic membership by itself.
- **OTP storage:** Atlas never stores OTP values.

Development with Meta's official test sender is documented in `docs/meta-test-whatsapp-mode.md`. Its credentials are isolated from production and test mode is rejected on Vercel production.

## Current rollout flags

```env
ATLAS_LEGACY_AUTH_ENABLED=false
NEXT_PUBLIC_ATLAS_PHONE_SIGNUP_ENABLED=false
NEXT_PUBLIC_ATLAS_WHATSAPP_OTP_ENABLED=false
NEXT_PUBLIC_ATLAS_DIRECT_META_OTP_ENABLED=false
WHATSAPP_DIRECT_OTP_ENABLED=false
```

`/api/auth/readiness` exposes only safe booleans for operational verification. It must never expose provider credentials.

## Supabase dashboard configuration

Before production rollout:

1. Open **Supabase → Authentication → Providers → Phone** for the Atlas project.
2. Enable Phone authentication.
3. Choose one production transport path:
   - a normal Supabase-supported SMS provider, or
   - Atlas direct Meta delivery using the Supabase Send SMS Hook and an approved Meta authentication template.
4. Keep provider credentials and hook signing secrets only in protected provider/server settings. Do not put secrets in `NEXT_PUBLIC_*` variables or client code.
5. Review OTP rate limits and expiry. Atlas also enforces a client resend cooldown, but provider/Supabase rate limits are the security boundary.
6. Keep Email enabled temporarily only for the legacy-account migration window.
7. Do not enable the Atlas WhatsApp OTP UI until the chosen WhatsApp transport has passed end-to-end verification.

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
3. Supabase generates the OTP and invokes the configured delivery transport.
4. User verifies the OTP with Supabase; only then does Supabase create/authenticate the identity when open phone signup is enabled.
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
- If the deleted clinic was the user's final workspace, Atlas keeps the account active and routes to the explicit keep-account or delete-account choice.
- The user can later create a fresh clinic without replacing the Atlas identity.

## WhatsApp OTP activation

Atlas supports two WhatsApp OTP transport paths, but only one should be active for a given rollout.

### Native Supabase WhatsApp

Use the normal Supabase `channel: "whatsapp"` option only after:

1. Supabase Phone Auth is using Twilio or Twilio Verify.
2. A real WhatsApp sender is configured for that provider.
3. A test phone receives a WhatsApp OTP.
4. The newest OTP verifies successfully through Supabase and creates a session.
5. Rate-limit and resend behavior are verified.

### Direct Meta via Supabase Send SMS Hook

Use this when Atlas should send the Supabase-generated code through Meta Cloud API directly:

1. The Meta production sender is approved and authorized for Atlas.
2. `atlas_login_otp_v1` is an approved AUTHENTICATION template.
3. Supabase Phone Auth is enabled.
4. The Supabase Send SMS Hook points to Atlas `/api/auth/send-sms-hook` and its Standard Webhooks signing secret is configured as `SUPABASE_SEND_SMS_HOOK_SECRET`.
5. Server `WHATSAPP_DIRECT_OTP_ENABLED=true` and public `NEXT_PUBLIC_ATLAS_DIRECT_META_OTP_ENABLED=true` are enabled together.
6. A real test phone receives the WhatsApp OTP and successfully verifies with the existing Supabase `verifyOtp(..., type: "sms")` flow.
7. Incorrect, expired, resend, cooldown and provider-rate-limit behavior are verified.

The Send SMS Hook replaces the project's SMS transport while it is active, so Atlas presents direct-Meta mode as WhatsApp-only rather than pretending there is still an independent SMS choice.

Appointment reminder configuration alone still does not enable authentication. OTP activation requires the signed Supabase hook plus the authentication template and the explicit OTP flags above.

## Required release verification

Before merging/deploying to production, require:

- TypeScript typecheck.
- Unit and security regression suite.
- Production Next.js build.
- Production dependency audit.
- Playwright browser smoke tests, including a 390×844 iPhone viewport.
- iOS simulator compile.
- Invalid/malformed phone rejection before provider contact.
- OTP send and successful OTP verification against the selected real provider transport.
- Incorrect and expired OTP behavior.
- Resend/cooldown/rate-limit behavior.
- Returning-user phone login.
- New-user phone signup with zero clinics → create clinic.
- Explicit invite redemption → joined clinic.
- Stranger phone signup → no membership in an existing clinic.
- Logout/login again.
- Existing-account migration with unchanged auth user ID and unchanged clinic ownership/membership.
- Cross-clinic RLS checks.
- Delete final clinic → auth account preserved → explicit keep/delete-account choice.

Do not promote the release while any real-provider or existing-account migration check above is incomplete.
