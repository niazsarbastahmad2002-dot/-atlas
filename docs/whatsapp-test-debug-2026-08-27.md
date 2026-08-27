# Atlas isolated WhatsApp OTP test — 2026-08-27

This note records the non-production test findings so the failure is not rediscovered later.

## Observed failure

The iPad test was performed from the immutable Vercel deployment hostname containing `knmrwm3me`. That deployment was built from commit `8ad5fe96` before the isolated-test Supabase origin was added to the Preview CSP.

During the failed UI attempt, the isolated Supabase Auth logs showed readiness `GET /settings` traffic but no phone OTP `POST /otp`. The request therefore failed before Supabase generated an OTP; Meta delivery had not yet been reached.

## Hardening added

- Preview CSP permits both the normal and isolated-test Supabase origins.
- Isolated Preview phone OTP send and verify are now relayed same-origin through `/api/auth/test-supabase`, then forwarded server-to-server to the isolated Supabase `/auth/v1/otp` and `/auth/v1/verify` endpoints using only the test publishable key.
- The relay is 404-blocked in Vercel production and requires `ATLAS_WHATSAPP_MODE=meta_test` plus the isolated-test Supabase flag.
- The browser still lets Supabase own OTP generation, verification, and the resulting session; Atlas only removes the browser-network dependency for this isolated test.
- The first Atlas screen and login now use the same persisted UI-language cookie. English renders LTR; Sorani, Badini, and Iraqi Arabic render RTL. The first screen offers the same four-language picker.
- When WhatsApp is the only test delivery option it is styled as already selected, not as an untapped radio control.

## Safety

No production Supabase Auth setting, production WhatsApp sender/WABA/Coexistence, production reminder queue, DNS, or production-only credential was modified by these changes.
