import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("sign-in activation never grants clinic membership from legacy invitation metadata", async () => {
  const activation = await read("app/auth/activate/route.ts");

  assert.match(activation, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(activation, /readPendingStaffInvitations/);
  assert.doesNotMatch(activation, /createAdminClient/);
  assert.doesNotMatch(activation, /from\("clinic_members"\)/);
  assert.doesNotMatch(activation, /\.upsert\(/);
  assert.match(activation, /Clinic membership is never granted as a side effect of signing in/);
});

test("retired legacy staff invitation links cannot consume a session or auto-join a clinic", async () => {
  const invite = await read("app/auth/invite/page.tsx");

  assert.match(invite, /window\.history\.replaceState/);
  assert.match(invite, /destination\.searchParams\.set\("error", "invalid_invite"\)/);
  assert.doesNotMatch(invite, /createClient|auth\.setSession|auth\.getSession|\/auth\/activate/);
});

test("retired invitation recovery preserves language without flashing English-only copy", async () => {
  const invite = await read("app/auth/invite/page.tsx");

  assert.match(invite, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(invite, /currentParams\.get\("lang"\)/);
  assert.match(invite, /isUiLocale\(lang\)/);
  assert.match(invite, /destination\.searchParams\.set\("lang", lang\)/);
  assert.match(invite, /fetch\("\/api\/ui-language"/);
  assert.match(invite, /JSON\.stringify\(\{ locale: lang \}\)/);
  assert.doesNotMatch(invite, /This invitation needs to be replaced|Ask the clinic administrator/);
});
