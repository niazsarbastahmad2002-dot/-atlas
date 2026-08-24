# Atlas progress ledger

Current engineering memory. Read with `ATLAS_PRODUCT_CONTRACT.md`; use Git history for detailed chronology.

## Foundation
- Next.js/React application on Vercel with Supabase Auth/PostgreSQL.
- Baghdad/Erbil scheduling timezone.
- Synthetic demo that avoids real patient data.
- Privacy, terms, support and data-deletion surfaces.
- Installable web/native shell assets and Atlas visual identity.

## Security and tenancy
- Clinic/member/appointment tenancy with Row Level Security.
- Cross-clinic/outsider regression tests.
- Sensitive operations kept behind server boundaries; service credentials remain server-only.
- Server-only administrator transfer.
- Tokenized private patient links.
- Signed/bounded Meta webhook ingestion.
- Privacy-safe analytics allowlist excludes patient names/phones, private tokens, OTPs and clinical free text.

## Authentication and clinic access
- Phone-number authentication migration exists with runtime readiness gates and temporary legacy access for rollout safety.
- Direct WhatsApp OTP architecture is prepared separately but remains gated until real Meta sender/template approval and live delivery testing.
- Passkeys are optional trusted-device convenience.
- Authentication and clinic membership remain separate.
- Receptionists use explicit invitations, assigned-doctor boundaries and cannot self-promote.
- Clinic administration controls access and history.

## Schedule
- Appointment create/edit/status/remove workflow.
- Atlas date/time controls with 5/10/15/20/30-minute doctor intervals.
- Database same-doctor/same-minute double-booking guard.
- No creating/editing appointments in the past.
- Next-time suggestion follows the doctor's schedule.
- Doctor/date navigation preserves working context.
- Fast booking confirmation/feedback remains part of the daily loop.

## Queue and patient experience
- Pending, confirmed, cancelled, completed, no-show and removed/voided lifecycle support.
- Live patient confirmation/cancellation updates for reception.
- Stable doctor/day queue ordering and queue-position updates.
- Private patient page with clear clinic/doctor/date/time, optional specialty/contact, simple confirm/cancel and relevant queue state.
- Patient surface remains operational, not clinical decision support.

## Doctor workflow and Settings
- Doctor-specific interval, reminder timing/language, specialty and reception contact are first-class data.
- 2026-08-24 simplicity pass consolidated these into **one Doctor workflow card**.
- Removed duplicate interval/details/reminder Settings cards.
- Removed multiple DOM/MutationObserver patch layers that injected doctor selection, history links, time restrictions and Settings polish after render.
- Removed duplicate Settings footer and duplicate receptionist-invite form page.
- Rare tools now live behind Settings: Team access, Appointment history, clinic deletion, account deletion and provider configuration.
- Clinic deletion is contextual to the clinic selected from Settings.

## Product hierarchy
Actual product telemetry shows the strongest use around Login, Schedule and Settings. Atlas now reflects that:
- primary navigation: Schedule, Add, Settings;
- Schedule is the daily home;
- administration is secondary;
- signed-in users skip the public introduction;
- signed-out visitors get one small introduction with one primary Open Atlas action.

The product should be habit-forming through speed, obvious next actions and reliable feedback—not engagement tricks.

## Localization and devices
- English, Sorani Kurdish, Badini Kurdish and Iraqi Arabic.
- Correct LTR/RTL behavior and localized time/digits.
- iPhone/iPad Safari treated as a primary reception environment.
- Reduced-motion, focus and touch feedback supported.
- Native shell remains aligned with the web product and invitation deep links.

## WhatsApp
- Reminder infrastructure includes consent, doctor-specific settings, queues/leases, bounded retry, quotas and delivery reconciliation.
- Meta provider state remains externally gated; automatic capabilities must not claim readiness before real live delivery succeeds.
- Manual patient sharing remains a fallback.
- Prepared direct WhatsApp login/invitation work should attach to the simplified core after Meta approval rather than redesigning the product again.

## Analytics and product learning
- PostHog ingestion is proxied through Atlas and schema-allowlisted.
- Screen telemetry is used directionally to simplify the product, not to collect patient behavior/clinical data.
- Claims such as reduced no-shows or saved receptionist time require real-clinic pilot evidence.

## Deployment reliability
- CI covers TypeScript, unit/security regressions, production build, dependency audit and browser smoke testing.
- iOS compile is checked for native changes.
- `main` is the canonical production release branch.
- Production verification is required after merge.
- Avoid unnecessary feature-branch Vercel builds that waste the project deployment budget.

## 2026-08-24 simplicity upgrade
- Removed more code than was added: duplicated Settings components and hidden patch layers were deleted rather than merely hidden.
- Consolidated doctor workflow into one coherent surface.
- Simplified the signed-out introduction.
- Kept both schedule date controls after review because they serve different jobs: day-by-day movement and direct booked-day jumps.
- Reduced repeated schedule metrics/appointment metadata while retaining underlying actions and detail editing.
- Added `tests/simple-core.test.ts` so the simplified hierarchy is a regression-protected product rule.

## Remaining external edge
Meta sender/template approval and real production WhatsApp delivery remain the main external activation dependency. Atlas product work should continue independently until that gate clears.
