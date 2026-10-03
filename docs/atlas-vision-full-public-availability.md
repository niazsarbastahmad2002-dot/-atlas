# Atlas Vision — full public doctor availability

The doctor profile keeps a compact preview, while a dedicated public times page can show the doctor's complete bounded public schedule for the next 14 days.

## Contract

- Availability comes from the cursor-paginated `list_public_doctor_slots_page` contract.
- Atlas requests at most 14 days and at most 200 slots per database response.
- The page never reads the appointments table directly and never uses the service role.
- Times are grouped and rendered in Asia/Baghdad using Atlas's existing localized date/time formatters.
- If the paid phone-verification launch gate is still off, times are read-only and the clinic phone remains the action.
- When verified self-booking is eventually enabled, the same real slot becomes a link into the already-built booking verification flow.
- The route is noindex/follow: it is useful to patients arriving from a doctor profile but does not create duplicate dynamic search pages.
- Slot controls retain a 48px minimum touch target and collapse to two columns on smaller phones.


## Complete-window data contract

The full-schedule page does not assume that one 200-row response contains the whole 14-day window. It walks the public slot list with a strict timestamp cursor, 200 rows at a time, until the next page is shorter than 200. The page has a 24-page fail-closed ceiling; under Atlas's current one-window-per-weekday and 5-minute minimum interval constraints, a 14-day schedule cannot reach that ceiling. Each response still exposes only open slot timestamps and the appointment interval.
