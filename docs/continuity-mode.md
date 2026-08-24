# Atlas Continuity Mode v1

Atlas Continuity Mode is a deliberately small, read-only fallback for temporary internet outages.

## Scope

- iOS detects real network loss with `NWPathMonitor`.
- While online, Atlas requests a same-origin, RLS-bound snapshot of the current Baghdad clinic day.
- The iOS app stores one current clinic/account snapshot using iOS complete file protection and excludes it from backups.
- When offline, the native shell covers the web view with an unmistakable read-only screen showing the clinic name, selected doctor, patient name, appointment time, status and queue order from the last successful sync.
- Browser dashboard sessions show an OFFLINE banner and disable form/button interactions, but Atlas does **not** persist identifiable patient data in browser storage, IndexedDB, Cache API or a service worker.
- Reconnection performs a live reload. Cached data is never replayed into Supabase.

## Intentionally not supported offline

- creating, editing, cancelling, confirming or completing appointments;
- changing clinic timing or patient arrival state;
- Smart Fill actions;
- WhatsApp/reminder actions;
- clinic/staff/settings changes;
- any generic offline write or replay queue.

These operations remain server-authorized and continue to use existing RLS, appointment transition checks and unique doctor-slot protections.

## Cached fields

The protected iOS snapshot contains only:

- schema version;
- authenticated user UUID and clinic UUID for cache scoping;
- clinic name;
- current Baghdad day;
- selected doctor UUID/name when applicable;
- last-sync timestamp;
- up to 500 appointment UUIDs, patient names, appointment timestamps, doctor names, operational appointment status and active queue order.

It does **not** cache patient phone numbers, reminder consent/language, message content, clinical notes, auth/session tokens, provider credentials or WhatsApp secrets.

## Cache lifecycle

Only one snapshot is retained. A different authenticated user or clinic replaces/clears the previous scope. Sign-out/auth navigation clears it. No-clinic state clears it. Remote membership removal is enforced on the next server contact; while completely offline no client can learn that a remote membership changed, so snapshots are constrained to the current Baghdad day and fail closed when stale or corrupt.

## Why v1 is read-only

Atlas appointment writes depend on fresh server state, RLS, status-transition checks and the unique active `(clinic_id, doctor_id, appointment_at)` slot constraint. A blind offline replay queue could race newer staff changes or create misleading booking outcomes. v1 therefore provides continuity of visibility, not continuity of mutation.
