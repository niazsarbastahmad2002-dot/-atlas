# Atlas Pilot Runbook

This runbook is the operating checklist for a small, controlled Atlas clinic pilot in Erbil/Kurdistan.

Atlas is an appointment and reminder workflow. It is **not** an EMR. Do not enter diagnoses, treatment plans, clinical notes, test results, or other medical-record content into Atlas.

## 1. Pilot entry criteria

Do not begin real patient use until all required items below are true.

### Required before first real appointment

- The clinic has explicitly agreed to the pilot and named one responsible clinic contact.
- The receptionist account is pre-provisioned for the correct clinic.
- The receptionist has completed one successful Atlas sign-in on the clinic device.
- `Open Atlas` / passkey sign-in has been tested on that device.
- Recovery email has been tested through a production SMTP sender. Supabase's development sender is not sufficient for a real clinic dependency.
- The clinic understands that Atlas stores scheduling data only and must not be used for diagnoses or medical notes.
- The clinic knows who can add, change, or remove staff access.
- The pilot team knows how to pause the pilot if authentication, tenant isolation, appointment integrity, or reminders behave incorrectly.

### Required before enabling WhatsApp

Keep `WHATSAPP_ENABLED=false` until all of these are complete:

- verified WhatsApp Business setup and production number
- approved Meta template(s)
- production credentials stored server-side
- webhook registration and verification
- reliable reminder scheduler
- conservative clinic/global quotas
- synthetic end-to-end send/delivery test

Do not enable real WhatsApp sending merely because the application code supports it.

## 2. Receptionist daily workflow

The intended workflow is deliberately simple:

1. Open Atlas.
2. The schedule should open directly when the existing session is valid.
3. If Atlas asks for secure device authentication, use the device prompt.
4. Use work email only for a new device or recovery.
5. Create, confirm, cancel, complete, no-show, edit, or reschedule appointments from the schedule.
6. Use patient reminder consent and reminder language accurately.
7. Never enter diagnoses or clinical notes into patient-name or other scheduling fields.
8. Explicitly sign out only when the device should no longer retain access.

## 3. New device / recovery procedure

If a receptionist loses access or moves to a new device:

1. Open the canonical Atlas site.
2. Choose **New device or recovery**.
3. Enter the already-provisioned clinic work email.
4. Open only the newest Atlas email.
5. Complete the secure link and optional device-security setup.
6. Confirm the correct clinic schedule is shown before entering any appointment.

If recovery email is rate-limited or unavailable, do not repeatedly hammer the send button. Confirm production SMTP health and use the newest valid email already received.

A lost, replaced, or shared device should be treated as an access event. The clinic contact should verify whether the old session must be revoked/offboarded.

## 4. Staff provisioning and offboarding

- Ordinary reception work should not require understanding Atlas authorization roles.
- Administrative roles remain in Settings to enforce access boundaries.
- Provision staff only for the clinic they work for.
- Use the least privilege needed for the job.
- Remove access promptly when a staff member leaves the clinic or no longer needs Atlas.
- Do not remove or demote the clinic owner in a way that leaves the clinic without an owner.
- After offboarding, verify the former staff member cannot reopen the clinic workspace from their previous session/device.

## 5. Data-minimization rules

Store only what the scheduling workflow needs:

- patient name
- Iraqi mobile number
- appointment date/time
- assigned doctor
- appointment status
- reminder language/consent state

Do **not** store:

- diagnoses
- symptoms or examination findings
- medications or treatment plans
- laboratory/imaging results
- free-form clinical notes
- identity-document scans
- unrelated sensitive information

Use `/demo` and invented details for training, demonstrations, screenshots, and product testing whenever real patient data is not necessary.

## 6. Pilot pause / stop criteria

Pause real clinic use immediately if any of these occur:

- Clinic A can see or modify Clinic B data.
- A signed-out/offboarded user can still reach clinic data unexpectedly.
- Appointments disappear, duplicate unexpectedly, or are assigned to the wrong clinic/doctor.
- Authentication repeatedly fails on the clinic's normal device.
- Recovery email cannot be relied on when needed.
- A patient self-service link exposes another appointment or clinic schedule.
- WhatsApp reminders send without consent, duplicate unexpectedly, use the wrong patient/appointment, or send after cancellation/reschedule incorrectly.
- Secrets, raw patient-link tokens, medical notes, or unnecessary patient PII appear in application logs.
- Any other defect could reasonably cause a patient-impacting scheduling mistake.

When paused, keep WhatsApp disabled, preserve evidence/log timestamps, record what happened, and resume only after the cause is understood and the relevant path has been re-tested with synthetic data.

## 7. Acceptance test before first clinic day

Run this with synthetic data on the actual clinic device:

- open Atlas from a fresh browser/device state
- complete recovery email once
- verify the schedule opens
- sign out and verify `Open Atlas` device authentication works
- create an appointment using Iraqi phone formatting
- create appointments for each active doctor
- verify same-doctor/same-slot double-booking protection
- use a normal interval slot and a custom time
- confirm and cancel an appointment
- reopen a cancelled appointment
- edit/reschedule an appointment
- mark an eligible past appointment completed/no-show
- archive/void a test appointment and verify history is retained
- generate a synthetic patient self-service link and test confirm/cancel isolation
- switch English / Sorani Kurdish / Arabic and verify LTR/RTL direction
- verify `/demo` never writes production clinic data

If WhatsApp is not yet activated, stop there. Do not simulate a successful real send in production logs.

## 8. Pilot measurements

Capture a baseline before claiming Atlas improves clinic outcomes. Useful measures include:

- appointments per day
- receptionist time to enter an appointment
- scheduling corrections/reschedules
- cancellation rate
- no-show rate
- reminder calls/messages currently performed manually
- confirmation rate
- patient response rate once reminders are genuinely active
- receptionist satisfaction/friction
- clinic owner satisfaction
- continued weekly use
- willingness to pay

Do not claim Atlas reduces no-shows until pilot evidence supports that claim.

## 9. End-of-day / incident contacts

For the pilot, the clinic should know:

- who owns the Atlas pilot relationship
- who can provision/offboard staff
- who can pause WhatsApp sending
- who can pause the clinic pilot
- where technical incidents are recorded

Atlas should remain easy enough that the receptionist's normal day is schedule-first; this runbook is for the people operating the pilot, not another screen the receptionist has to learn.
