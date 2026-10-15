# Atlas Doctor — Clinical workspace phase (design decision draft)

Status: Proposed / not approved for clinical production use
Date: 2026-10-14
Source of truth reviewed: main edf1c2b3ba792e9a2c052aac6a1ecd06d8dcd9ce
Ownership: Atlas Doctor / core clinic operations. Coordinate schema and shared scheduling contracts with Atlas Patient.
No existing route, table or policy is represented here as verified if it is not in the repository.

## Existing routes → proposed page map

1. Doctor Welcome — Existing: /login and first-clinic onboarding; Proposed: focused /doctor welcome (separate from Patient sign-in).
2. Professional Registration — Existing: phone-based Atlas professional account onboarding; Proposed: /doctor/registration, practitioner identity workflow (not clinic creation).
3. Identity Verification — Existing: phone/auth readiness; Proposed: /doctor/verify-identity (document + verified person), no uploaded credentials until private intake approved.
4. Medical License Verification — Existing: none; Proposed: /doctor/verify-license, distinct verification status and jurisdiction.
5. Clinic/Medical Center Registration — Existing: /dashboard first-clinic setup creates a PRIVATE clinic workspace; Proposed: /doctor/clinics/new built on existing tenant creation.
6. Organization Verification — Existing: public profile settings are NOT organization verification; Proposed: /doctor/clinics/verify-org with evidence review.
7. Staff & Permissions — Existing: /dashboard/staff and invite; Proposed: retain route, extend clinician role/assignment with separate clinical-note permissions.
8. Clinic Dashboard — Existing: /dashboard live operations and actionable queue; Proposed: focused overview within /dashboard, preserving fast path to today's schedule.
9. Appointments & Schedule — Existing: /dashboard (day/doctor/clinic, statuses, booking, inline edits); Proposed: retain route and optimize iPad grid and cross-task shortcuts.
10. Patient Administration — Existing: appointment search/phone lookup and /dashboard/history (appointment history); Proposed: /dashboard/patients, clinic-scoped patient index, never a global cross-clinic patient directory.
11. Clinical Visit Workspace — Existing: none; First slice: /dashboard/clinical-preview (NONFUNCTIONAL DESIGN PREVIEW). Future: /dashboard/visits/[encounterId] with verified practitioner guard.
12. Patient History — Existing: /dashboard/history is appointment administration only; Proposed: /dashboard/patients/[clinicPatientId]/history with clinician permissions and separately indexed clinical encounters.
13. Prescriptions & Printing — Existing: none; Proposed: /dashboard/clinical-documents, clinician-signed prescription/referral/test request/visit summary from encounter.
14. Clinic Settings — Existing: /dashboard/settings, account/phone/public profile/availability/reminders; Proposed: retain routes and reorganize identity/business/clinic settings under clear headings.

Also preserve /dashboard/assistant, /dashboard/activity, /dashboard/select-clinic, Atlas Patient /care and /patient-account.
The page count is a roadmap, not a mandate to expose unfinished navigation items.

## Confirmed product/security facts

- Current clinic membership roles observed in source: owner, manager, receptionist. There is not yet a separately verified treating-practitioner role or a clinical-note RLS policy.
- Doctors and appointments are associated with clinic_id; receptionists can be assigned a doctor.
- Existing patient_profiles are patient-owned; private patient appointment accounts link verified patients to appointments. Phone/name matching must NOT be treated as proof of shared clinical identity.
- /dashboard/history is appointment history, not a medical chart.
- Current onboarding explicitly states clinical/business verification and protected document intake are NOT available.
- First slice avoids reading appointments, patient profiles or clinical notes. It cannot accept or save clinical input, and is for clinic administrator design review only; admin review is NOT permission to view future clinical records.

## Proposed entities (DO NOT MIGRATE before explicit approval)

