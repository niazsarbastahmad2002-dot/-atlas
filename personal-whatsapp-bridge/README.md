# Personal WhatsApp Bridge

This is a deliberately separate service for the user's personal ChatGPT → WhatsApp workflow.

## Isolation guarantees

- Does not import Atlas Clinic reminder, patient, appointment, or production Auth code.
- Uses only `PERSONAL_*` environment variables.
- Requires a non-empty explicit recipient allowlist.
- Production sending is disabled unless both `PERSONAL_WHATSAPP_ENABLED=true` and `PERSONAL_WHATSAPP_ALLOW_PRODUCTION=true` are set.
- The direct `/api/send` route requires a long bearer secret.
- The `/api/mcp` route requires OAuth and a single allowed Supabase user ID.
- OAuth uses only the isolated `Atlas WhatsApp Auth Test` Supabase project during testing.

## Vercel deployment

Create a **new Vercel project** from the existing GitHub repository and set:

- Branch: `feat/personal-whatsapp-standalone`
- Root Directory: `personal-whatsapp-bridge`

Do not attach this service to the Atlas Clinic production domain.

Start in Preview with `PERSONAL_WHATSAPP_ALLOW_PRODUCTION=false`.

## Required environment variables

See `.env.example`. Real tokens and secrets must exist only in Vercel.

For the current Meta sandbox proof, copy only the isolated Meta test credentials into the new `PERSONAL_META_*` variables. Never copy Atlas production sender credentials.

## OAuth

The MCP server expects the isolated Supabase OAuth authorization server. Once this service has its own URL, update the test Supabase project Site URL to the standalone service and keep Authorization Path as `/oauth/consent`.

The OAuth-controlled MCP write action is ready for a ChatGPT workspace that supports full MCP write actions. Personal ChatGPT plans currently do not support attaching a custom write MCP app.

## Tool behavior

The MCP tool is `send_whatsapp_message(recipientPhone, message)`.

It is described as an external write action and must only be used after an explicit request to send. Drafting or discussing a message must never call the tool.
