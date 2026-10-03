# Atlas Vision — public availability v1 (stacked draft)

This layer is intentionally separate from ordinary receptionist scheduling.

## Why it exists

Atlas production currently protects exact doctor/time double-booking, but it has no explicit doctor-hours source. Empty calendar space is therefore **not** automatically public availability.

## V1 contract

- Clinic management explicitly enables public booking.
- Public-bookable hours are one weekly window per doctor/day.
- Reception can still schedule manually outside those public windows.
- A clinic can close a specific doctor/date without cancelling existing appointments.
- The public slot RPC requires:
  - published clinic profile;
  - published doctor profile;
  - active doctor;
  - clinic public booking enabled;
  - an enabled weekly window;
  - no closed-date exception;
  - the clinic/doctor appointment interval;
  - minimum lead time and booking horizon.
- Returned slots exclude overlapping pending/confirmed appointments.
- No patient or appointment details are exposed.
- V1 uses Atlas's existing operational timezone, Asia/Baghdad. Timezone generalization should be a separate, explicit global-expansion step.

## Deliberately not included yet

- patient self-booking writes;
- payments;
- waitlist/overbooking;
- recurring holiday calendars;
- split shifts or multiple windows in the same weekday;
- ranking or sponsored placement.

The next write step should create an appointment transactionally from one of these slots and let the database remain the final conflict authority.


## Save consistency

A doctor's seven-day public-booking schedule is saved in one database transaction. Atlas does not report a failed weekly save after publishing only part of the submitted week.
