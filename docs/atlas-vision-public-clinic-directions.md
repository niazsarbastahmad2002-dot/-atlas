# Atlas Vision — public clinic directions

Published clinic profiles can offer a direct Directions action when the clinic has intentionally published a specific address.

## Safety

- A city-only or area-only profile does not show Directions.
- Atlas does not use stored latitude/longitude here because the current clinic profile editor does not yet keep coordinates synchronized atomically when an address changes.
- The destination uses only the already-public address fields.
- No patient location is collected by Atlas.
- No Google Maps JavaScript SDK, API key, or billing integration is added.

## UX

The action uses the standard Google Maps directions URL with `api=1` and a destination string, opens in a new tab/app, and keeps a 48px minimum touch target.
