# Atlas Vision — next real opening in doctor discovery

Atlas doctor search can now show the next real public-bookable appointment time for each published doctor.

## Contract

- Discovery still starts from `search_public_doctors`.
- Next availability still comes from `list_public_doctor_slots`.
- The wrapper is `SECURITY INVOKER`; it does not read clinic tables directly and does not gain access beyond the existing public RPCs.
- The lookup is bounded to the same maximum 30 search results and a maximum 14-day availability window.
- Only the earliest real opening is returned for each matched doctor.
- No appointment, patient, staff, or private workspace data is exposed.
- No write occurs.

## Patient experience

When a matched doctor has a real opening, Atlas shows the next available Baghdad date/time directly in the search result. If there is no public opening in the bounded window, Atlas simply omits the availability line rather than implying the doctor is unavailable overall.

## Migration-history correction

The production reschedule read-only fix was applied by Supabase as `20261003202856_patient_reschedule_slots_read_only.sql`. The repository filename is aligned to that exact live version in the same release so future migration replay cannot treat identical SQL as a new migration.
