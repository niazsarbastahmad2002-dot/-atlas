# Atlas product contract and progress ledger

Status: 2026-08-19
Purpose: durable source of truth for future Atlas changes. This is not a marketing document. It exists so new work preserves every product decision that has already been earned through testing, user feedback, security hardening, and production incidents.

## Product mission

Atlas is a focused clinic appointment workspace for private clinics in Hawler/Erbil. The first problem is operational: missed appointments, receptionist workload, unclear scheduling, and patient communication. Atlas is not a clinical decision-support system and must not drift into diagnosis or treatment advice.

Product standard: simple enough for a receptionist to use under pressure, safe enough to hold clinic appointment data, readable enough for patients, and localized as a first-class Kurdish/Arabic/English product rather than an English app with translated labels.

## Canonical stack and live systems

- Next.js + React on Vercel.
- Supabase Auth + PostgreSQL with RLS and server-side service-role use only where explicitly justified.
- Production: `https://atlasdemofixed.vercel.app`.
- Supabase project: `moazrwbalqiyoafrydkj` in `ap-southeast-1`.
- Clinic time zone: `Asia/Baghdad`.
- Production deploys come from `main`; feature branches must not exhaust the Vercel Hobby deployment budget.
- CI must typecheck, run unit/security tests, build production, audit production dependencies, and run browser smoke tests before changes are trusted.

## Authentication and access contract

- Email magic-link sign-in is the baseline. Any valid email provider is acceptable; Atlas must not imply that Gmail is required. iCloud/Apple email addresses are valid work emails.
- Passkey/quick sign-in may be offered as a convenience, not as a replacement for secure account ownership.
- Clinic invitations are pending until the invited email account actually completes the sign-in/acceptance flow. Typing an address must never instantly create active receptionist access.
- Receptionists are assigned to a doctor. They may work with that doctor's operational settings and schedule, but may not promote themselves or gain clinic-administration privileges.
- Receptionists must not have appointment-history administration or clinic-access administration.
- Owners/managers control clinic identity, doctor management, staff access, and history administration.
- Literal email addresses must remain LTR and unchanged in every UI locale.

## Scheduling contract

- Appointments are always interpreted/displayed in Baghdad/Erbil time.
- New and edited appointments may not be created in the past.
- The Atlas date picker is the product date control for both appointment creation and appointment editing. Do not regress to a large browser-native calendar as the primary date experience.
- Time is handled separately from date.
- Supported doctor-specific default appointment intervals: 5, 10, 15, 20, 30 minutes.
- Five-minute scheduling includes `00, 05, 10, 15, ... 55`; no five-minute slot may disappear.
- After an appointment is created, the next suggested time for that doctor should advance by that doctor's configured interval.
- A doctor cannot have two appointments at the exact same minute. One minute apart is valid. The database remains the final concurrency guard; UI validation alone is not sufficient.
- Appointment editing uses a simple custom date/time workflow and must not force reception through a giant slot grid.
- Doctor switching and date navigation must preserve the receptionist's working context and must not show stale prefetched settings.
- Settings writes that happen immediately on selection must be race-safe and flushed before leaving settings.

## Appointment status and queue contract

Core statuses are pending, confirmed, cancelled, completed, no-show, and voided/removed according to the database lifecycle.

- Patient confirmation changes pending -> confirmed.
- Patient cancellation changes pending/confirmed -> cancelled according to allowed transitions.
- Reception must see patient status changes without relying on a manual full-page refresh.
- Queue order is calculated per doctor, per Baghdad calendar day, using appointment time and stable tie-breakers. If an earlier active appointment is cancelled/removed, later queue positions must move forward.
- The patient's private page shows the live queue position only while the appointment is active.
- Exact queue/order behavior belongs in the database function, not duplicated client-side.

## Patient-facing appointment contract

The patient page is deliberately simpler than the receptionist dashboard.

- Private tokenized appointment link; it never exposes the clinic schedule.
- Localized from the appointment reminder language: Sorani Kurdish, Arabic, or English.
- Date, time, clinic, and doctor must be large and readable with generous spacing.
- Kurdish day periods use understandable patient-facing words (`پێش نیوەڕۆ` / `دوای نیوەڕۆ`) rather than unexplained abbreviations.
- Show doctor name prominently.
- Show doctor specialty/subspecialty when configured.
- Show the receptionist/contact phone for that doctor when configured, as a tappable phone number.
- Initial patient interaction is a clear primary Confirm Appointment action with cancellation visually secondary.
- Reminder view asks whether the patient will come and offers Yes / Cancel.
- After action, the page states the resulting status clearly.
- Queue number must refer to the correct doctor's queue and update when the queue changes.
- Do not display staff-oriented jargon when ordinary patient wording is available.

## Doctor-specific workflow settings

Doctor operational settings are first-class data, not clinic-wide approximations.

For each doctor Atlas stores:

- appointment interval;
- reminders enabled/desired;
- first reminder lead time;
- optional second reminder lead time;
- default reminder language;
- specialty/subspecialty;
- receptionist/contact phone.

Receptionists may update the assigned doctor's appointment interval, reminder timing/language, reminder preference, and reception contact phone. Clinic administration manages doctor specialty and doctor records. When an administrator has multiple doctors, the selected doctor's settings must remain visibly attributable to that doctor.

## Doctor lifecycle contract

- Removing a doctor from new appointments is a soft operational removal when historical references exist.
- Existing appointment/history integrity must be preserved.
- Old test doctors with no appointments and no staff assignment should not pollute the production UI.
- A restore path may exist for genuinely archived doctors, but it must not render a misleading empty `Removed doctors` control.

