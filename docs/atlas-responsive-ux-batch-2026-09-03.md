# Atlas responsive UX batch — 2026-09-03

This batch is driven by real-device phone and iPad screenshots.

## Root causes found

- iPad search/icon sharing stopped at a `900px` CSS breakpoint. Larger iPads therefore had the search DOM but no visible search styling.
- The iPad appointment summary only had four server-rendered metrics, leaving a large unused horizontal region on landscape tablets.
- The `+` beside the New Appointment heading was a decorative `composer-shortcut`, not an action, so it looked tappable without doing anything.
- Dashboard notices came from an English-only message table, which is why Kurdish Atlas displayed `Appointment saved.`.
- A successful appointment redirect preserved the day/doctor but did not carry a deterministic target for the appointment that had just been created.
- Reopening `/` did not run the Supabase refresh proxy. Dashboard and login did, but the home route that decides whether to redirect a signed-in user did not.
- Repeated bottom-nav taps on the already-open dashboard depended on Next navigation to the same URL/hash. Same-document scrolling is now handled explicitly instead.

## Responsive decisions

- Keep compact expandable appointment rows phone-only.
- Share appointment search with touch iPads.
- Use six summary cards only on tablet/iPad-sized touch layouts: total, pending, confirmed, completed, no-show, cancelled.
- Keep one standalone icon language across phone/iPad and light/dark modes; no decorative square/circle containers.
- Remove the misleading decorative New Appointment plus on handheld layouts.
