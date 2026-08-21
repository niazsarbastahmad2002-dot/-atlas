import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("WhatsApp OTP login has incorrect, expired, rate-limit, resend and loading states", () => {
  const login = read("app/login/login-form.tsx");
  const start = read("app/api/auth/whatsapp/start/route.ts");
  const verify = read("app/api/auth/whatsapp/verify/route.ts");

  assert.match(login, /incorrect/);
  assert.match(login, /expired/);
  assert.match(login, /Too many code requests/);
  assert.match(login, /resendAfterSeconds/);
  assert.match(login, /cooldownUntil/);
  assert.match(login, /Sending to WhatsApp/);
  assert.match(login, /Opening Atlas/);
  assert.match(login, /autoComplete="one-time-code"/);
  assert.match(start, /status.*429|429/);
  assert.match(verify, /too_many_attempts/);
});

test("new and returning WhatsApp users share the same secure Atlas session bridge", () => {
  const login = read("app/login/login-form.tsx");
  const session = read("lib/whatsapp-session.ts");

  assert.match(login, /\/api\/auth\/whatsapp\/start/);
  assert.match(login, /\/api\/auth\/whatsapp\/verify/);
  assert.match(login, /window\.location\.assign\(nextPath\)/);
  assert.match(session, /listUsers/);
  assert.match(session, /candidate\.phone === phone/);
  assert.match(session, /createUser/);
  assert.match(session, /updateUserById/);
  assert.match(session, /verifyOtp/);
  assert.doesNotMatch(login, /signInWithOtp|type: "sms"/);
});

test("localized mobile digits reach E.164 normalization after country selection", () => {
  const login = read("app/login/login-form.tsx");

  assert.match(login, /toAsciiPhoneDigits\(raw\)/);
  assert.match(login, /\^7\\d\{9\}\$/);
  assert.match(login, /normalizeAuthPhone\(`\+964\$\{national\}`\)/);
});

test("phone change uses the same WhatsApp verification channel instead of Supabase phone OTP", () => {
  const manager = read("app/dashboard/settings/phone-number-manager.tsx");
  const route = read("app/api/auth/whatsapp/change-phone/route.ts");

  assert.match(manager, /Send code to WhatsApp/);
  assert.match(manager, /\/api\/auth\/whatsapp\/start/);
  assert.match(manager, /\/api\/auth\/whatsapp\/change-phone/);
  assert.doesNotMatch(manager, /auth\.updateUser|auth\.verifyOtp|phone_change/);
  assert.match(route, /consumeWhatsAppVerification/);
  assert.match(route, /updateUserById/);
  assert.match(route, /phone_in_use/);
});

test("normal staff provisioning cannot create email auth users and sends the invite by WhatsApp", () => {
  const page = read("app/dashboard/staff/page.tsx");
  const actions = read("app/dashboard/staff/actions.ts");
  const invite = read("app/dashboard/staff/invite-actions.ts");

  assert.match(page, /InviteLinkForm/);
  assert.doesNotMatch(page, /StaffProvisionForm/);
  assert.doesNotMatch(actions, /createUser\(\{|signInWithOtp\(\{\s*email|normalizeEmail|validEmail/);
  assert.match(invite, /create_phone_staff_invite_link_service/);
  assert.match(invite, /p_invited_phone_hash: hashVerifiedPhone\(phone\)/);
  assert.match(invite, /sendReceptionistInviteWhatsApp/);
});

test("receptionist invite redemption requires the phone originally invited", () => {
  const finish = read("app/join/[token]/finish/route.ts");

  assert.match(finish, /verifiedPhone/);
  assert.match(finish, /hashVerifiedPhone\(verifiedPhone\)/);
  assert.match(finish, /redeem_phone_staff_invite_link_service/);
  assert.match(finish, /phone_mismatch/);
});

test("permanent account deletion deletes clinics first and then the Atlas auth identity", () => {
  const deletion = read("app/dashboard/settings/account/actions.ts");

  assert.match(deletion, /from\("clinics"\)[\s\S]*\.delete\(\)/);
  assert.match(deletion, /\.eq\("owner_id", userId\)/);
  assert.match(deletion, /auth\.admin\.deleteUser\(userId\)/);
  assert.match(deletion, /auth\.signOut/);
  assert.match(deletion, /\/login\?notice=account_deleted/);
});
