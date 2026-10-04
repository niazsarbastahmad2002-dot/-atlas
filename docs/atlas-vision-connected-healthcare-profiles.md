# Atlas Vision — Connected healthcare profiles

## Product direction

Atlas is one healthcare product with distinct identities and permissions for patients, doctors, clinics, and clinic staff.

The useful connection is:

**Patient ↔ Doctor ↔ Clinic ↔ Availability ↔ Appointment**

This is not a social network and it is not an EMR. The goal is to remove repeated identity and scheduling friction while keeping healthcare data private and role-appropriate.

## What exists now

- Clinics have private tenant workspaces and optional public directory profiles.
- Doctors can have public directory profiles associated with a clinic.
- Published doctor profiles connect to clinic profiles and legitimate clinic-controlled availability.
- Patients can discover published care through `/care`.
- Existing appointments can expose private tokenized patient self-service links for appointment actions.
- Public booking infrastructure exists but remains gated by phone-auth readiness and clinic opt-in.

## Important current limitations

Atlas does **not** currently have a reusable private patient profile/account model.

The current doctor model is also clinic-scoped: a doctor record and public doctor directory profile belong to a clinic. That is not yet the long-term clinic-independent professional identity described by Atlas Vision.

The root authenticated experience currently assumes an authenticated Atlas user is entering the professional dashboard. A future patient identity therefore needs an explicit role/capability-aware post-auth route instead of silently reusing the professional redirect.

## Safety rules for the future patient profile

A patient profile must be private by default. Do not place patient profile fields in public directory tables, URLs, browser storage, analytics payloads, or publicly discoverable pages.

The first patient profile should stay minimal: name, verified phone identity, preferred language, and only other fields that clearly reduce appointment friction.

When a patient books, Atlas should copy the minimum appointment-relevant snapshot into the clinic appointment workflow. The clinic must not depend on unrestricted live access to the patient's whole profile.

Profile reuse needs clear user control and auditability. A patient must be able to understand which information is being sent to a clinic.

## Future authorization boundary

The next true patient-identity step requires explicit authorization because it will need consequential schema/auth/tenant-policy design.

That design should cover:

1. A private patient profile owned by an authenticated Atlas identity.
2. A capability model that does not force one permanent role; one person may eventually be both a patient and a healthcare professional.
3. A professional identity that can exist independently of any single clinic, with explicit clinic affiliations.
4. Booking-time data minimization and a durable appointment snapshot for the receiving clinic.
5. RLS/authorization rules, audit events, deletion/export behavior, and tenant-isolation tests.
6. A role-aware entry/router after authentication.

Until that design is approved, Atlas should keep patient discovery public, clinic operations private, and patient appointment self-service tokenized and narrowly scoped.
