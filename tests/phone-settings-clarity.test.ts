import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const summary = readFileSync("app/dashboard/settings/phone-number-manager.tsx", "utf8");
const changeForm = readFileSync("app/dashboard/settings/phone-change-form.tsx", "utf8");
const page = readFileSync("app/dashboard/settings/phone/page.tsx", "utf8");

test("main settings keeps verified phone simple and moves phone changes to a dedicated account screen", () => {
  assert.match(summary, /href="\/dashboard\/settings\/phone"/);
  assert.doesNotMatch(summary, /auth\.updateUser/);
  assert.match(page, /PhoneChangeForm/);
});

test("phone change treats Supabase digits-only E.164 as the same verified phone", () => {
  assert.match(changeForm, /normalizeAuthPhone\(currentPhone\)/);
  assert.match(changeForm, /phone === normalizedCurrentPhone/);
  assert.match(changeForm, /already your Atlas sign-in phone/);
});
