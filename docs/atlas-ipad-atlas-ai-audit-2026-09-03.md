# Atlas iPad + Atlas AI regression audit — 2026-09-03

## Real-device findings

The iPad screenshots are treated as runtime truth. Three user-visible inconsistencies were confirmed against the current source:

1. Settings icons were standalone in light mode but could regain a dark tile.
2. The ordinary appointment Remove action was red in light mode but appeared neutral in dark mode.
3. Re-tapping the active Schedule topbar item while already on the same schedule did not reliably return to the top.

Atlas AI was also reviewed end to end because recent responsive/theme work made the experience feel regressed.

## Settings icon root cause

`app/atlas-dark-icon-polish.css` was an older dark-mode patch whose explicit purpose was to create low-glare icon *tiles*. It still applied `background`, `border`, and inset shadow with `!important` to `.settings-card-icon` in dark and system-dark themes.

Newer responsive icon cleanup removed those containers only inside pointer-capability media rules. An iPad with a keyboard/trackpad can report pointer capabilities differently, so the old dark tile could win even though the same iPad looked correct in light mode.

Fix: remove the tile at its source in the dark-mode stylesheet. The Settings symbol keeps its dark-mode accent color, but its container is now transparent, borderless, and shadowless regardless of pointer capability.

## Appointment Remove action

`app/dashboard/appointment-actions.tsx` still contains an older light-theme red tint for `.appointment-remove-action`. The action already has a native confirmation gate before archive, and the user prefers the ordinary visible action to remain neutral until that confirmation.

Fix: a dashboard action policy makes the visible Remove action use the same neutral Atlas secondary treatment across light/dark/system themes. `window.confirm(workflow.removeQuestion)` remains the destructive safety gate. True account/clinic deletion surfaces are unchanged.

## Schedule re-tap root cause

`AppNavigation` routes the topbar Schedule link through `router.push(..., { scroll: true })`. A same-route/same-query push is not a reliable scroll-to-top signal. The previous responsive batch added an explicit same-document handler only for `.app-bottom-nav`, so the topbar had no equivalent behavior.

Fix: `ScheduleNavigationReset` handles brand/topbar/bottom navigation consistently. When the destination is the exact current `/dashboard` path + query and has no hash, it preserves the clinic/day/doctor query and performs an explicit smooth `window.scrollTo({ top: 0 })`. Cross-route navigation is untouched. No timing delay is used.

## Atlas AI source/history audit

Current active entry point before this batch:

- `atlas-ai-client.tsx` -> V5
- V5 wrapped the stable V4 voice/chat client and added tables + Sorani DOM polish
- V6 existed in Git history but was not the active entry point

Relevant history:

- V4: live recording/transcription visibility
- V5: receptionist-friendly markdown tables and Sorani onboarding polish
- V6: additional Sorani onboarding experiments, not active in production

The stable V4 core already has important reliability protections:

- synchronous `loadingRef` duplicate-send guard
- disabled composer/send controls while busy
- explicit loading/error states
- bounded message history sent to the server
- authenticated server transcription
- PCM capture rather than browser speech-recognition dependence
- voice interruption/retry/end states

The Atlas AI server route was also audited. It already enforces authentication, clinic membership, receptionist doctor scoping, rate limiting, patient-record boundaries, locale resolution, local record answers, model fallback, Kurdish refinement checks, and an Atlas Core fallback. Production runtime error clustering showed no `/api/atlas-ai` or `/api/atlas-ai/transcribe` runtime error cluster in the available retention window.

### Client regressions found

V5 had three fragile/polish issues worth fixing without rewriting the stable core:

1. Its Sorani preset helper used a zero-delay `setTimeout` to submit after imperatively updating a controlled textarea.
2. Its generated table wrapper hardcoded a white background, which is not theme-safe.
3. The Atlas AI page header still hardcoded English `Schedule`, `Clinic`, and `Switch` copy even when Atlas itself was Kurdish/Arabic.

Fix: keep V4 as the stable core, consolidate V5 enhancement work into one MutationObserver, use a microtask after the React input event rather than an arbitrary timer, use theme surface variables for tables, preserve the seven useful Sorani starter questions, improve phone/iPad touch and overflow behavior, and localize the page controls through Atlas `uiText`.

## OpenAI/API decision

The current primary external model path intentionally uses the Vercel AI Gateway OpenAI-compatible chat-completions interface, with Cloudflare models and Atlas Core as fallbacks. OpenAI's current API also supports the Responses API and conversation state, but a provider/API migration is not required to fix the observed Atlas regressions and would add deployment risk without evidence of a server failure. This batch therefore keeps the proven server/model contract and upgrades the client/reliability layer around it.

Official reference reviewed: https://developers.openai.com/api/reference/resources/responses/methods/create

## Scope kept unchanged

- No production secrets changed.
- No Supabase permissions changed.
- No WhatsApp production systems changed.
- No clinic data-access boundary changed.
- No voice transcription provider/security boundary changed.
- Desktop behavior is preserved except shared consistency fixes.
