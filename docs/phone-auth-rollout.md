# Atlas WhatsApp phone authentication rollout

Atlas's visible identity is a verified WhatsApp phone number. Normal users never enter, receive, or depend on Gmail/email/password credentials. Supabase Auth remains the secure session and stable user-ID authority; clinic ownership and membership remain separate authorization concepts enforced by Postgres/RLS.

## Production architecture

- **Visible identity:** E.164 phone number (`+9647XXXXXXXXX`, etc.).
- **Verification channel:** WhatsApp Business only.
- **OTP generation:** Atlas server generates a six-digit challenge.
- **OTP storage:** only keyed HMAC hashes are stored in `private.whatsapp_auth_challenges`; plaintext OTPs are never persisted.
- **OTP controls:** ten-minute expiry, five verification attempts, atomic phone/IP sliding-window limits, client resend cooldown, and **newest-code-wins** supersession.
- **Delivery:** Meta WhatsApp Cloud API through an approved Authentication template with copy-code UX.
- **OTP reliability:** a correct code is marked verified first and is finalized/consumed only after Atlas successfully establishes the Supabase session. A transient Atlas/Supabase failure therefore does not force the user to request another WhatsApp message.
- **Identity lookup:** `private.whatsapp_phone_identities` gives a direct keyed phone-hash → Supabase user mapping. Atlas never page-scans Auth users on the normal path.
- **Session:** after WhatsApp verification, Atlas creates or reuses the Supabase user and exchanges an admin-generated internal magic-link token for a normal Supabase session cookie. The deterministic `@auth.atlas.invalid` email is a server-only transport identifier; it is never shown or sent to the user.
- **Authorization:** `auth.uid()` plus clinic owner/member records and RLS. A verified phone never grants clinic membership by itself.

Supabase's hosted Phone/SMS provider does not need to be enabled for this architecture.

## Required server configuration

```env
SUPABASE_SECRET_KEY=...
ATLAS_AUTH_SECRET=... # strongly recommended stable dedicated HMAC key
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_WABA_ID=...
WHATSAPP_GRAPH_API_VERSION=v26.0
ATLAS_WHATSAPP_AUTH_ENABLED=false
ATLAS_WHATSAPP_AUTH_TEMPLATE_NAME=atlas_login_code
ATLAS_WHATSAPP_AUTH_TEMPLATE_LANGUAGE=en_US
ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE_NAME=atlas_staff_invite
ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE_LANGUAGE=en_US
SITE_URL=https://<production-atlas-domain>
```

`ATLAS_WHATSAPP_AUTH_ENABLED` is an independent authentication/invitation kill switch. Keep it `false` until the real sender and approved templates have passed the live release gate. It is intentionally separate from reminder delivery's `WHATSAPP_ENABLED` switch.

A stable dedicated `ATLAS_AUTH_SECRET` is preferred so rotating a Supabase service-role/server key never changes Atlas phone hashes.

`GET /api/auth/readiness` exposes only safe presence/readiness booleans. It never exposes provider tokens or secret values.

## Meta template preparation and release gate

Atlas includes operational commands so template state is checked instead of guessed:

```bash
npm run whatsapp:readiness
npm run whatsapp:prepare-templates
npm run whatsapp:release-gate
```

- `whatsapp:readiness` checks the configured WABA and current template states.
- `whatsapp:prepare-templates` creates missing Atlas templates when Meta credentials are available.
- `whatsapp:release-gate` exits non-zero unless the Authentication and receptionist-invite templates are both present and approved.

The authentication template is expected to use:
- category **Authentication**
- OTP copy-code button
- ten-minute code expiry
- short message-send TTL
- no clinic/patient data

The receptionist invitation template is expected to use:
- category **Utility**
- clinic name body variable
- URL button whose dynamic suffix opens `https://<atlas-domain>/join/{{1}}`

The production sender must be the actual Meta WhatsApp Business phone-number ID represented by `WHATSAPP_PHONE_NUMBER_ID`, authorized by `WHATSAPP_ACCESS_TOKEN` and associated with `WHATSAPP_WABA_ID`.

## Owner/new-user sign-in

1. User opens Atlas.
2. User chooses country/code and enters the mobile number used on WhatsApp.
3. Atlas normalizes the number to E.164.
4. `POST /api/auth/whatsapp/start` atomically reserves a private challenge under phone/IP rate limits.
5. Creating a newer challenge supersedes any older unused code for the same phone.
6. Atlas sends the six-digit code through the approved WhatsApp Authentication template.
7. User copies the newest code from WhatsApp into Atlas.
8. `POST /api/auth/whatsapp/verify` atomically verifies the challenge.
9. Atlas resolves or creates the keyed WhatsApp identity, creates the Supabase session, then finalizes the challenge.
10. Atlas loads clinics available under RLS:
   - zero clinics → clinic creation/onboarding
   - one clinic → open it
   - multiple clinics → explicit clinic chooser

Concurrent successful verification cannot create two Atlas identities for one number: Supabase's unique phone constraint is the database backstop and the private identity index converges on the winning user ID.

A normal verified user is never inserted into another clinic automatically.

