import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("OTP login has incorrect-expired, rate-limit, resend cooldown and loading states", () => {
  const login = read("app/login/login-form.tsx");

  assert.match(login, /incorrect or expired/);
  assert.match(login, /rateLimited/);
  assert.match(login, /remainingCooldown\(\)/);
  assert.match(login, /rememberCooldown\(60\)/);
  assert.match(login, /copy\.resend/);
  assert.match(login, /copy\.sending/);
  assert.match(login, /copy\.verifying/);
  assert.match(login, /autoComplete="one-time-code"/);
});

test("new and returning phone users share the same verified Supabase identity flow", () => {
  const login = read("app/login/login-form.tsx");

  assert.match(login, /signInWithOtp\(\{/);
  assert.match(login, /shouldCreateUser: PHONE_SIGNUP_ENABLED/);
  assert.match(login, /verifyOtp\(\{/);
  assert.match(login, /type: "sms"/);
  assert.match(login, /window\.location\.replace\(POST_AUTH_DESTINATION\)/);
});

test("localized mobile digits reach E.164 normalization after country selection", () => {
  const login = read("app/login/login-form.tsx");

  assert.match(login, /toAsciiPhoneDigits\(input\.trim\(\)\)/);
  assert.match(login, /normalizeAuthPhone\(phoneCandidate\(countryMode, phoneInput\)\)/);
});

test("phone change requires provider verification of the new number", () => {
  const manager = read("app/dashboard/settings/phone-number-manager.tsx");

  assert.match(manager, /auth\.updateUser\(\{ phone \}\)/);
  assert.match(manager, /auth\.verifyOtp\(\{/);
  assert.match(manager, /type: "phone_change"/);
  assert.doesNotMatch(manager, /admin\.updateUserById/);
});

test("normal staff provisioning cannot create email auth users anymore", () => {
  const page = read("app/dashboard/staff/page.tsx");
  const actions = read("app/dashboard/staff/actions.ts");
  const invite = read("app/dashboard/staff/invite-actions.ts");

  assert.match(page, /InviteLinkForm/);
  assert.doesNotMatch(page, /StaffProvisionForm/);
  assert.doesNotMatch(actions, /createUser\(\{|signInWithOtp\(\{\s*email|normalizeEmail|validEmail/);
  assert.match(invite, /create_staff_invite_link_service/);
});

test("last-clinic deletion preserves auth account and explicitly signs out", () => {
  const deletion = read("app/dashboard/settings/delete/actions.ts");

  assert.match(deletion, /from\("clinics"\)\s*\.delete\(\)/);
  assert.match(deletion, /auth\.signOut\(\)/);
  assert.match(deletion, /\/login\?notice=clinic_deleted/);
  assert.doesNotMatch(deletion, /auth\.admin\.deleteUser/);
});
