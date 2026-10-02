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
  assert.match(invite, /\/login\?error=invalid_invite/);
  assert.doesNotMatch(invite, /createClient|auth\.setSession|auth\.getSession|\/auth\/activate/);
});
