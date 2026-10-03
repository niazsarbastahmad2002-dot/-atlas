# Atlas Vision — public directory boundary (draft)

This is a gated foundation for Atlas patient discovery.

## Invariants

- Existing clinics and doctors are never published automatically.
- A public profile is a separate, intentional record.
- New profile records default to unpublished.
- Only clinic owners/managers can create, edit, publish, unpublish, or delete directory profiles.
- Anonymous/public readers do not receive direct table access. Public reads go through small RPCs that return only intentionally publishable fields.
- Patient data, appointment data, reminder data, clinic membership, operational settings, and internal notes never enter the directory tables or public RPC results.
- Doctor public visibility requires both the clinic profile and doctor profile to be published.
- Live appointment availability is not copied into these profile tables; when added later, it must come from the scheduling source of truth.

## Initial public fields

Clinic: slug, public display name, description, country, city, area, address, coordinates, public phone.

Doctor: clinic-scoped slug, public display name, specialty, subspecialty, bio.

This draft intentionally does not add reviews, ratings, insurance, payments, clinical records, or marketplace ranking.


## Rollout sequence

1. Public clinic + doctor profiles, explicitly published by clinic management.
2. Patient search by doctor, clinic, specialty, and city.
3. Live availability read from Atlas scheduling source-of-truth; never copied into profile records.
4. Patient self-booking with server-side conflict protection and the same clinic/doctor tenant boundary.
5. Booking management from the private patient surface: confirm, cancel, calendar, timing, and later reschedule where clinic rules allow.

## Deliberately deferred

- ratings/reviews and any quality ranking;
- sponsored ranking;
- insurance matching until Atlas has reliable local data;
- payments and financing;
- prescriptions, diagnoses, medical records, or other EMR scope;
- patient accounts unless they solve a concrete workflow better than private appointment links.

The discovery surface should remain useful even before Atlas grows into any of those areas.
