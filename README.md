# Atlas

Atlas is a mobile-first appointment and reminder workflow for private clinics in Erbil/Kurdistan. The normal daily user is the receptionist.

**Product rule:** open Atlas → see the schedule → perform the task → move on.

Atlas is intentionally not an EMR, diagnostic system, treatment tool, hospital-management suite, or general clinic ERP. Do not store diagnoses or medical notes in Atlas.

## Production source of truth

- Production: `https://atlasdemofixed.vercel.app`
- GitHub: `niazsarbastahmad2002-dot/-atlas`, branch `main`
- Vercel project: `atlas_demo_fixed` (Git-connected; production deploys from `main`)
- Application timezone: `Asia/Baghdad`
- `/demo`: synthetic browser-only test workspace; never connected to production clinic/patient data

The live database, generated database types, current forward migrations, application code, and this README are expected to describe the same production system. The production database predates complete migration-file capture in this repository; the exact recorded ledger and the rules for future migration parity are documented in [`supabase/MIGRATION_HISTORY.md`](supabase/MIGRATION_HISTORY.md). Do not reconstruct missing historical SQL from migration names alone.

Operational pilot procedures live in [`PILOT_RUNBOOK.md`](PILOT_RUNBOOK.md).

## Receptionist workflow

The main workspace supports:

- day-by-day appointment schedule
- appointment creation with Iraqi mobile normalization
- doctor assignment and doctor-specific double-booking protection
- 5/10/15/20/30-minute clinic scheduling intervals
- interval-aware quick slots plus custom time
- Pending, Confirmed, Cancelled, Completed, and No-show states
- retained-history archive/void instead of destructive deletion
- optimistic status actions with scroll-position continuity
- Sorani Kurdish, Arabic, and English UI
- independent Sorani/Arabic/English patient reminder language
- patient reminder consent
- secure appointment-specific patient self-service links

Administrative membership and clinic controls remain behind Settings. Database roles (`owner`, `manager`, `receptionist`) remain because they enforce authorization boundaries; they are not intended to complicate ordinary front-desk work.

## Authentication model

Atlas has one canonical authentication story.

1. **Existing valid session:** opening Atlas goes directly to `/dashboard`. No login screen.
2. **Session missing, device already prepared:** the sign-in screen shows one primary **Open Atlas** action. Supabase Passkeys/WebAuthn may use Face ID, Touch ID, fingerprint, device PIN, or the platform password manager underneath. Receptionists do not need to understand the term “passkey”.
3. **New device or recovery:** use the pre-provisioned clinic work email. Atlas sends one secure Supabase magic link using the standard SSR/PKCE flow. A successful link returns to Atlas, performs one optional device-security setup, then opens the schedule.
4. **Logout:** explicit logout invalidates the current Supabase session and returns to sign-in.

Atlas does not create accounts from arbitrary email sign-in attempts (`shouldCreateUser: false`). Clinic access must be provisioned first. Expired/used links, mail rate limits, cancelled device prompts, unsupported device authentication, and network failures have separate human-readable recovery states.

### Authentication pilot blocker

Supabase's built-in development email sender has restrictive rate limits and recent production auth logs show repeated `over_email_send_rate_limit` responses. **Custom production SMTP is required before relying on email recovery in a real clinic pilot.** Atlas must not claim an email was sent when Supabase rejected it.

Production auth logs have also verified successful passkey authentication and successful PKCE magic-link authentication, so the remaining recovery blocker is mail delivery infrastructure rather than the Atlas login flow itself.

The previous setup-code, six-digit email-code, application `trusted_devices`, and implicit-token-finish architectures are retired. Passkey credentials themselves are owned by Supabase Auth, not by an Atlas public table.

## Current database model

Primary public tables:

- `clinics`
- `clinic_members`
- `doctors`
- `appointments`
- `clinic_reminder_settings`
- `appointment_reminders`
- `reminder_delivery_events`
- `pending_reminder_delivery_events`
- `appointment_audit_events`

Private patient-link tables:

- `private.patient_appointment_tokens`
- `private.patient_link_rate_limits`

Important invariants are enforced in Postgres as well as application code: tenant membership, doctor/clinic consistency, Iraqi phone format, valid appointment status transitions, outcome timing, appointment identity immutability, void history, reminder state/retry safety, and doctor slot collision protection.

Patient-link token creation is a server-only operation. Raw patient tokens are high entropy and only their hashes are stored. Private patient token/rate-limit tables deny direct `anon` and `authenticated` access.

## Security assumptions

