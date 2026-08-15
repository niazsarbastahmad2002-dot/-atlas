# Atlas

Atlas is a focused Next.js and Supabase appointment workflow for small clinics. The working interface is English/LTR, with locale, direction, calendar, and timezone settings centralized in `lib/i18n/config.ts` so Sorani Kurdish/RTL can be restored without redesigning the application.

## Pilot feature set

- Magic-link authentication with protected clinic workspaces and explicit sign-out.
- Owner, manager, and receptionist roles with owner-only staff membership controls.
- Doctor add/edit/archive/restore/order management.
- Iraqi mobile normalization (`0750 123 4567` → `+9647501234567`).
- Pending, confirmed, cancelled, completed, no-show, and retained-history void/archive appointment semantics.
- Clinic scheduling intervals of 5/10/15/20/30 minutes, interval-aware slot selection, doctor-specific double-booking protection, and custom time override.
- Per-patient reminder language (Sorani Kurdish, Arabic, or English), with remembered receptionist doctor/language preferences on the local browser.
- Secure expiring patient self-service links that expose only the linked appointment and allow only permitted confirm/cancel transitions.
- WhatsApp reminder queue, retries, idempotency, approved-template gating, signed webhook handling, delivery tracking, consent gating, and clinic reminder settings.
- Synthetic `/demo` environment that never connects to Supabase.
- GitHub CI for strict TypeScript, tests, production build, and high-severity production dependency audit.

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

- A production SMTP provider/credentials for reliable real-staff magic-link delivery.
- Meta/WhatsApp verification, approved production template, provider credentials, webhook registration, and a trusted five-minute scheduler.
- Real-world validation with Erbil clinic owners/receptionists, including baseline no-show rate and receptionist scheduling workload.

## Production

The canonical production URL is [atlasdemofixed.vercel.app](https://atlasdemofixed.vercel.app).
