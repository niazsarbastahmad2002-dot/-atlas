import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { maskPhone, normalizeAuthPhone, normalizeOtpToken } from "../lib/phone-auth.ts";

test("normalizes Iraq-first and international authentication phone numbers", () => {
  assert.equal(normalizeAuthPhone("0750 123 4567"), "+9647501234567");
  assert.equal(normalizeAuthPhone("7501234567"), "+9647501234567");
  assert.equal(normalizeAuthPhone("00964-750-123-4567"), "+9647501234567");
  assert.equal(normalizeAuthPhone("+964 750 123 4567"), "+9647501234567");
  assert.equal(normalizeAuthPhone("٠٧٥٠ ١٢٣ ٤٥٦٧"), "+9647501234567");
  assert.equal(normalizeAuthPhone("+1 (415) 555-2671"), "+14155552671");
});

test("rejects malformed authentication phone numbers", () => {
  assert.equal(normalizeAuthPhone("12345"), null);
  assert.equal(normalizeAuthPhone("+0123456789"), null);
  assert.equal(normalizeAuthPhone("not-a-phone"), null);
});

test("normalizes localized OTP digits and masks phone display", () => {
  assert.equal(normalizeOtpToken("١٢٣ ٤٥٦"), "123456");
  assert.equal(maskPhone("+9647501234567"), "+964••••567");
});

test("normal login is phone OTP only and open signup is rollout-gated", () => {
  const page = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
  const form = readFileSync(new URL("../app/login/login-form.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(page, /CreateClinicAccount/);
  assert.match(form, /signInWithOtp\(\{[\s\S]*phone/);
  assert.match(form, /verifyOtp\(\{[\s\S]*type: "sms"/);
  assert.match(form, /shouldCreateUser: PHONE_SIGNUP_ENABLED/);
  assert.doesNotMatch(form, /signInWithOAuth/);
  assert.doesNotMatch(form, /type="email"/);
});

test("settings use phone identity and last-clinic deletion returns to sign-in without deleting auth user", () => {
  const settings = readFileSync(new URL("../app/dashboard/settings/page.tsx", import.meta.url), "utf8");
  const account = readFileSync(new URL("../app/dashboard/settings/account/page.tsx", import.meta.url), "utf8");
  const deletion = readFileSync(new URL("../app/dashboard/settings/delete/actions.ts", import.meta.url), "utf8");

  assert.match(settings, /userData\.user\.phone/);
  assert.doesNotMatch(settings, /userData\.user\.email/);
  assert.match(account, /userData\.user\.phone/);
  assert.doesNotMatch(account, /userData\.user\.email/);
  assert.match(deletion, /supabase\.auth\.signOut\(\)/);
  assert.match(deletion, /\/login\?notice=clinic_deleted/);
  assert.doesNotMatch(deletion, /admin\.deleteUser|deleteUser\(/);
});
