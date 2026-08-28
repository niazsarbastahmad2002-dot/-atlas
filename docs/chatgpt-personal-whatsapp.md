# ChatGPT personal WhatsApp sandbox

This branch adds an isolated proof-of-concept for the user flow:

> “Send Ahmed on WhatsApp: I’ll be there at 7.”

The goal is to prove ChatGPT -> Atlas bridge -> Meta WhatsApp Cloud API without changing Atlas production WhatsApp, the real clinic sender, Coexistence, DNS, or Supabase production Auth.

## Current architecture

1. ChatGPT invokes the MCP tool `send_whatsapp_message`.
2. The tool receives an already-resolved Iraqi E.164 recipient number and message text.
3. The MCP route requires a non-production Vercel runtime and `WHATSAPP_PERSONAL_MCP_ENABLED=true`.
4. The route requires `ATLAS_WHATSAPP_MODE=meta_test` and the existing `WHATSAPP_TEST_*` configuration.
5. Atlas applies the Meta/Atlas test-recipient allowlist.
6. Atlas calls the existing `sendWhatsAppTextMessage()` Meta Cloud API transport.
7. The tool returns Meta's provider message ID when the API accepts the message.

## Safety boundary

The personal sender is test/Preview only at this stage.

- `/api/whatsapp/personal/send` refuses Vercel Production.
- `/api/mcp/whatsapp-test` refuses Vercel Production.
- Both paths require the isolated Meta test runtime.
- The normal `WHATSAPP_*` production credentials are never selected by these paths.
- The existing test recipient restriction still applies.
- The MCP tool is an external write action and is described to run only after an explicit user request to send a message.
- No branch in this work should be merged to `main` merely to perform the sandbox test.

## Server-only flags

```text
WHATSAPP_PERSONAL_TOOL_ENABLED=false
WHATSAPP_PERSONAL_TOOL_SECRET=
WHATSAPP_PERSONAL_MCP_ENABLED=false
```

The existing Meta test variables remain authoritative for the sandbox sender:

```text
ATLAS_WHATSAPP_MODE=meta_test
WHATSAPP_TEST_ENABLED=true
WHATSAPP_TEST_ACCESS_TOKEN=...
WHATSAPP_TEST_PHONE_NUMBER_ID=...
WHATSAPP_TEST_WABA_ID=...
WHATSAPP_TEST_ALLOWED_RECIPIENTS=...
```

Never place the real production sender credentials into the `WHATSAPP_TEST_*` variables.

## ChatGPT MCP tool contract

Tool: `send_whatsapp_message`

Input:

```json
{
  "recipientPhone": "+9647XXXXXXXXX",
  "message": "I'll be there at 7."
}
```

The current generic text transport intentionally accepts Iraqi mobile numbers only. Contact-name resolution is kept outside the Meta transport: ChatGPT can resolve a saved contact first and then pass the exact phone number. If more than one saved contact matches a name, the user should choose before sending.

## Authentication plan

The sandbox MCP route is not the permanent security model. OpenAI's current MCP/plugin authentication model requires OAuth 2.1 for authenticated user actions and does not accept arbitrary user-supplied API keys as a substitute.

For the permanent personal sender, add OAuth to the MCP server before exposing it beyond the protected sandbox. Keep authorization server work separate from Atlas production Auth unless an isolated test identity provider is explicitly chosen.

## Verification ladder

1. Static tests prove production hard-blocks, Meta-test-only selection, allowlisting, and correct MCP annotations.
2. Vercel Preview must build the branch successfully.
3. Meta test health must show valid test credentials.
4. MCP discovery must expose exactly the intended send tool.
5. A test message must be sent only to a Meta-registered/Atlas-allowed test recipient.
6. Confirm Meta returns a provider message ID.
7. Connect the sandbox tool in ChatGPT developer mode and repeat the send from a natural-language request.
8. Only after this proof should a permanent-number/OAuth design be promoted.

## One-number decision

This sandbox does not require purchasing another phone number. It uses Meta's test sender to prove the integration first. Whether the user's existing permanent WhatsApp number can safely serve both Atlas/business messaging and the later personal ChatGPT sender should be decided only after reviewing its final Meta onboarding/Coexistence state. Do not change that number's production registration during this sandbox work.
