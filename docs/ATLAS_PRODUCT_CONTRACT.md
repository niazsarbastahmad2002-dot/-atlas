# Atlas product contract

Status: 2026-08-24

This is the current product contract, not a history log. Past implementation details belong in Git history or the progress ledger.

## Product mission

Atlas is a focused appointment and patient-communication workspace for private clinics. It reduces receptionist workload, missed appointments and schedule confusion. Atlas is not a diagnostic, prescribing or clinical decision-support system.

Product standard: **simple enough to use under reception pressure, safe enough for clinic appointment data, excellent on iPhone/iPad, and genuinely local in English, Sorani Kurdish, Badini Kurdish and Iraqi Arabic.**

## Simplicity contract

The daily product hierarchy is:

1. **Schedule** — the main workspace.
2. **Add** — the fastest path to a new appointment.
3. **Settings** — doctor workflow, clinic setup and lower-frequency administration.

History, team access, deletion and provider configuration are necessary but are not daily navigation. Keep them behind Settings.

Before adding a new control, page, card or setting, ask:
- Does it solve a distinct user job?
- Is that job common enough to deserve its own surface?
- Can it live inside an existing workflow instead?
- Does it repeat information already visible nearby?

Necessary repetition may remain when two controls do different jobs. Decorative or implementation-driven repetition should be removed.

Habit-forming Atlas means **fast, predictable usefulness**: remember context, make the next action obvious, save quickly, show clear success/failure, and keep the clinic day easy to resume. Do not use streaks, guilt, artificial urgency or dark patterns.

## Canonical stack and release path

- Next.js + React on Vercel.
- Supabase Auth + PostgreSQL.
- Row Level Security is the tenant boundary.
- Clinic scheduling timezone is `Asia/Baghdad`.
- `main` is the canonical production branch.
- A release is complete only after CI passes and the production domain is verified.

## Authentication and clinic access contract

- Atlas's product identity is moving to a verified phone number. Normal product design must not imply that Gmail is required.
- Temporary legacy authentication may remain only as a rollout bridge while the production phone/WhatsApp provider path is not ready.
- Do not activate unfinished WhatsApp authentication merely because the UI exists. Real provider delivery and approved templates are release gates.
- Passkeys may be an optional trusted-device shortcut; they must not become another required concept.
- Authentication proves identity. **Clinic membership is separate authorization.** Signing in never grants a person access to an existing clinic automatically.
- Receptionist access is granted through an explicit invitation and is bound to the intended identity.
- Receptionists are assigned to a doctor and cannot self-promote or administer clinic access/history.
- Owners/managers control clinic identity, doctors, staff access and administrative history.

## Scheduling contract

- Appointments are interpreted and displayed in Baghdad/Erbil time.
- New or edited appointments cannot be created in the past.
- The Atlas date/time controls are the product controls; do not regress to a confusing browser-native scheduling experience.
- Doctor-specific appointment intervals are 5, 10, 15, 20 or 30 minutes.
- Every valid interval choice remains available, including all five-minute choices.
- The next suggested time advances from the doctor's schedule rather than making reception calculate it.
- A doctor cannot have two active appointments at the same exact minute. PostgreSQL remains the concurrency authority.
- Date and doctor navigation must preserve working context and must not show stale settings.
- The schedule should emphasize work still needing attention, not turn every status into a competing dashboard metric.

## Appointment and queue contract

Supported lifecycle states include pending, confirmed, cancelled, completed, no-show and removed/voided according to database rules.

- Patient confirmation/cancellation must reach reception without requiring a manual full reload.
- Queue order is doctor-specific and Baghdad-day-specific with stable database ordering.
- When an earlier active appointment leaves the queue, later positions update.
- Database functions remain the authority for queue/order logic.

## Patient-facing appointment contract

The patient experience is deliberately simpler than the staff experience.

