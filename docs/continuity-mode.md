# Atlas Continuity Mode

Atlas Continuity Mode keeps the receptionist useful during a temporary internet outage without weakening Atlas's server-side safety rules.

## What works offline

- While online, Atlas requests a same-origin, RLS-bound snapshot of the current Baghdad clinic day.
- iOS keeps its existing protected native snapshot using complete file protection and excludes it from device backups.
- Safari/browser sessions now also keep one encrypted current-day snapshot in IndexedDB. The snapshot is encrypted with a non-extractable AES-GCM key generated on that browser.
- A service worker caches only a static Atlas offline shell. It does **not** cache dashboard responses, API responses, authentication responses or patient data.
- If the receptionist reloads or reopens the dashboard after losing internet, Atlas can show the last protected current-day schedule instead of a browser network error.
- The offline screen shows clinic name, selected doctor, patient name, appointment time, operational status and queue order.
- Reconnection always reloads live Atlas. Cached data is never replayed into Supabase.

## Intentionally not supported offline

- creating, editing, cancelling, confirming or completing appointments;
- changing clinic timing, queue/arrival state or Smart Fill;
- WhatsApp/reminder actions;
- clinic, staff or Settings changes;
- any automatic offline write queue or background replay.

These operations remain server-authorized and continue to use current Supabase RLS, appointment transition checks and the unique active doctor-slot protections.

## Cached fields

The current-day continuity snapshot is deliberately minimal:

- schema version;
- authenticated user UUID and clinic UUID for cache scoping;
- clinic name;
- current Baghdad day;
- selected doctor UUID/name when applicable;
- last-sync timestamp;
- up to 500 appointment UUIDs, patient names, appointment timestamps, doctor names, operational status and active queue order.

It does **not** cache patient phone numbers, reminder consent/language, message content, medical notes, authentication/session tokens, provider credentials or WhatsApp secrets.

The browser service-worker cache contains only the static offline HTML shell. Identifiable schedule data stays in the encrypted IndexedDB snapshot and is never written into the Cache API.

## Browser cache lifecycle

Only one browser snapshot is retained. It is scoped to the signed-in user, clinic and current Baghdad day and fails closed if missing, corrupt, from another day, over the appointment bound or more than 18 hours old.

Login/auth/onboarding navigation clears browser continuity storage. A server response indicating that there is no valid clinic/session also clears it. Remote membership changes are enforced on the next server contact; a completely disconnected device cannot learn about a remote permission change until it reconnects, which is why the browser snapshot is short-lived, current-day only and read-only.

## Why offline changes are not enabled yet

Appointment writes depend on fresh server state. Two receptionists could otherwise create the same slot, change the same patient, or overwrite newer queue/status information while disconnected. Blindly replaying those writes later would make Atlas less trustworthy.

The safe current version therefore provides **continuity of reception visibility**, not silent offline mutation. A future offline-draft workflow could be considered only if every queued change is explicitly reconciled against current server state after reconnect rather than automatically overwriting it.
