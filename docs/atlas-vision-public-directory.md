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
