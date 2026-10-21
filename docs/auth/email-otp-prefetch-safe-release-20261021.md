# Atlas Email OTP sign-in: code-first, read-only release preparation

**October 21, 2026 · Draft branch only · no Supabase configuration, merge or production deploy performed.**

## Production evidence and risk
- User-supplied Oct 21 Supabase log sequence: `/otp POST 200` 16:04:18 UTC; `/verify GET 303` 16:04:32 UTC; subsequent `/verify GET 303` invalid/expired at 16:04:49; `/verify POST 403 otp_expired` at 16:05:33.
- This supports **prior token consumption**, but logs cannot prove whether Apple Mail preview/prefetch, an email security scanner, the browser, or a user action performed the first verification. Apple Mail preview shows raw Supabase verification URL.
- PR #683's 56/64 token-length fix is present in current main; this does not solve already-consumed one-time tokens.

## In this focused change
- Uses existing /auth/email/complete-link page with a **new email+numeric-code** form and the unchanged manual magic-link fallback behind a disclosure.
- Existing temporary-email server route already calls Supabase `signInWithOtp`; code submission uses existing browser Supabase `verifyOtp({ email, token, type: "email" })`; after verified session, the existing `/auth/activate?next=%2Fdashboard%2Fselect-clinic` checks server-visible user, and never grants clinic membership.
- No new Supabase settings, authorization roles, service-role exposure, database/RLS/clinic memberships, DNS/Meta/WhatsApp/payment changes.
- Code only held in an uncontrolled input and transient function variable. Cleared immediately before network call. No client analytics, state, cookies, URL params, persistent storage or logs containing codes. Generic errors, one request in flight, five per-form attempts; authoritative Supabase verifier additionally rate-limits by IP (default 30 per 5 minutes) and sends are rate-limited (default 60s per user). Client limit is **not a substitute** for provider enforcement.
- English/Sorani/Badini/Iraqi Arabic UI and Arabic-Indic/Persian digit normalization. Mobile/RTL browser tests cover no overflow/invalid-code no request. Public sign-in link points to direct code-entry page without putting the email in URL.

## Critical real provider OTP length: NOT independently verified
- Connected Supabase project: Atlas `moazrwbalqiyoafrydkj`. Supabase project connector returns metadata but does **not** expose Auth `mailer_otp_length`. There is no committed `supabase/config.toml` to establish hosted production configuration.
- Provider docs support **6–10 numeric digits** with default 6; Atlas's actual live value must be read from **its project Auth configuration**, not inferred from docs. UI deliberately accepts 6–10, and `verifyOtp` is the final authority. Release remains **blocked pending authorized read-only confirmation**.
- Owner verification, without sharing an access token: in Supabase Dashboard, inspect Authentication → Providers → Email (OTP length and expiry if shown); if not shown, use authorized read-only Supabase Management API `GET /v1/projects/moazrwbalqiyoafrydkj/config/auth`, inspect `mailer_otp_length` and `mailer_otp_exp`. Do not transmit the Management API bearer credential into Atlas, GitHub, chat, browser logs, or screenshots.

## Template modification: separate founder approval REQUIRED
- Before editing, export/copy the **exact current** Supabase Auth **Magic Link / OTP** email template and subject to secure Atlas Evidence, with secrets/token-bearing emails excluded. No template action is taken by this PR.
- Update **only** the Magic Link email template content once the code-entry page is live and tested: use `{{ .Token }}` to display the numeric code. Replace any direct clickable `{{ .ConfirmationURL }}` link, whose Supabase `/auth/v1/verify` GET can be consumed by email previews, with a **noncredential Atlas destination**, `{{ .SiteURL }}/auth/email/complete-link`, after confirming `SiteURL` is the intended canonical Atlas origin. Alternatively use the verified full Atlas domain, never a token-bearing URL. Neither email preview nor inbox opening should visit a bearer-credential verification URL.
- Suggested structure, **illustrative only; not applied**:
  ```html
  <p>Your Atlas sign-in code:</p>
  <p><strong>{{ .Token }}</strong></p>
  <p>Open Atlas and enter the code:</p>
  <a href="{{ .SiteURL }}/auth/email/complete-link">Enter code in Atlas</a>
  ```
- Preserve other auth email templates unchanged: signup confirmation, invite, recovery/reset password, email change, and any separate reauthentication flows. The affected Magic Link template can serve both existing sign-ins and email OTP; removing the direct verification URL intentionally changes this one sign-in method to **code entry**, reducing prefetch exposure. Do not combine the token code with a still-clickable direct Supabase ConfirmationURL, because that can still consume the same OTP.

## Exact release sequence (all require separate founder authorization)
1. Confirm actual hosted `mailer_otp_length`, expiry, current Mailer template, redirect/Site URL, and email OTP sender rate-limit settings read-only. Save original template securely before authorized edit; review all four translations and security controls. Never expose test codes in logs.
2. Founder approves this **specific** PR and Atlas web deployment. Merge only after green CI and selected real-device checks; deploy Atlas website; verify page loads and existing clinic sign-in routes remain intact. This step alone is not usable for code login until messages actually include `{{ .Token }}`.
3. Founder separately approves **Magic Link template edit** as above; no database or other provider settings changed. Check safe email preview no longer contains a direct `/auth/v1/verify` URL. Request **one fresh** code from Atlas in an authorized existing QA account, observing send rate limit.
4. In same TinyFish authenticated QA browser open `https://atlasclinic.dpdns.org/auth/email/complete-link` directly (without following any email verification URL), enter the account's email and newest numeric code **privately into the form**. Confirm `/auth/activate` and the same clinic selector, no auto-membership/new clinic join. Do not send token-bearing email or screenshots to this chat/third-party browser launcher or preserve request bodies.
5. Confirm 4-language RTL and actual iPad Safari/desktop input and error states. Simulated Chromium CI does not establish real-device success. Observe only redacted provider status, not codes.

## Exact rollback (requires separate founder authorization)
1. Restore the **backed-up original** Supabase Magic Link template + subject first, and test existing fallback delivery. This temporarily restores the original link-prefetch exposure; use only as emergency rollback.
2. Restore the previous production Vercel deployment / revert this focused PR, preserving all unrelated commits and the existing 56/64 fix; verify /login and /auth/email/complete-link, no data/auth/RLS changes.
3. Review anonymized Auth verification status and provider rate limits, do not replay old OTP links. No destructive Auth resets. Record incident and separate follow-up in Atlas Operations.

**Do not release until actual mailer OTP length and authorized template plan are confirmed.**
