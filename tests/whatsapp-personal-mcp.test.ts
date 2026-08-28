import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(
  new URL("../app/api/mcp/whatsapp-test/route.ts", import.meta.url),
  "utf8",
);
const metadataRoute = readFileSync(
  new URL("../app/.well-known/oauth-protected-resource/route.ts", import.meta.url),
  "utf8",
);
const consentPage = readFileSync(
  new URL("../app/oauth/consent/page.tsx", import.meta.url),
  "utf8",
);
const decisionRoute = readFileSync(
  new URL("../app/api/oauth/decision/route.ts", import.meta.url),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { dependencies?: Record<string, string> };

test("personal WhatsApp MCP tool is a sandbox-only external write action", () => {
  assert.match(route, /send_whatsapp_message/);
  assert.match(route, /explicitly asks to send a WhatsApp message/);
  assert.match(route, /external write action/);
  assert.match(route, /readOnlyHint: false/);
  assert.match(route, /idempotentHint: false/);
  assert.match(route, /openWorldHint: true/);
  assert.match(route, /VERCEL_ENV === "production"/);
  assert.match(route, /WHATSAPP_PERSONAL_MCP_ENABLED !== "true"/);
  assert.match(route, /runtimeConfig\.mode !== ATLAS_WHATSAPP_META_TEST_MODE/);
  assert.match(route, /atlasWhatsAppRecipientAllowed\(runtimeConfig, recipientPhone\)/);
  assert.match(route, /sendWhatsAppTextMessage\(recipientPhone, message, runtimeConfig\.config\)/);
});

test("MCP server implements the stateless Streamable HTTP request surface", () => {
  assert.match(route, /MCP_PROTOCOL_VERSION = "2025-06-18"/);
  assert.match(route, /message\.method === "initialize"/);
  assert.match(route, /message\.method === "tools\/list"/);
  assert.match(route, /message\.method === "tools\/call"/);
  assert.match(route, /message\.method === "notifications\/initialized"/);
  assert.match(route, /status: 202/);
  assert.match(route, /status: 405/);
  assert.match(route, /requestOriginAllowed/);
});

test("MCP authentication is locked to the isolated WhatsApp Auth Test user", () => {
  assert.match(route, /qyhqqoxafdscagmfzlmp\.supabase\.co/);
  assert.match(route, /WHATSAPP_PERSONAL_OAUTH_ALLOWED_USER_ID/);
  assert.match(route, /\/auth\/v1\/oauth\/userinfo/);
  assert.match(route, /WWW-Authenticate/);
  assert.match(route, /resource_metadata/);
  assert.match(route, /userId !== allowedUserId/);
  assert.match(metadataRoute, /qyhqqoxafdscagmfzlmp\.supabase\.co\/auth\/v1/);
  assert.match(metadataRoute, /authorization_servers/);
  assert.match(metadataRoute, /offline_access/);
});

test("OAuth consent and decision are Preview-only and use isolated Supabase", () => {
  for (const source of [consentPage, decisionRoute]) {
    assert.match(source, /VERCEL_ENV === "production"/);
    assert.match(source, /ATLAS_WHATSAPP_MODE !== "meta_test"/);
    assert.match(source, /config\.isolatedTest/);
    assert.match(source, /qyhqqoxafdscagmfzlmp\.supabase\.co/);
    assert.match(source, /WHATSAPP_PERSONAL_OAUTH_ALLOWED_USER_ID/);
  }
  assert.match(consentPage, /getAuthorizationDetails/);
  assert.match(decisionRoute, /approveAuthorization/);
  assert.match(decisionRoute, /denyAuthorization/);
});

test("personal MCP adds no dependency or lockfile burden to Atlas", () => {
  assert.equal(packageJson.dependencies?.["mcp-handler"], undefined);
  assert.equal(packageJson.dependencies?.["@modelcontextprotocol/server"], undefined);
  assert.equal(packageJson.dependencies?.zod, undefined);
});
