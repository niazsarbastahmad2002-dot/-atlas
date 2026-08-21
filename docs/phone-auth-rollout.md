# Atlas WhatsApp phone authentication rollout

Atlas's visible identity is a verified WhatsApp phone number. Normal users never enter, receive, or depend on Gmail/email/password credentials. Supabase Auth remains the secure session and user-ID authority; clinic ownership and membership remain separate application authorization concepts enforced by Postgres/RLS.

## Production architecture

- **Visible identity:** E.164 phone number (`+9647XXXXXXXXX`, etc.).
- **Verification channel:** WhatsApp Business only.
- **OTP generation:** Atlas server generates a six-digit challenge.
- **OTP storage:** only HMAC hashes are stored in `private.whatsapp_auth_challenges`; plaintext OTP values are never persisted.
- **OTP controls:** ten-minute expiry, one-use consumption, bounded attempts, phone/IP rate limits and a client resend cooldown.
- **Delivery:** Meta WhatsApp Cloud API using an approved authentication template with a copy-code button.
- **Session:** after WhatsApp verification, Atlas creates/updates the Supabase user and exchanges an admin-generated internal magic-link token for a normal Supabase session cookie. The deterministic `@auth.atlas.invalid` email is an internal transport identifier only; it is never shown or sent to the user.
- **Authorization:** `auth.uid()` plus clinic owner/member records and RLS. A verified phone never grants clinic membership by itself.

Supabase's hosted Phone/SMS provider does not need to be enabled for this architecture.

## Required server configuration

```env
SUPABASE_SECRET_KEY=...
ATLAS_AUTH_SECRET=... # recommended dedicated HMAC secret
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_GRAPH_API_VERSION=v26.0
ATLAS_WHATSAPP_AUTH_TEMPLATE_NAME=atlas_login_code
ATLAS_WHATSAPP_AUTH_TEMPLATE_LANGUAGE=en_US
ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE_NAME=atlas_staff_invite
ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE_LANGUAGE=en_US
```

`/api/auth/readiness` exposes only safe credential-presence booleans. It must never expose token values.

## Meta authentication template

Create an approved WhatsApp template for `ATLAS_WHATSAPP_AUTH_TEMPLATE_NAME`:

- category: **Authentication**
- one-time password / copy-code experience
- the six-digit Atlas OTP is supplied to the template body and copy-code button
- no sensitive Atlas data is included

The production sender must be the actual WhatsApp Business phone-number ID represented by `WHATSAPP_PHONE_NUMBER_ID`, authorized by `WHATSAPP_ACCESS_TOKEN`.

## Owner/new-user sign-in

1. User opens Atlas.
2. User chooses country/code and enters the mobile number used on WhatsApp.
3. Atlas normalizes the number to E.164.
4. `POST /api/auth/whatsapp/start` creates a private hashed challenge and sends the code through WhatsApp.
5. User copies the code from WhatsApp into Atlas.
6. `POST /api/auth/whatsapp/verify` consumes the one-use challenge.
7. Atlas creates or reuses the Supabase user tied to that verified phone and opens a Supabase session.
8. Atlas loads clinics available under RLS:
   - zero clinics → clinic creation/onboarding
   - one clinic → open it
   - multiple clinics → explicit clinic chooser

A normal verified user is never inserted into another clinic automatically.

## Changing the sign-in phone

Settings uses exactly the same WhatsApp verification engine:

1. Authenticated user enters the new WhatsApp number.
2. Atlas sends a new WhatsApp code.
3. `POST /api/auth/whatsapp/change-phone` consumes the challenge.
4. Atlas rejects the change if the phone already belongs to another Atlas identity.
5. Atlas updates the same Supabase user ID, including phone and the internal synthetic auth email.
6. Clinic ownership/membership therefore remains attached to the same user ID.

No Supabase `phone_change` SMS OTP is used.

## Receptionist invitation

The clinic owner does not enter an email and does not manually provision a password.

1. Owner enters the receptionist's WhatsApp phone and assigned doctor.
2. Atlas creates a cryptographically random one-use token with 24-hour expiry.
3. Only the SHA-256 token hash and HMAC phone hash are stored.
4. Atlas sends an approved WhatsApp invitation template to that exact phone with a URL button linking to `/join/<token>`.
5. Receptionist opens the link and verifies their phone through WhatsApp.
6. Redemption succeeds only if the verified phone hash matches the phone hash originally invited.
7. The server then inserts/updates the receptionist clinic membership.

Forwarding the invitation link to a different phone does not grant clinic access.

## True Atlas account deletion

**Delete Atlas account permanently** means identity deletion, not merely deleting one clinic.

1. Atlas deletes every clinic owned by that user under the existing protected database cascade rules.
2. Atlas deletes the Supabase auth user.
3. Sessions, memberships and auth-linked records cascade according to the schema.
4. Atlas returns to `/login?notice=account_deleted`.
5. If that same phone verifies through WhatsApp later, Atlas creates a brand-new auth identity and the user experiences fresh clinic onboarding.

The separate clinic-workspace deletion action may remain for users who intentionally want to delete only one clinic; it is not presented as account deletion.

## Database security

`private.whatsapp_auth_challenges`:
- RLS enabled
- no `anon` or `authenticated` table privileges
- HMAC phone/IP/OTP values only
- one-use `consumed_at`
- expiry and request indexes

Phone-bound staff invite RPCs are executable by `service_role` only. Browser clients cannot create or redeem membership directly.

## Production release verification

Before promoting this architecture, require:

- TypeScript typecheck.
- Unit/security regression suite.
- Production Next.js build.
- Production dependency audit.
- Browser smoke matrix including iPhone viewport.
- iOS simulator compile.
- Production `/login` contains WhatsApp phone UI and no email/Gmail field.
- Live real-number WhatsApp OTP arrives from the production sender.
- Correct code creates a Supabase session.
- Incorrect, expired and exhausted-attempt behavior works.
- Resend/rate limiting works.
- Returning verified phone opens the same user ID.
- New verified phone with zero clinics reaches clinic creation.
- Phone-change flow preserves the same user ID.
- Owner-entered receptionist phone receives a WhatsApp invitation link.
- Correct invited phone can redeem; a different phone cannot.
- Stranger phone verification creates no membership in an existing clinic.
- Cross-clinic RLS checks remain green.
- Permanent account deletion removes owned clinics + auth identity, and the same phone can subsequently start fresh.

Do not describe WhatsApp authentication as end-to-end live until a real production sender credential and approved templates have produced successful test messages.
