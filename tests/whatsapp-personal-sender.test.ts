import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(
  new URL("../app/api/whatsapp/personal/send/route.ts", import.meta.url),
  "utf8",
);
const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");

test("personal sender is isolated from production Atlas WhatsApp", () => {
  assert.match(route, /VERCEL_ENV === "production"/);
  assert.match(route, /personal_sender_forbidden_in_production/);
  assert.match(route, /WHATSAPP_PERSONAL_TOOL_ENABLED !== "true"/);
  assert.match(route, /WHATSAPP_PERSONAL_TOOL_SECRET/);
  assert.match(route, /secret\.length >= 32/);
  assert.match(route, /runtimeConfig\.mode !== ATLAS_WHATSAPP_META_TEST_MODE/);
  assert.match(route, /atlasWhatsAppRecipientAllowed\(runtimeConfig, recipientPhone\)/);
  assert.match(route, /sendWhatsAppTextMessage\(recipientPhone, message, runtimeConfig\.config\)/);
});

test("personal sender has separate server-only configuration", () => {
  assert.match(envExample, /WHATSAPP_PERSONAL_TOOL_ENABLED=false/);
  assert.match(envExample, /WHATSAPP_PERSONAL_TOOL_SECRET=/);
});
