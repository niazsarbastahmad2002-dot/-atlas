# Atlas progress ledger

Internal engineering memory. Product behavior should be read together with `ATLAS_PRODUCT_CONTRACT.md`.

## Foundation
- Built Atlas as a private-clinic appointment workspace on Next.js, Supabase and Vercel.
- Established Baghdad/Erbil as the scheduling timezone.
- Added a synthetic demo path so development can be demonstrated without real patient data.
- Added production-ready legal surfaces: privacy policy, terms, and data-deletion instructions.
- Added installable/PWA metadata, Atlas app icon, and the distinctive Atlas `A` visual identity.

## Security and tenancy
- Added clinic/member/appointment tenancy and Row Level Security.
- Added rollback-only tenant isolation and reminder security checks covering outsider access, cross-clinic attacks, lifecycle transitions, consent, leases, bounded retry, and delivery reconciliation.
- Moved sensitive operations behind server boundaries and kept Supabase service credentials server-only.
- Hardened clinic-administrator transfer as a server-only operation.
- Restricted history and permanent-deletion administration to clinic owners/managers.
- Added tokenized, rate-limited, expiring patient appointment links.
- Hardened Meta webhooks with app-secret signatures and bounded body reads.

## Authentication and clinic access
- Established email magic-link sign-in.
- Improved Atlas-branded sign-in and Kurdish typography.
- Added passkey/device convenience without removing email account ownership.
- Built clinic access management and receptionist role boundaries.
- Changed receptionist invitations from instant membership to Pending -> email acceptance -> Active.
- Assigned receptionists to a specific doctor and blocked cross-doctor access/self-promotion.
- Kept literal email addresses stable and LTR in RTL interfaces.

## Schedule and appointment workflow
- Built create/list/status/remove appointment workflow.
- Added polished AM/PM time selection rather than relying on scrolling controls.
- Trimmed quick-hour choices toward common clinic hours while retaining custom time.
- Added 5/10/15/20/30-minute doctor-specific appointment intervals.
- Restored every five-minute choice including 05 and 10.
- Made next suggested appointment time advance from the prior appointment by the selected doctor's interval.
- Added a database-level same-doctor/same-minute double-booking guard.
- Prevented create/edit appointments in the past.
- Simplified appointment editing to custom date/time.
- Restored the Atlas date picker to both create and edit flows rather than using the large browser-native calendar as the main experience.
- Made doctor/date switching fast while preserving working schedule context.
- Added write barriers so instant settings persist before navigation and stale prefetches cannot overwrite newer choices.
- Added optimistic/status interaction feedback while retaining server/database authority.

## Appointment outcomes and queue
- Added pending, confirmed, cancelled, completed, no-show and removed/voided lifecycle handling.
- Allowed reception to close a pending appointment without forcing a fake confirmation step.
- Made patient confirmation/cancellation appear in reception without a manual page reload.
- Stabilized queue ordering with time/creation/id tie-breaks.
- Refined queue behavior to the final doctor-specific, Baghdad-day patient queue.
- Made queue position update when an earlier active appointment leaves the queue.

## Settings and doctor model
- Simplified clinic and doctor name editing to type -> Save.
- Added real doctor-specific workflow settings rather than pretending operational settings are clinic-wide.
- Added doctor specialty/subspecialty and reception contact fields for the patient experience.
- Allowed receptionists to change their assigned doctor's interval/reminder/contact settings while preserving admin-only clinic identity/specialty/access/history controls.
- Cleaned production test doctors that had no appointments and no staff assignment instead of leaving misleading `Removed doctors` clutter.
- Rebalanced receptionist settings so restricted roles do not leave large empty UI regions.

## Patient experience
- Localized patient appointment pages in Sorani Kurdish, Arabic and English from the appointment reminder language.
- Enlarged date/time and doctor identity, increased spacing, and removed staff-oriented abbreviations from patient-facing time labels.
- Added doctor specialty and receptionist phone when configured.
- Added a clear first-step Confirm Appointment action with cancellation visually secondary.
- Added reminder-mode `Will you come?` yes/cancel interaction.
- Added clear post-action confirmed/cancelled/completed/no-show messaging.
- Added the live doctor queue position to the private patient page.
- Kept manual WhatsApp/share/copy-link actions as fallback rather than the intended final communication workflow.

## Localization and interaction design
- Added English, Sorani Kurdish and Arabic interface support with correct LTR/RTL behavior.
- Established a Sorani language standard for natural Hawler-oriented, action-led wording.
- Corrected the Sorani PM abbreviation to `پ.ن` where abbreviations are used.
- Fixed RTL live-clock ordering, colon placement and unstable/blinking clock behavior.
- Added global tap, pressed, selected and focus-visible feedback.
- Added reduced-motion support.
- Added responsive readability/space balancing for schedule and settings.
- Treated iPhone/iPad Safari as a primary receptionist environment and added recovery from stalled/stale schedule renders.

## Analytics and product learning
- Added privacy-safe, allowlisted PostHog analytics through an Atlas server proxy.
- Analytics must not collect patient names, phone numbers, free-text clinical content, tokens or secrets.
- Product outcome claims remain evidence-based: no-show reduction and receptionist-time savings require measured real-clinic pilot data.

## WhatsApp reminder system
- Added explicit patient reminder consent.
- Added clinic/provider activation gate and doctor-specific reminder preference/timing/language.
- Added two-stage reminder support.
- Added private reminder queue, leases, stale-claim validation, bounded retry, clinic/global message quotas, and delivery-event reconciliation.
- Added signed Meta webhook and delivery-state ingestion.
- Added permanent production Meta system-user credentials and webhook configuration without exposing secrets to the browser.
- Published the Meta app and verified Atlas webhook traffic reaches production.
- Diagnosed and fixed an old database trigger that incorrectly used clinic-level reminder language/enable state after doctor-specific settings were introduced.
- Proved the real production scheduler can reach Meta with a controlled send.
- Current provider blocker at the 2026-08-19 checkpoint is Meta error `131037`, so automatic sends remain safely disabled until provider readiness is verified.

## Deployment reliability
- Added CI typecheck/tests/production build/dependency audit/browser smoke checks.
- Added production/preview diagnostics while redacting secrets.
- Investigated project-scoped Vercel token limitations with the CLI.
- Learned that excessive feature-branch deploys exhaust the Hobby rolling deployment budget.
- Disabled automatic Vercel deploys for `atlas-*` feature branches; canonical production releases come from `main`.
- Added production verification as a release requirement instead of assuming a successful merge means a successful live release.

## 2026-08-19 consolidation upgrade
- Added `ATLAS_PRODUCT_CONTRACT.md` as the durable behavioral source of truth.
- Added source-level product contract tests so critical UX/security decisions become regressions rather than memories.
- Added a machine-readable Meta readiness auditor so Atlas can check phone display-name status, WABA access and reminder-template variants itself.
- Added a protected readiness/activation route that can only turn provider sending on after the automated checks are genuinely green.