- practitioner_profiles: user_id, legal name, credential review state, per-jurisdiction medical licensing evidence with private storage and audit (independent of Atlas phone sign-in).
- clinic_practitioners: clinic_id + practitioner_id, active assignment/authorization/validity, checked per encounter. A physician can belong to several clinics without inheriting any other clinic's data.
- clinic_patients: clinic_id + clinic_patient_id, explicit identifier, optionally linked to verified patient identity with consent; never join automatically by phone/name. Account identity stays distinct from each clinic's confidential chart.
- clinical_encounters: clinic_id + clinic_patient_id + verified treating practitioner assignment, optional appointment_id, visit start/end/status, author, timestamps. Encounter survives appointment edits or cancellations. Every FK must enforce clinic scope.
- clinical_note_versions: immutable committed versions with structured sections, draft/final/signed/corrected state, author, signed_by, reason for correction, previous_version_id, timestamps. No silent overwrites after signing.
- clinical_orders and clinical_documents: prescription, investigation, referral, summary; authored and signed by verified clinician. Immutable printable artifact with versioned template, clinic logo, clinician identity, local date, signature/stamp approval and verification code where appropriate.
- clinical_access_audit: immutable append-only actor/clinic/patient/encounter/action/time/justification, including view/print/export/correction, without unnecessary raw PHI in logs.

## Permission design before implementation

- Practitioner: access only to encounters for clinics where currently approved and the clinician is assigned/treating under an explicit policy. Allow emergency/break-glass only through separately authorized, audited design.
- Receptionist: appointment logistics and demographics only. No automatic clinical-note, diagnoses, prescription, or full patient-history access.
- Clinic owner/manager: administrative workspace authority does NOT automatically imply clinical-record access.
- Patient: only explicitly released/signed visit documents through a separate secure patient contract; never expose the doctor's confidential entire chart by reusing the appointment token.
- Verification staff: evidence/credential scope separate from clinical data.
- All reads and writes: enforce at database RLS AND on server, using signed-in user, clinic, practitioner assignment and record clinic_id; avoid service-role bypass except narrow audited services. Test cross-clinic and cross-role denial with synthetic fixtures.

## Clinical safety, data life cycle and printing

- Never auto-generate diagnoses, treatments, prescriptions or data. AI may suggest document structure only from clinician-reviewed input; a licensed clinician must validate and sign.
- Autosaved drafts and signed records must be separated. Each final document must clearly identify its clinician, verified clinic, patient identity, encounter date, version, and signed status.
- Corrections are append-only with timestamp, author and reason; original signed content remains accessible to authorized users.
- No clinical data in URLs, analytics, browser storage, client error logs or offline service-worker caches. Protect stored PHI, exports and file links with encryption, least-privilege access, short-lived retrieval and audit.
- Deletion/retention: do not infer a fixed number of years. Set a clinic/jurisdiction retention policy only after legal review of applicable Iraqi/KRG and intended international requirements, age/minor exceptions, litigation holds and erasure rules. Until then disable routine permanent deletion and set a documented hold/review process; never promise indefinite retention without capacity/backup design.
- Logo from an explicitly authorized clinic asset, signature/stamp from a clinician-authorized approved process; never fabricate a medical signature or credential.
- No schema or migration proposed here may deploy before separate permissioned security review and user's explicit approval.

## Phases / quality gates

0. Current audit and page map; preserve completed appointment/reception/Patient features.
1. Current implementation: screenshot-reviewable clinical workspace design preview for clinic administrators with all four languages and desktop/iPad/phone layouts. It contains zero patient/clinical data and no input/save/print action. Standalone branch/PR only, no merge into production without explicit approval.
2. Professional identity / license / organization verification product contracts; protected evidence intake and admin review; separate clinic practitioner assignment. Explicit auth/RLS/database approval required.
3. Clinic-scoped patient index and encounter foundation with real read/write RLS, audit trail, signed versioning, corrections and retention design. Synthetic cross-tenant security tests before any live deployment.
4. Functional clinical note authoring, patient-history review and safe drafts; keyboard-first desktop and native RTL; clinician usability scenarios.
5. Signed document templates, reviewed printing/export, clinic branding and clinician approval; optional AI assistance behind explicit consent with clinician sign-off.
6. Staged real-device validation on iPhone/iPad/desktop; accessibility, Sorani/Badini/Arabic/English review; private pilot before production enablement.

## Approval / verification / Operations

- Source base: GitHub main edf1c2b3ba792e9a2c052aac6a1ecd06d8dcd9ce, 2026-10-14.
- Current production read-only check: exact commit Vercel READY with successful Atlas CI and production smoke (full WebKit/Chromium job detail should be re-read before any subsequent release).
- Pending explicit decisions: clinician identity/verification provider; clinical access model; retention/legal basis; secure evidence storage; data model migration and RLS; controlled production activation.
- Next action after this PR CI: screenshot-review preview UI using non-patient test accounts, resolve review issues and obtain user's explicit approval before merge/production deployment or any migration.
