# ChatGPT personal WhatsApp sandbox

This Meta-test branch contains an isolated proof-of-concept for the user flow:

> “Send Ahmed on WhatsApp: I’ll be there at 7.”

It is designed to prove ChatGPT -> Atlas MCP bridge -> Meta WhatsApp Cloud API without changing Atlas production WhatsApp, the real clinic sender, clinic Coexistence, DNS, or Supabase production Auth.

## What is implemented

- `POST /api/whatsapp/personal/send`
  - separate bearer-secret test bridge
  - Vercel Production hard-block
  - requires `ATLAS_WHATSAPP_MODE=meta_test`
  - requires the existing Meta/Atlas test-recipient allowlist
  - calls the existing `sendWhatsAppTextMessage()` transport
- `/api/mcp/whatsapp-test`
  - dependency-free MCP Streamable HTTP / JSON-RPC endpoint
  - exposes exactly one external write action: `send_whatsapp_message`
  - accepts an already-resolved Iraqi E.164 recipient and message text
  - Vercel Production hard-block
  - Meta-test-only transport and recipient allowlist
  - validates request `Origin` when present
  - verifies OAuth access tokens against the isolated Atlas WhatsApp Auth Test Supabase project
  - permits only the exact configured test `auth.users.id`
- `/.well-known/oauth-protected-resource`
  - advertises the isolated Supabase OAuth authorization server
- `/oauth/consent` and `/api/oauth/decision`
  - Preview-only consent and approve/deny flow
  - hard-bound to the isolated test Supabase project and allowed test user

No additional npm dependencies are required.

## Server-only Preview flags

These must remain unset/false in Production:

```text
WHATSAPP_PERSONAL_TOOL_ENABLED=false
WHATSAPP_PERSONAL_TOOL_SECRET=
WHATSAPP_PERSONAL_MCP_ENABLED=false
WHATSAPP_PERSONAL_OAUTH_ALLOWED_USER_ID=
```

The sender continues to use the existing Meta test runtime:

```text
ATLAS_WHATSAPP_MODE=meta_test
WHATSAPP_TEST_ENABLED=true
WHATSAPP_TEST_ACCESS_TOKEN=...
WHATSAPP_TEST_PHONE_NUMBER_ID=...
WHATSAPP_TEST_WABA_ID=...
WHATSAPP_TEST_ALLOWED_RECIPIENTS=...
```

Never copy production WhatsApp credentials into `WHATSAPP_TEST_*`.

## OAuth test project

The MCP server is hard-bound to the existing isolated Supabase project:

```text
Atlas WhatsApp Auth Test
qyhqqoxafdscagmfzlmp
```

Before ChatGPT can authenticate, Supabase Auth OAuth Server must be enabled for this **test project only**, with the Preview consent path configured as `/oauth/consent`. Production Atlas Auth must not be changed.

## MCP tool contract

Tool: `send_whatsapp_message`

```json
{
  "recipientPhone": "+9647XXXXXXXXX",
  "message": "I'll be there at 7."
}
```

Contact-name resolution intentionally stays outside the Meta transport. A ChatGPT integration can resolve a saved contact first, then pass the exact number. If a name is ambiguous, the user should choose before any send action occurs.

## Current ChatGPT product limitation

As of August 2026, OpenAI documents full custom MCP write/modify actions for ChatGPT Business and Enterprise/Edu workspaces. A personal Plus account cannot currently attach this custom write action directly. The backend can still be built and tested independently now; the final in-ChatGPT write connection requires an eligible ChatGPT workspace or a future expansion of availability.

## Verification ladder

1. Vercel Preview builds all personal sender/MCP/OAuth routes and tests.
2. Meta test health confirms the `WHATSAPP_TEST_*` transport is currently valid.
3. Enable the personal Preview flags only in the isolated Preview environment.
4. Enable OAuth Server only in Atlas WhatsApp Auth Test and configure `/oauth/consent`.
5. Set `WHATSAPP_PERSONAL_OAUTH_ALLOWED_USER_ID` to the one authorized test account.
6. Verify MCP `initialize` and `tools/list` through OAuth.
7. Send a real test message only to an existing Meta-registered/Atlas-allowed test recipient and confirm Meta returns a provider message ID.
8. Once an eligible ChatGPT workspace is available, attach the remote MCP endpoint and repeat the send from natural language.
9. Only after that proof should any permanent-number design be considered.

## One-number decision

No second phone number is required for this sandbox. It uses Meta's test sender to prove the integration. The existing permanent WhatsApp number should not be re-registered or changed while this test is underway. Whether that same permanent number can later serve both existing Atlas/business messaging and the personal ChatGPT sender depends on its final Meta onboarding/Coexistence state and should be decided only after the sandbox is proven.