## Changing the sign-in phone

Settings uses the same WhatsApp verification engine:

1. Authenticated user enters the new WhatsApp number.
2. Atlas sends a new WhatsApp code.
3. `POST /api/auth/whatsapp/change-phone` verifies the challenge.
4. Atlas rejects the change if the verified number already maps to another Atlas user.
5. Atlas updates the **same** Supabase user ID, including the verified phone and internal synthetic auth email.
6. Atlas rebinds the private phone-hash identity mapping.
7. Only after the update succeeds is the challenge finalized.
8. Clinic ownership/membership remains attached to the unchanged user ID.

No Supabase `phone_change` SMS OTP is used.

## Receptionist invitation

The clinic owner enters a WhatsApp number, not an email, and never provisions a password.

1. Owner enters the receptionist's WhatsApp phone and assigned doctor.
2. Atlas creates a cryptographically random one-use token with 24-hour expiry.
3. Only the SHA-256 token hash and keyed phone hash are stored.
4. The new invitation starts **pending** and is not redeemable yet.
5. Atlas sends the approved WhatsApp invitation template to that exact phone.
6. After Meta accepts the send, Atlas atomically activates the new invitation, records the provider message ID/sent time, and revokes older live links for that clinic+phone.
7. If the new send fails, Atlas removes the pending invite and leaves any older valid invite working.
8. Receptionist opens the newest WhatsApp link and verifies their phone through WhatsApp.
9. Redemption succeeds only if the verified phone hash matches the phone originally invited.
10. The server inserts/updates the receptionist clinic membership.

Forwarding the link to another phone does not grant clinic access. Reinviting the same receptionist makes the newest successfully delivered link the only live link.

## True Atlas account deletion

**Settings → Account & deletion → Delete Atlas account permanently** means identity deletion, not merely deleting one clinic.

The database is designed so account deletion is a single atomic operation:

1. Atlas requests deletion of the Supabase Auth user.
2. `clinics.owner_id` references `auth.users(id) ON DELETE CASCADE`.
3. Therefore, only if the Auth-user deletion succeeds, every clinic owned by that identity is deleted inside the same database transaction.
4. Existing clinic foreign keys then cascade appointments, staff, doctors, reminders, private clinic connections/links and other clinic-scoped records.
5. If the Auth deletion fails, the owned clinics remain untouched; Atlas never leaves the user in a half-deleted state.
6. Atlas signs the local session out and returns to `/login?notice=account_deleted`.
7. If the same phone verifies through WhatsApp later, the old Auth ID is gone, so Atlas creates a brand-new identity and fresh clinic onboarding begins.

The separate clinic-workspace deletion screen remains available only for owners intentionally deleting one clinic while retaining their Atlas account.

## Database security and scale

`private.whatsapp_auth_challenges`:
- RLS enabled
- no `anon` or `authenticated` table privileges
- keyed HMAC phone/IP/OTP values only
- atomic service-role reserve/verify/finalize RPCs
- newest-code supersession
- bounded attempts and expiry
- short-lived cleanup of completed/expired challenge history

`private.whatsapp_phone_identities`:
- RLS enabled
- no browser table privileges
- keyed phone hash only
- unique user binding
- Auth-user cascade cleanup
- direct identity resolution instead of Auth list scanning

Phone-bound staff invitation RPCs are executable by `service_role` only. Browser clients cannot create, activate or redeem clinic membership directly.

Foreign keys identified by the database performance advisor are covered with indexes for staff invites, WhatsApp connections and Smart Fill relationships.

## Production release verification

Before promoting WhatsApp-only authentication, require all of the following:

- TypeScript typecheck.
- Unit/security regression suite.
- Production Next.js build.
- Production dependency audit.
- Browser smoke matrix including iPhone viewport.
- iOS simulator compile.
- Production `/login` contains WhatsApp phone UI and no email/Gmail field.
- `GET /api/auth/readiness` reports sender/auth prerequisites present.
- `npm run whatsapp:release-gate` passes against the production WABA.
- A real production phone receives the WhatsApp OTP.
- Correct code creates a Supabase session.
- A transient session failure can retry the same correct code without requesting another WhatsApp message.
- Newer OTP invalidates the older OTP.
- Incorrect, expired and exhausted-attempt behavior works.
- Phone/IP request throttling works under parallel requests.
- Returning verified phone opens the same user ID.
- Concurrent successful verification converges on one identity.
- New verified phone with zero clinics reaches clinic creation.
- Phone-change flow preserves the same user ID and rejects a number owned by another account.
- Owner-entered receptionist phone receives a WhatsApp invitation link.
- Correct invited phone can redeem; a different phone cannot.
- Reinvite makes the newest successfully delivered link authoritative while a failed resend does not break the prior valid link.
- Stranger phone verification creates no membership in an existing clinic.
- Cross-clinic RLS checks remain green.
- Permanent account deletion atomically removes Auth identity + owned clinics, and the same phone subsequently starts fresh.

Do not describe WhatsApp authentication as end-to-end live until a real production sender credential and approved templates have produced successful test messages and the final release gate passes.
