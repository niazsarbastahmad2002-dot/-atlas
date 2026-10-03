# Atlas Vision — patient clinic directions

A valid private appointment link can now show directions when the clinic has explicitly published location information in Atlas.

## Privacy and tenant boundary

- The patient page never reads directory tables directly.
- A dedicated service-role-only RPC validates the private appointment token.
- Anonymous and ordinary authenticated clients cannot execute the location RPC.
- The RPC returns only the clinic's intentionally publishable address fields.
- An unpublished clinic directory draft is never exposed through a patient link.
- The location RPC is optional enrichment: an error or missing location never makes the appointment page unavailable.

## Directions

Atlas only shows Directions when the clinic has published a specific street/address value. Area and city add context, but a city-only profile does not produce a directions action. Coordinates are deliberately excluded from this patient RPC until Atlas has an atomic clinic UI for keeping coordinates synchronized with address edits.

The UI opens Google Maps with the standard cross-platform Maps URL format using `api=1` and a destination parameter. No Maps JavaScript API, API key, SDK, billing integration, or location tracking is added.

## Product behavior

The directions action lives with the clinic/contact details on the private appointment page and keeps a 48px minimum mobile tap target. It does not expose the patient's location or request an origin; Google Maps can choose the user's relevant starting location after the user opens the link.