- A private tokenized link exposes one appointment, never the clinic schedule.
- Show clinic, doctor, date and time prominently.
- Show configured specialty and reception/contact phone when useful.
- Confirm is primary; cancellation is secondary.
- Reminder mode asks a simple attendance question.
- Queue information appears only when relevant and must reflect the correct doctor's live queue.
- Use patient language, not receptionist/database terminology.
- No clinical diagnosis, treatment advice or medical notes belong on this surface.

## Doctor workflow contract

Each doctor owns one coherent operational configuration:
- appointment interval;
- patient-facing specialty/subspecialty;
- reception phone;
- reminders enabled/desired;
- first reminder timing;
- optional second reminder timing;
- default reminder language.

These settings should be presented in **one doctor workflow surface**, not scattered across duplicate cards or injected selectors. Advanced provider connection belongs behind progressive disclosure.

Receptionists may change the workflow fields allowed for their assigned doctor. Administration controls doctor identity/specialty and clinic-level access.

## Localization and mobile contract

Supported interface locales: English, Sorani Kurdish, Badini Kurdish and Iraqi Arabic.

- Sorani, Badini and Arabic use RTL layout; English uses LTR.
- Wording is direct and action-led.
- Phone numbers and other inherently LTR identifiers remain stable.
- Time text must remain readable and culturally understandable.
- Essential touch targets and focus states must work well on iPhone/iPad.
- Respect reduced-motion preferences.
- A stalled/stale render must recover rather than strand reception behind permanent loading UI.

## History, deletion and administration contract

- Appointment history is administrative, not primary daily navigation.
- Clinic access is administrative, not primary daily navigation.
- Deleting a clinic must be contextual to the clinic selected from Settings and require explicit confirmation.
- Clinic deletion and Atlas-account deletion are separate concepts unless a future migration deliberately changes that contract transactionally.
- Account deletion must remain available in-app and must never silently orphan security-sensitive identity state.
- Privacy, support, terms and deletion information are production surfaces, not placeholders.

## WhatsApp contract

Atlas may use WhatsApp for patient reminders, invitations and—when fully approved—authentication.

The software must keep:
- explicit patient reminder consent;
- approved-template sending;
- quotas and bounded retries;
- private queues/leases;
- signed webhook verification;
- idempotent delivery reconciliation;
- provider secrets server-only;
- independent kill switches for unfinished capabilities.

**Meta approval is an external release gate.** Atlas may prepare configuration and templates ahead of time, but must not claim live WhatsApp authentication/reminders until a real production sender successfully delivers the intended message flow.

Manual patient-link sharing remains a valid fallback while automated WhatsApp delivery is gated.

## Security and privacy invariants

- RLS remains enabled on clinic/product/reminder data.
- Tenant isolation is enforced in PostgreSQL and tested against outsider/cross-clinic access.
- Receptionists cannot self-promote.
- Service-role/provider credentials stay server-only.
- Patient and invitation links remain random, scoped and limited to their intended resource.
- Webhook signatures are verified.
- Secrets must never be committed, printed in diagnostics or exposed in browser payloads.
- Privacy-safe analytics must not collect patient names, patient phone numbers, OTPs, private links, clinical free text or provider secrets.
- Do not imply regulatory/privacy certification Atlas has not obtained.

## Quality bar for every future Atlas change

A change is complete only when applicable checks pass:

1. TypeScript typecheck.
2. Unit/security regression tests.
3. Production Next.js build.
4. Production dependency audit.
5. Browser smoke tests including phone-size viewport.
6. iOS compile when native shell behavior is affected.
7. Database/RLS checks for schema or authorization changes.
8. Production verification after deployment.

Prefer deleting obsolete paths over leaving hidden compatibility machinery indefinitely. When a new behavior becomes a product decision, update this contract and add a regression guard where practical.

## Current unfinished external edge

Meta sender/template approval remains the main external WhatsApp activation dependency. Atlas should continue improving independently of that gate; when Meta becomes ready, the approved WhatsApp capability should attach to this simpler core rather than forcing another product redesign.
