import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const client = readFileSync("lib/supabase/client.ts", "utf8");
const proxy = readFileSync("app/api/auth/test-supabase/route.ts", "utf8");
const home = readFileSync("app/page.tsx", "utf8");
const picker = readFileSync("app/login/language-picker.tsx", "utf8");
const layout = readFileSync("app/layout.tsx", "utf8");
const csp = readFileSync("next.config.mjs", "utf8");

test("isolated Preview phone auth is relayed same-origin without changing production transport", () => {
  assert.match(client, /isolatedTest \? \{ global: \{ fetch: createIsolatedAuthFetch\(url\) \} \} : \{\}/);
  assert.match(client, /\/api\/auth\/test-supabase\?path=\$\{authAction\}/);
  assert.match(client, /target\.pathname === "\/auth\/v1\/otp"/);
  assert.match(client, /target\.pathname === "\/auth\/v1\/verify"/);
  assert.doesNotMatch(client, /ATLAS_TEST_SUPABASE_SECRET_KEY/);
});

test("isolated Supabase auth relay is hard-blocked in production and only forwards auth endpoints", () => {
  assert.match(proxy, /process\.env\.VERCEL_ENV === "production"/);
  assert.match(proxy, /process\.env\.ATLAS_WHATSAPP_MODE !== "meta_test"/);
  assert.match(proxy, /new Set\(\["otp", "verify"\]\)/);
  assert.match(proxy, /config\.isolatedTest/);
  assert.match(proxy, /\/auth\/v1\/\$\{action\}/);
  assert.match(proxy, /apikey: config\.publishableKey/);
  assert.doesNotMatch(proxy, /SECRET_KEY/);
});

test("first Atlas screen uses the same persisted language choice as login", () => {
  assert.match(home, /getUiLocale/);
  assert.match(home, /LoginLanguagePicker locale=\{locale\} source="home"/);
  assert.match(home, /const homeCopy: Record<UiLocale, HomeCopy>/);
  assert.match(home, /text-align:start/);
  assert.match(picker, /fetch\("\/api\/ui-language"/);
  assert.match(picker, /atlas_home_language_changed/);
  assert.match(layout, /<html lang=\{meta\.language\} dir=\{meta\.direction\}>/);
});

test("Preview CSP includes both normal and isolated test Supabase origins", () => {
  assert.match(csp, /NEXT_PUBLIC_ATLAS_TEST_SUPABASE_URL/);
  assert.match(csp, /supabaseConnectOrigins/);
  assert.match(csp, /connect-src 'self'\$\{supabaseConnectOrigins\}/);
});
