# Atlas

Atlas is a focused Next.js and Supabase appointment workflow for small clinics. The daily product is designed around the receptionist: open Atlas, see the schedule, make the change, move on.

## Pilot feature set

- Receptionist-first passwordless authentication: first access on a device uses work email + a 6-digit email verification code; a valid session then opens Atlas directly on later visits.
- Administrative clinic membership controls remain behind Settings and are not part of the receptionist's daily workflow.
- Doctor add/edit/archive/restore/order management.
- Iraqi mobile normalization (`0750 123 4567` → `+9647501234567`).
- Pending, confirmed, cancelled, completed, no-show, and retained-history void/archive appointment semantics.
- Clinic scheduling intervals of 5/10/15/20/30 minutes, interval-aware slot selection, doctor-specific double-booking protection, and custom time override.
- Per-patient reminder language (Sorani Kurdish, Arabic, or English), with remembered receptionist doctor/language preferences on the local browser.
- Secure expiring patient self-service links that expose only the linked appointment and allow only permitted confirm/cancel transitions.
- WhatsApp reminder queue, retries, idempotency, approved-template gating, signed webhook handling, delivery tracking, consent gating, and clinic reminder settings.
- Synthetic `/demo` environment that never connects to Supabase.
- GitHub CI for strict TypeScript, tests, production build, and high-severity production dependency audit.

## Authentication UX

Atlas deliberately avoids presenting receptionists with a menu of authentication methods.

1. A clinic administrator adds the receptionist's work email once in Settings > Staff. This pre-creates the Atlas account and clinic membership.
2. On a device with no Atlas session, the receptionist enters that work email and receives a 6-digit verification code.
3. They type the code into the same Atlas screen and enter the schedule.
4. Supabase's persisted session keeps normal later visits frictionless: opening Atlas goes directly to the workspace until the receptionist explicitly signs out, clears browser data, or the session is otherwise invalidated.

For hosted Supabase, the **Magic Link / OTP** email template must use `{{ .Token }}` rather than `{{ .ConfirmationURL }}` so the email displays the six-digit code. The application requests OTP only for pre-provisioned users (`shouldCreateUser: false`).

## Safety status

- `/demo` is browser-memory-only and never connects to Supabase.
- Use invented details for product testing until a clinic has completed its own privacy, operations, and staff review.
- Atlas stores scheduling details only. Do not enter diagnoses, medical notes, or other unnecessary health information.
- No claim of healthcare, privacy, or regulatory compliance is made.
- RLS is enabled on tenant/privacy-sensitive tables; `supabase/tenant_isolation_smoke_test.sql` verifies member access, outsider isolation, and write behavior transactionally with rollback.

## Local verification

```bash
npm ci
npm run check
npm audit --omit=dev
```

`npm run check` runs strict TypeScript, the unit/integration test suite, and a production Next.js build. Database security and tenant isolation are tested transactionally with `supabase/tenant_isolation_smoke_test.sql`; it always rolls back synthetic fixtures.

## Environment

Copy `.env.example` and populate it through secure environment-variable management. Never expose `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, or any WhatsApp secret to browser code.

## WhatsApp activation

The queue, scheduling triggers, bounded retry handling, idempotency, approved-template sender, delivery tracking, and signed webhook endpoint are implemented but disabled by default. Production activation requires:

1. A verified WhatsApp Business Cloud API number and an approved template with exactly two body parameters: clinic name and appointment date/time.
2. Server-only WhatsApp and Supabase secret variables from `.env.example` plus a high-entropy `CRON_SECRET`.
3. Meta webhook callback `https://atlasdemofixed.vercel.app/api/whatsapp/webhook` subscribed to message status events.
4. An authenticated call to `/api/cron/reminders` every five minutes. On Vercel Pro this can be a Vercel Cron; otherwise use Supabase Cron or another trusted scheduler. The request must use `Authorization: Bearer $CRON_SECRET`.
5. Set a conservative `WHATSAPP_GLOBAL_DAILY_LIMIT`. Approve each clinic server-side by setting `messaging_approved_at` and its `daily_message_limit`; clinic users cannot approve themselves.
6. Set `WHATSAPP_ENABLED=true` only after a synthetic acceptance test succeeds. Reminders are scheduled only when staff record the patient's explicit reminder consent.

No raw webhook payload, inbound message body, patient name, or medical detail is stored in reminder tables or emitted to application logs.

## External activation blockers

These are intentionally not faked in source code:

- The hosted Supabase Magic Link / OTP template must display `{{ .Token }}` for the receptionist verification-code experience.
- A production SMTP provider/credentials is still recommended before real-clinic rollout for reliable staff authentication email delivery.
- Meta/WhatsApp verification, approved production template, provider credentials, webhook registration, and a trusted five-minute scheduler.
- Real-world validation with Erbil clinic receptionists, including baseline no-show rate and receptionist scheduling workload.

## Production

The canonical production URL is [atlasdemofixed.vercel.app](https://atlasdemofixed.vercel.app).
