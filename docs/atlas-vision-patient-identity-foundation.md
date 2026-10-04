# Atlas Vision — patient identity foundation

## Purpose

Atlas patient identity is private infrastructure for faster healthcare booking. It is not a public social profile and it is not an EMR.

A patient identity consists of:

- the authenticated Atlas user identity;
- the verified mobile number held by Supabase Auth;
- a minimal reusable patient profile containing display name and preferred language;
- private durable ownership links to appointments the patient self-books.

## Data boundaries

The verified phone is not copied into `patient_profiles`. `auth.users` remains the authority for phone ownership and confirmation.

The clinic appointment remains a clinic-owned snapshot. Booking copies only the current patient name, verified phone, preferred reminder language, and appointment-specific consent into the existing appointment workflow. Later profile edits do not silently rewrite clinic appointment history.

`patient_profiles` is in the API-exposed schema only so an authenticated patient can eventually manage their own profile. RLS allows a user to see only their own row, and creation/update requires a currently phone-confirmed Iraqi mobile identity.

The durable appointment↔patient account relation is stored in the private schema and is denied to ordinary clients. It can support a future “My appointments” experience without granting direct patient access to clinic appointment tables.

## Booking reuse

The public self-booking flow remains behind `ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED` and production phone-provider readiness.

When enabled:

1. The patient verifies the mobile number through the existing ephemeral Supabase verification client.
2. Atlas fetches that verified identity's private patient profile.
3. Existing name/language values are prefilled; the patient can review or change them.
4. Finalization derives the phone from the verified auth user, not the request body.
5. The appointment snapshot, patient profile, durable ownership link, and private appointment token are committed by trusted server/database code.

## Deliberately not included

- no public patient search or patient directory;
- no clinic membership for patient accounts;
- no diagnoses, medical notes, medications, or EMR data;
- no paid OTP provider activation;
- no automatic role lock that prevents the same Atlas identity from also being a healthcare professional.
