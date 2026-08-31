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
