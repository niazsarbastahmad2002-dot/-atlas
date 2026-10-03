# Atlas Vision — share-ready public care profiles

Published clinic and doctor profiles are now designed to travel through the channels patients already use.

## Patient-facing distribution

- Public clinic and doctor pages expose a normal Share action.
- On phones that support the Web Share API, Atlas opens the native share sheet, so patients or clinic staff can choose WhatsApp or another installed app.
- Atlas also exposes a direct WhatsApp share action for browsers where that is clearer.
- If native sharing is unavailable, Atlas copies the public profile URL.
- Shared URLs contain only the public care path. Query strings, patient tokens, appointment tokens, and workspace identifiers are not added.

## Clinic staff distribution

Published profiles can also be shared directly from Atlas public-profile settings. Staff do not need to open the patient-facing page first. Atlas only accepts explicit `/care/...` paths for this control, so a settings action cannot turn into an arbitrary external-link sharer.

## Link previews

Clinic and doctor pages generate metadata from the same public-only RPCs that render the page.

- Published doctor previews use public doctor name, clinic name, specialty/focus, and public bio when available.
- Published clinic previews use the clinic's intentional public name, description, area, and city.
- Missing/unavailable profiles fall back to generic Atlas metadata and noindex.
- No private appointment, patient, staff, or tenant data is used.

## WhatsApp boundary

This is manual link distribution only. It does not call Meta APIs, change Atlas's existing +964 WhatsApp Business setup, alter Coexistence, send a template, or incur provider messaging charges.
