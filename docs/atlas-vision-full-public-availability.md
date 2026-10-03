# Atlas Vision — full public doctor availability

The doctor profile keeps a compact preview, while a dedicated public times page can show the doctor's complete bounded public schedule for the next 14 days.

## Contract

- Availability comes only from `list_public_doctor_slots`.
- Atlas requests at most 14 days, matching the public scheduling RPC's hard maximum.
- The page never reads the appointments table directly and never uses the service role.
- Times are grouped and rendered in Asia/Baghdad using Atlas's existing localized date/time formatters.
- If the paid phone-verification launch gate is still off, times are read-only and the clinic phone remains the action.
- When verified self-booking is eventually enabled, the same real slot becomes a link into the already-built booking verification flow.
- The route is noindex/follow: it is useful to patients arriving from a doctor profile but does not create duplicate dynamic search pages.
- Slot controls retain a 48px minimum touch target and collapse to two columns on smaller phones.
