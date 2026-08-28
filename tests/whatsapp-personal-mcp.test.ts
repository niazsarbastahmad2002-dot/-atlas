import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(
  new URL("../app/api/mcp/whatsapp-test/route.ts", import.meta.url),
  "utf8",
);

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { dependencies?: Record<string, string> };

test("personal WhatsApp MCP tool is a sandbox-only external write action", () => {
  assert.match(route, /send_whatsapp_message/);
  assert.match(route, /explicitly asks to send a WhatsApp message/);
  assert.match(route, /readOnlyHint: false/);
  assert.match(route, /openWorldHint: true/);
  assert.match(route, /VERCEL_ENV === "production"/);
  assert.match(route, /WHATSAPP_PERSONAL_MCP_ENABLED !== "true"/);
  assert.match(route, /runtimeConfig\.mode !== ATLAS_WHATSAPP_META_TEST_MODE/);
  assert.match(route, /atlasWhatsAppRecipientAllowed\(runtimeConfig, recipientPhone\)/);
  assert.match(route, /sendWhatsAppTextMessage\(recipientPhone, message, runtimeConfig\.config\)/);
});

test("MCP route uses the current Vercel-compatible MCP stack", () => {
  assert.equal(packageJson.dependencies?.["mcp-handler"], "2.1.0");
  assert.equal(packageJson.dependencies?.["@modelcontextprotocol/server"], "2.0.0");
  assert.equal(packageJson.dependencies?.zod, "4.4.3");
});
