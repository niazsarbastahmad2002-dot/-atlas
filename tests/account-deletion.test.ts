import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const actionSource = readFileSync(new URL("../app/dashboard/settings/account/actions.ts", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("../app/dashboard/settings/account/page.tsx", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("../app/dashboard/settings/layout.tsx", import.meta.url), "utf8");

test("Atlas exposes full in-app account deletion", () => {
  assert.match(layoutSource, /\/dashboard\/settings\/account/);
  assert.match(pageSource, /Permanently delete my account/);
  assert.match(pageSource, /Type your email address exactly to confirm/);
});

test("account deletion requires the authenticated user's exact email and uses server admin deletion", () => {
  assert.match(actionSource, /supabase\.auth\.getUser\(\)/);
  assert.match(actionSource, /confirmation !== email/);
  assert.match(actionSource, /createAdminClient\(\)/);
  assert.match(actionSource, /admin\.auth\.admin\.deleteUser\(user\.id\)/);
});

test("owner deletion warns that owned clinic data is also removed", () => {
  assert.match(pageSource, /Deleting your account will also permanently delete every clinic you own/);
  assert.match(pageSource, /appointments, doctors, staff access, reminders, patient links/);
});
