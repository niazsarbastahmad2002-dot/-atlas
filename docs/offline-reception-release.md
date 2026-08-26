# Offline reception release safety

This change keeps Atlas receptionist continuity deliberately read-only.

- The browser service worker caches only the static `/atlas-offline.html` shell.
- The current Baghdad-day schedule is stored separately as an AES-GCM encrypted IndexedDB record after a successful authenticated RLS-bound snapshot request.
- Patient phone numbers, reminder/message fields, auth/session data and provider credentials are excluded.
- Login/auth/onboarding paths clear browser continuity storage.
- The offline view expires/fails closed when stale, corrupt, from another day or over the row bound.
- No offline appointment mutation, write queue or replay path exists.
- Reconnect reloads authoritative Atlas server state.
- Emergency export endpoints remain available but their forms are hidden from everyday Settings to keep clinic administration simple.
