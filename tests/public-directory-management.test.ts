import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public profile management is explicitly owner/manager gated", () => {
  const actions = source("app/dashboard/settings/public-profile/actions.ts");
  const page = source("app/dashboard/settings/public-profile/page.tsx");

  assert.match(actions, /membership\?\.role === "owner" \|\| membership\?\.role === "manager"/);
  assert.match(page, /membership\?\.role === "owner" \|\| membership\?\.role === "manager"/);
  assert.match(actions, /clinic_directory_profiles/);
  assert.match(actions, /doctor_directory_profiles/);
  assert.doesNotMatch(actions, /\.from\("appointments"\)|patient_name|patient_phone|reminder_/);
});

test("publishing remains explicit and archived doctors cannot be published through Atlas UI", () => {
  const actions = source("app/dashboard/settings/public-profile/actions.ts");
  const page = source("app/dashboard/settings/public-profile/page.tsx");

  assert.match(actions, /formData\.get\("is_published"\) === "on"/);
  assert.match(actions, /if \(isPublished && !doctor\.active\) failed\(clinicId, "doctor_archived"\)/);
  assert.match(actions, /isPublished && !city/);
  assert.match(page, /Nothing is published automatically/);
  assert.match(page, /هیچ شتێک بەخۆکار بڵاوناکرێتەوە/);
  assert.match(page, /لا يتم نشر أي شيء تلقائياً/);
  assert.match(page, /disabled=\{!doctor\.active\}/);
});

test("settings links managers to the separate public profile surface", () => {
  const settings = source("app/dashboard/settings/page.tsx");

  assert.match(settings, /publicPresence/);
  assert.match(settings, /\/dashboard\/settings\/public-profile\?clinic=/);
  assert.match(settings, /\{canManage \? \(/);
});


test("public contact phone is restricted before it can become a tel link", () => {
  const actions = source("app/dashboard/settings/public-profile/actions.ts");
  const migration = source("supabase/migrations/20261003190248_public_directory_foundation.sql");

  assert.match(actions, /publicPhonePattern/);
  assert.match(actions, /publicPhone && !publicPhonePattern\.test\(publicPhone\)/);
  assert.match(migration, /clinic_directory_phone_check[\s\S]*public_phone ~ '\^\[\+\]\?\[0-9\(\) \.\-\]\{6,39\}\$'/);
});
