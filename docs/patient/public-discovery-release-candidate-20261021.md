# Atlas Patient — public discovery release candidate
**Review only · 21 October 2026 · no merge or deployment authorized**

## Baseline
- Unchanged production `main` at creation: `78c46d46bec5759143e8caad9331f6f38a1d5831`.
- Candidate branch: `release/patient-public-discovery-20261021`.
- Source: explicit public-only allowlist from integrated public QA branch/PR #680; no wholesale PR merge, database migrations or private page work.
- `vercel.json` keeps non-`main` branch deployments disabled. Candidate CI uses existing free GitHub Actions.

## Included
- AP01 Welcome `/` (#664)
- AP02 Find Care and AP06 Search Results `/care` (#662, #680): direct search; mobile guide panel stacked; unapproved complaint guidance is not linked even if a flag changes; safe published-specialty fallback.
- AP07 Doctor Profile `/care/[clinicSlug]/[doctorSlug]` (#666)
- AP08 Clinic Details `/care/[clinicSlug]` (#667, #680): only text-address Google directions; no coordinate map pins.
- AP09 Published read-only Availability `/care/[clinicSlug]/[doctorSlug]/times` (#671): genuine 14-day published slots in Baghdad local time, no fake confirmed booking. Preexisting future self-booking links remain protected by both launch and phone-readiness gates, which stay disabled for this release.
- AP15 Explore Clinics `/explore/clinics` (#670)
- AP16 Explore Specialties `/explore/specialties` (#674): published data and clinic-listed focus areas are **not independent professional qualifications**.
- AP17 Explore Locations `/explore/locations` (#675): only published city → area → clinic → doctor hierarchy, capped 30-doctor sample.

## Explicitly excluded
- Patient complaint selection / safety / specialty-routing work #651/#661/#663/#665.
- Patient registration, identity verification, account/profile changes, private appointments and token confirmation #668/#669/#672/#673/AP11.
- Doctor clinical-record preview #650, and any live medical record functionality.
- No SQL/migration, Supabase auth/RLS, DNS, Meta/WhatsApp/Coexistence, payment/OTP, production configuration, or tenant permission changes. Main’s existing Doctor work remains intact.

## Release conditions
1. Full Node 24 typecheck, unit + security suite, Next production build, `npm audit --omit=dev --audit-level=high`, and all Playwright Chromium viewport tests on the same candidate SHA.
2. Actual **physical** iPhone/iPad, desktop and four-language Sorani/Badini/Arabic/English RTL/accessibility/human translation verification.
3. Read-only live verified published providers, clinic addresses and open slot consistency with Doctor scheduling; confirm 30-result sample limit and truthful no-data/error states. Tests using local placeholder Supabase do not establish real published availability.
4. Qualified clinician and native-language reviewer must approve new explanatory specialty copy before production, or exclude that copy from release.
5. Separate explicit founder approval before merging into main or deploying to Atlas production. Complaint guidance, live clinical records, public self-booking and paid OTP remain disabled.
