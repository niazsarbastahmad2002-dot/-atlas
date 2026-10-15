# Atlas Patient–Doctor integration review (15 October 2026)

**Development only. Never merge, deploy, activate clinical guidance, or change infrastructure without separate founder approval.**

## Baseline and ownership

- Main at branch creation: `78c46d46bec5759143e8caad9331f6f38a1d5831` (Doctor work #652–#660 already merged and previously deployed; do not rebuild it).
- Integration branch: `integration/ap-ad-pages-20261015-review`.
- Patient and Doctor use the **same public published-provider/availability contracts**, not a separate directory or clinic database.
- Patient sessions are distinct from staff/clinic sessions. Patient signup never creates clinic membership.
- Published public discovery is limited to an existing 30-row search sample; locations and focus areas are clinic-submitted, **not independently verified**.
- Public appointment times come from the existing published, bounded slots RPC; display does **not** reserve or confirm a booking.

## Canonical Patient page map

| AP | Screen | Actual route and journey | Integration source |
|---|---|---|---|
| 01 | Welcome | `/` → Find Care or Doctor Workspace | #664 |
| 02 | Find Care | `/care` → direct search or gated complaint entry | #662; replace redundant #651 entry |
| 03 | Complaints | `/care/complaints` → select grouped concern | #651 + #661 |
| 04 | Questions | `/care/complaints/questions` → one safety warning; yes/unsure block | #651 + #663 |
| 05 | Suggested specialties | `/care/complaints/specialties` → published matches only | #651 + #665 |
| 06 | Doctor search results | **Existing `/care`**, with query/city/specialty filters | Existing main; #662 must preserve |
| 07 | Doctor profile | `/care/[clinicSlug]/[doctorSlug]` | #666 |
| 08 | Clinic/location profile | `/care/[clinicSlug]` | #667 |
| 09 | Read-only availability | `/care/[clinicSlug]/[doctorSlug]/times` | #671 |
| 10 | Registration | `/patient-register` → shared gated verification form | #669 |
| 11 | Verification | **Shared form within `/patient-account` and `/patient-register`**; no separate public verification route | `feat/patient-verification-page-11` + #669 |
| 12 | Confirmation | `/patient/[token]` authenticated/token-scoped record-backed confirmation; booking endpoint remains disabled | #672 |
| 13 | My Appointments | `/patient-account` → Upcoming / Past / Cancelled | #673 |
| 14 | Patient profile | **Same `/patient-account`**, private edit form | #668 |
| 15 | Explore Clinics | `/explore/clinics` → published clinic profile | #670 |
| 16 | Specialties | `/explore/specialties` → published doctor search | #674 |
| 17 | Cities and locations | `/explore/locations` → published city → area → clinic → doctor | #675 |

Routes are shared intentionally: AP 02/06 and AP 13/14 are different views of the same underlying route, not duplicated databases or independent authentication.

## Integration resolutions

1. **Find Care #651/#662:** keep the clear two-path landing from #662, leave #651 duplicate complaint card out. Server `ATLAS_PATIENT_COMPLAINT_GUIDE_ENABLED` is OFF by default; all complaint routes use server-side denial and `noindex`. Do **not** enable.
2. **Complaints #651/#661/#663/#665:** preserve grouped concern selection, safer Yes/No/Unsure handling (uncertain blocks), comparison, public-only specialty links and four-language review flags. This is a **clinical-review prototype, not triage advice**.
3. **Account #668/#669/#673 + AP11:** preserve session ownership, private appointment RPC, My Appointments status split, Edit Profile shortcut, gated registration and the **same** OTP/session implementation. No new OTP provider or auth/RLS changes.
4. **Explore #670/#674/#675:** combine clinic search, explanatory specialty cards and city-area hierarchy while using one existing published-only RPC and no invented providers, credential verification or geocoding.
5. **Doctor preview #650:** data-free interface **only**; no clinical record persistence, print/API or new permissions. Deployed Doctor UI #652–#660 stays from main.
6. **Scheduling/confirmation:** public availability remains read-only; no self-booking, paid OTP or new appointment rule. Token-scoped appointment confirmation is not a public write capability.

## Release blockers and QA

- Qualified clinical review, with **separate English, Sorani, Badini and Iraqi Arabic review** of every complaint/safety/specialty statement. Keep flag OFF.
- Clinical-record security, role permissions, consent, retention, audit-log and cross-tenant threat review before implementing real records (not part of this branch).
- Integrated Node 24 typecheck, unit/security tests, production build, dependency audit and Chromium Playwright smoke must pass on this **combined commit**; passing PR CI does not establish integration success.
- Verify published actual doctor availability using authorized **non-patient** test data. No invented slots or test writes to production.
- Human visual/accessibility reviews on **physical** iPhone and iPad plus desktop, EN/Sorani/Badini/Arabic, RTL and mixed scripts, account login states, clinic/Doctor flow.
- Founder separate approval required before merging/deploying. No schema, auth, RLS, DNS, Meta/WhatsApp/Coexistence, subscription or live patient data changes in this work.