- RLS is required on tenant-sensitive public tables.
- Clinic A must not read or mutate Clinic B.
- Service-role and secret credentials are server-only.
- Privileged `SECURITY DEFINER` functions use a fixed empty `search_path`, validate their caller/actor, and expose execution only to roles that need it.
- Appointment/patient actions do not weaken database constraints just to make a UI action succeed.
- Audit events intentionally avoid patient name and phone data.
- Logs must not contain raw patient-link tokens, unnecessary patient PII, medical notes/diagnoses, secrets, or raw WhatsApp webhook payloads.
- No claim of HIPAA, GDPR, Iraqi healthcare, or other regulatory compliance is made without a dedicated legal/security validation.

`supabase/tenant_isolation_smoke_test.sql` is transactional and rolls back synthetic fixtures.

## Patient self-service

Patient links are appointment-specific, high entropy, hashed at rest, expiring, revocable, and rate controlled. A patient may only view limited information for the linked appointment and perform permitted confirm/cancel transitions. Patients cannot browse clinic schedules or enumerate other appointments.

## WhatsApp reminders

The existing reminder system includes scheduling, retries, terminal retry handling, idempotency, duplicate-send protection, consent gating, approved-template gating, clinic/global daily limits, signed webhook handling, delivery states, reschedule/cancellation synchronization, and privacy-conscious logging.

`WHATSAPP_ENABLED=false` must remain the production default until all external prerequisites are genuinely complete:

1. verified WhatsApp Business setup and production number
2. approved Meta template(s)
3. production server-side credentials
4. webhook registration and verification
5. a reliable five-minute reminder scheduler
6. conservative clinic/global quotas
7. synthetic end-to-end acceptance test

Do not fake activation.

## `/demo` isolation

`/demo` exists for receptionist testing with invented data. It must never:

- read production clinic or patient rows
- write production clinic or patient rows
- send real email
- send real WhatsApp
- create real patient links

Changes to the receptionist UI should keep `/demo` behavior representative where practical without connecting it to Supabase.

## Environment contract

Public browser variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SITE_URL`

Server-only variables:

- `SUPABASE_SECRET_KEY` (preferred) or `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `WHATSAPP_ENABLED`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_GRAPH_API_VERSION`
- `WHATSAPP_GLOBAL_DAILY_LIMIT`

Never expose server-only values through `NEXT_PUBLIC_*` variables or client bundles.

SMTP credentials are configured in Supabase Auth, not in Atlas browser code.

## Verification and CI

Local/source verification:

```bash
npm ci
npm run check
npm audit --omit=dev --audit-level=high
```

`npm run check` runs strict TypeScript, the unit/security suite, and a production Next.js build. Browser E2E smoke coverage lives under `e2e/` and is intended to cover the receptionist-facing login/recovery surface, `/demo`, directionality, representative device sizes, and core synthetic appointment interactions. Authenticated production auth is additionally verified against Supabase auth logs because passkey/email ceremonies cannot be safely automated with real staff identities in public CI.

Production verification after a merge includes:

- GitHub CI green
- Vercel deployment READY
- production `/login` and `/demo` smoke checks
- recent Vercel runtime errors/logs reviewed
- Supabase security/performance advisors reviewed after DDL/security changes
- tenant-isolation SQL smoke test when relevant
- exact production migration version mirrored to source and database types regenerated after schema changes

## Pilot operations

Before any real patient usage, follow [`PILOT_RUNBOOK.md`](PILOT_RUNBOOK.md). The pilot clinic should explicitly agree to the pilot and designate who can provision/offboard staff. Keep only scheduling data that Atlas actually needs.

Minimum operating expectations:

- clinic permission and a named clinic contact
- pre-provisioned receptionist accounts and prompt offboarding when staff leave
- documented recovery path for a lost/replaced device
- custom SMTP tested before relying on email recovery
- clear instruction not to enter diagnoses or medical notes
- known incident contact and ability to pause the pilot
- understanding of Supabase/Vercel backup/recovery capabilities before relying on Atlas operationally
- stop/pause criteria for access-control failures, data mix-ups, unreliable authentication, duplicate reminders, or other patient-impacting defects

## Pilot evidence and metrics

Atlas is technically mature enough that real receptionist evidence matters more than adding endless features. Target at least 5–10 additional receptionist/clinic conversations using synthetic data where possible. Observe hesitation rather than explaining every screen immediately.

Establish baseline and pilot measures for: appointments/day, no-show rate, cancellations, reminder calls/messages, receptionist scheduling workload, appointment-entry time, scheduling corrections, confirmation rate, patient response rate, receptionist/owner satisfaction, continued usage, and willingness to pay.

Do not claim Atlas reduces no-shows until pilot evidence demonstrates it.

## Remaining external blockers

These are intentionally not faked in source code:

- **Production SMTP:** configure and verify a reliable SMTP sender in Supabase Auth before the first real clinic depends on email recovery.
- **WhatsApp production:** Meta verification, production number, approved template, production credentials, webhook registration, scheduler, quotas, and acceptance test.
- **Real-world validation:** additional Erbil receptionist/clinic testing, baseline metrics, clinic agreement, and pilot operational ownership.