## Localization and visual language

Supported interface locales: English, Sorani Kurdish, Arabic.

- Sorani uses Central Kurdish Arabic script and RTL layout.
- Arabic uses RTL layout.
- English uses LTR layout.
- Atlas language is direct and action-led. Buttons say what they do.
- Sorani vocabulary follows the Atlas Sorani language standard and later user-approved corrections.
- The live clock must remain visually stable in RTL: conventional hour:minute order, centered colon, seconds stable, no blinking/pulsing colon.
- Sorani PM abbreviation, where an abbreviation is used, is `پ.ن`, never `ب.ن`.
- Tappable elements must look tappable, selected elements must look selected, and taps must produce clear feedback.
- All essential controls need visible keyboard focus and touch targets appropriate for iPhone/iPad reception use.
- Settings and schedule layouts should avoid large dead rectangles; cards rebalance responsively instead of leaving obvious unused space.
- Respect reduced-motion preferences.

## Receptionist device/browser contract

- iPhone/iPad Safari is a primary target, not an edge case.
- Atlas must recover from a stalled/stale schedule render instead of leaving permanent skeleton cards.
- Chrome may be opened by an email provider or OS association; Atlas itself must not depend on a specific browser.
- Authentication links must return users to a usable Atlas session even when the link opens in a different installed browser.

## History and deletion contract

- Appointment history is an administrative function, not receptionist navigation.
- Removal/voiding must preserve auditability where required by the appointment lifecycle.
- Privacy policy, terms, and data-deletion instructions are part of production, not placeholders.

## WhatsApp reminder contract

The software-side reminder pipeline exists and must remain defensive:

- explicit patient consent;
- doctor-specific reminder settings;
- approved-template sending only;
- per-clinic and global quotas;
- private reminder queue;
- claim leases and stale-claim validation;
- bounded retries;
- signed webhook verification;
- streamed-body size bound;
- idempotent/monotonic delivery-event reconciliation;
- no service-role or WhatsApp access token in browser code.

Provider activation is a separate external state. Atlas must not present WhatsApp as actively sending when Meta has not approved the sending setup.

Current Meta state at this contract revision:

- Atlas can reach Meta's Graph API from production.
- A controlled real send reached Meta and was rejected with `131037` (display-name approval required for the configured sending number).
- Automatic sending is therefore intentionally gated off until provider readiness can be verified.
- The doctor-specific reminder preferences remain stored while the provider is blocked.

Future provider readiness should be machine-audited where possible (phone display-name status, WABA review, template presence/status) and only activate sending when the checks are actually green.

## Appointment sharing / patient communication contract

Manual Share Appointment / Copy Link is a fallback, not the intended final workflow.

The intended production sequence is:

1. receptionist creates appointment;
2. when WhatsApp provider/template approval allows it, Atlas sends the patient an immediate appointment message automatically;
3. patient opens the private appointment experience and confirms/cancels;
4. later doctor-specific reminder(s) ask whether the patient will attend;
5. reception receives live status/queue changes.

WhatsApp cannot continuously mutate an old chat message into a live queue widget. The private Atlas appointment page is the source of live queue state. A WhatsApp Flow may later provide a richer in-WhatsApp interaction once Meta assets are approved.

## Security and privacy invariants

- RLS remains enabled on clinic/product/reminder tables.
- Tenant isolation is enforced in the database and tested against outsider access and cross-clinic attacks.
- Receptionists cannot self-promote.
- Service-role credentials remain server-only.
- Patient links are random/tokenized, rate-limited, revocable/expiring, and expose one appointment only.
- Webhook signatures are verified with the Meta app secret.
- Provider tokens, Vercel tokens, Supabase service keys, and secrets must never be committed, printed in CI diagnostics, or requested in chat.
- Real clinical use should not imply regulatory/privacy certification that Atlas has not obtained.

## Deployment lessons that are now product requirements

- Do not create Vercel builds for every feature-branch commit. It exhausted the Hobby build quota and delayed production releases.
- `main` is the canonical production release path.
- Diagnostic/deployment workflows must redact secrets and should not create repeated doomed deployment attempts.
- Project-scoped Vercel tokens are not a drop-in replacement for account tokens for every Vercel CLI command (notably the failed `vercel pull` path encountered on 2026-08-19).
- A production release is not considered complete until the canonical domain resolves to the intended commit and core routes are verified.

## Quality bar for every future Atlas change

A change is not complete merely because the UI looks right once. It must preserve all applicable contracts above and pass:

1. TypeScript typecheck.
2. Unit/security tests.
3. Production Next.js build.
4. Dependency audit.
5. Browser smoke tests.
6. Database/RLS checks for schema/security-sensitive changes.
7. Production verification after release.

When a new user-approved behavior is introduced, update this contract and add a regression guard where practical. The goal is cumulative quality: Atlas should get harder to regress as it gets better.

## Known unfinished edges

These are not forgotten work; they are explicit remaining edges:

- Meta display-name/provider approval is external and currently blocks production WhatsApp sends.
- Confirm the approved reminder template variants for all supported patient languages before enabling automatic sends.
- Complete the automatic immediate appointment WhatsApp message/Flow after the provider assets are approved; manual sharing remains the fallback until then.
- Populate real doctor specialty and reception-contact data instead of inventing it.
- Keep improving production email deliverability before broad clinic rollout.
- Real-clinic pilot evidence is still limited; product claims about reduced no-shows or saved receptionist time require measured baseline/outcome data.
