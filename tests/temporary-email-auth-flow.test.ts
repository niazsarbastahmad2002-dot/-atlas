import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("temporary email never mutates an existing user before verification", async () => {
  const route = await read("app/api/auth/temporary-email/route.ts");

  assert.doesNotMatch(route, /admin\.auth\.admin\.listUsers/);
  assert.doesNotMatch(route, /admin\.auth\.admin\.updateUserById/);
  assert.doesNotMatch(route, /syncExistingUserLocale/);
  assert.doesNotMatch(route, /user_metadata:\s*\{\s*atlas_ui_language/);
  assert.match(route, /redirectTo\.searchParams\.set\("atlas_email_locale", locale\)/);
});

test("implicit email verification is completed client-side without exposing tokens", async () => {
  const serverCallback = await read("app/auth/callback/route.ts");
  const emailCallback = await read("app/auth/email/callback/page.tsx");
  const navigation = await read("lib/navigation.ts");

  assert.match(serverCallback, /\/auth\/email\/callback/);
  assert.match(serverCallback, /atlas_email_locale/);
  assert.match(emailCallback, /window\.location\.hash/);
  assert.match(emailCallback, /window\.history\.replaceState/);
  assert.match(emailCallback, /supabase\.auth\.setSession/);
  assert.match(emailCallback, /if \(requestedLocale && requestedLocale !== metadataLocale\)/);
  assert.match(emailCallback, /supabase\.auth\.updateUser\([\s\S]*atlas_ui_language: requestedLocale/);
  assert.match(emailCallback, /\/api\/ui-language/);
  assert.match(emailCallback, /\/auth\/activate/);
  assert.match(navigation, /\/dashboard\/select-clinic/);
});


test("legacy SiteURL magic links are bridged onto the canonical Atlas email callback", async () => {
  const layout = await read("app/layout.tsx");
  const bridge = await read("app/components/email-auth-fragment-bridge.tsx");
  const callback = await read("app/auth/email/callback/page.tsx");

  assert.match(layout, /EmailAuthFragmentBridge/);
  assert.match(bridge, /https:\/\/atlasclinic\.dpdns\.org/);
  assert.match(bridge, /https:\/\/atlasdemofixed\.vercel\.app/);
  assert.match(bridge, /access_token/);
  assert.match(bridge, /refresh_token/);
  assert.match(bridge, /\/auth\/email\/callback/);
  assert.match(bridge, /atlas_email_locale/);
  assert.match(bridge, /EMAIL_LOCALES\.has\(locale\)/);
  assert.match(bridge, /callback\.searchParams\.set\("atlas_email_locale", locale\)/);
  assert.match(bridge, /window\.history\.replaceState/);
  assert.match(bridge, /window\.location\.replace/);
  assert.match(callback, /data\.user\?\.user_metadata\?\.atlas_ui_language/);
  assert.match(callback, /requestedLocale/);
});


test("global email fragment bridge never consumes retired clinic invitation fragments", async () => {
  const bridge = await read("app/components/email-auth-fragment-bridge.tsx");
  const invite = await read("app/auth/invite/page.tsx");

  assert.match(bridge, /window\.location\.pathname === "\/auth\/invite"/);
  assert.match(invite, /window\.history\.replaceState/);
  assert.match(invite, /window\.location\.replace\("\/login\?error=invalid_invite"\)/);
  assert.doesNotMatch(invite, /auth\.setSession|auth\.getSession|\/auth\/activate/);
});

test("code-based email verification saves locale only after session exchange", async () => {
  const serverCallback = await read("app/auth/callback/route.ts");

  const exchange = serverCallback.indexOf("exchangeCodeForSession(code)");
  const localeSave = serverCallback.indexOf("supabase.auth.updateUser");
  assert.ok(exchange >= 0);
  assert.ok(localeSave > exchange);
  assert.match(serverCallback, /data: \{ atlas_ui_language: requestedLocale \}/);
  assert.match(serverCallback, /response\.cookies\.set\(uiLocaleCookie, requestedLocale/);
});

