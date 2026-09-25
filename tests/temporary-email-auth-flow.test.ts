import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("temporary email keeps the selected locale for returning users", async () => {
  const route = await read("app/api/auth/temporary-email/route.ts");

  assert.match(route, /admin\.auth\.admin\.listUsers/);
  assert.match(route, /admin\.auth\.admin\.updateUserById/);
  assert.match(route, /atlas_ui_language: locale/);
  assert.match(route, /syncExistingUserLocale/);
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
  assert.match(bridge, /window\.history\.replaceState/);
  assert.match(bridge, /window\.location\.replace/);
  assert.match(callback, /data\.user\?\.user_metadata\?\.atlas_ui_language/);
  assert.match(callback, /requestedLocale/);
});
