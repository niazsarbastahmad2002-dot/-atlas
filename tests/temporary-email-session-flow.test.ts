import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("returning email users receive the selected Atlas locale", async () => {
  const route = await read("app/api/auth/temporary-email/route.ts");

  assert.match(route, /atlas_ui_language: locale/);
  assert.match(route, /admin\.auth\.admin\.listUsers/);
  assert.match(route, /admin\.auth\.admin\.updateUserById/);
  assert.match(route, /new URL\("\/auth\/email-callback", request\.url\)/);
  assert.match(route, /emailRedirectTo: redirectTo\.toString\(\)/);
});

test("email callback consumes implicit magic-link tokens before Atlas activation", async () => {
  const callback = await read("app/auth/email-callback/page.tsx");

  assert.match(callback, /window\.location\.hash/);
  assert.match(callback, /fragment\.get\("access_token"\)/);
  assert.match(callback, /fragment\.get\("refresh_token"\)/);
  assert.match(callback, /supabase\.auth\.setSession/);
  assert.match(callback, /\/auth\/activate\?next=/);
  assert.match(callback, /window\.history\.replaceState/);
});
