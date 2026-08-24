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
  assert.match(start, /429/);
  assert.match(verify, /too_many_attempts/);
});

test("new and returning WhatsApp users use indexed identity resolution instead of Auth scans", () => {
  const login = read("app/login/login-form.tsx");
  const session = read("lib/whatsapp-session.ts");

  assert.match(login, /\/api\/auth\/whatsapp\/start/);
  assert.match(login, /\/api\/auth\/whatsapp\/verify/);
  assert.match(login, /window\.location\.assign\(nextPath\)/);
  assert.match(session, /resolve_whatsapp_identity_service/);
  assert.match(session, /bind_whatsapp_identity_service/);
  assert.match(session, /createUser/);
  assert.match(session, /updateUserById/);
  assert.match(session, /verifyOtp/);
  assert.doesNotMatch(session, /listUsers/);
  assert.doesNotMatch(login, /signInWithOtp|type: "sms"/);
});

test("correct OTP is finalized after successful session establishment, not before", () => {
  const verify = read("app/api/auth/whatsapp/verify/route.ts");
  const verification = read("lib/whatsapp-verification.ts");

  const establishIndex = verify.indexOf("establishWhatsAppAtlasSession(verification.phone)");
  const finalizeIndex = verify.indexOf("finalizeWhatsAppVerification(verification.phone, verification.challengeId)");
  assert.ok(establishIndex >= 0 && finalizeIndex > establishIndex);
  assert.match(verification, /verify_whatsapp_auth_challenge_service/);
  assert.match(verification, /finalize_whatsapp_auth_challenge_service/);
});

test("localized mobile digits reach E.164 normalization after country selection", () => {
  const login = read("app/login/login-form.tsx");

  assert.match(login, /toAsciiPhoneDigits\(raw\)/);
  assert.match(login, /\^7\\d\{9\}\$/);
  assert.match(login, /normalizeAuthPhone\(`\+964\$\{national\}`\)/);
});

test("phone change uses the same indexed WhatsApp verification channel", () => {
  const manager = read("app/dashboard/settings/phone-number-manager.tsx");
  const route = read("app/api/auth/whatsapp/change-phone/route.ts");

  assert.match(manager, /Send code to WhatsApp/);
  assert.match(manager, /\/api\/auth\/whatsapp\/start/);
  assert.match(manager, /\/api\/auth\/whatsapp\/change-phone/);
  assert.doesNotMatch(manager, /auth\.updateUser|auth\.verifyOtp|phone_change/);
  assert.match(route, /consumeWhatsAppVerification/);
  assert.match(route, /resolve_whatsapp_identity_service/);
  assert.match(route, /bind_whatsapp_identity_service/);
  assert.match(route, /updateUserById/);
  assert.match(route, /phone_in_use/);
  assert.doesNotMatch(route, /listUsers/);
});

test("normal staff provisioning cannot create email users and activates invite only after WhatsApp delivery", () => {
  const page = read("app/dashboard/staff/page.tsx");
  const actions = read("app/dashboard/staff/actions.ts");
  const invite = read("app/dashboard/staff/invite-actions.ts");

  assert.match(page, /InviteLinkForm/);
  assert.doesNotMatch(page, /StaffProvisionForm/);
  assert.doesNotMatch(actions, /createUser\(\{|signInWithOtp\(\{\s*email|normalizeEmail|validEmail/);
  assert.match(invite, /create_phone_staff_invite_link_service/);
  assert.match(invite, /p_invited_phone_hash: hashVerifiedPhone\(phone\)/);
  assert.match(invite, /sendReceptionistInviteWhatsApp/);
  assert.match(invite, /activate_phone_staff_invite_link_service/);
  assert.ok(invite.indexOf("sendReceptionistInviteWhatsApp") < invite.indexOf("activate_phone_staff_invite_link_service"));
});

test("receptionist invite redemption requires the phone originally invited and a delivered non-revoked link", () => {
  const finish = read("app/join/[token]/finish/route.ts");
  const migration = read("supabase/migrations/20260824054000_staff_invite_activate_after_delivery.sql");

  assert.match(finish, /verifiedPhone/);
  assert.match(finish, /hashVerifiedPhone\(verifiedPhone\)/);
  assert.match(finish, /redeem_phone_staff_invite_link_service/);
  assert.match(finish, /phone_mismatch/);
  assert.match(migration, /l\.sent_at is not null/);
  assert.match(migration, /l\.revoked_at is null/);
});

test("permanent account deletion deletes the Auth identity and lets the database cascade clinics atomically", () => {
  const deletion = read("app/dashboard/settings/account/actions.ts");
  const migration = read("supabase/migrations/20260824050500_whatsapp_auth_atomic_identity_account_cascade.sql");

  assert.match(deletion, /auth\.admin\.deleteUser\(userId\)/);
  assert.doesNotMatch(deletion, /from\("clinics"\)[\s\S]*\.delete\(\)/);
  assert.match(deletion, /auth\.signOut/);
  assert.match(deletion, /\/login\?notice=account_deleted/);
  assert.match(migration, /references auth\.users\(id\) on delete cascade/i);
});

test("Settings exposes the true Account & deletion destination", () => {
  const manager = read("app/dashboard/settings/phone-number-manager.tsx");
  const account = read("app/dashboard/settings/account/page.tsx");

  assert.match(manager, /Account & deletion/);
  assert.match(manager, /href="\/dashboard\/settings\/account"/);
  assert.match(account, /Delete Atlas account permanently/);
  assert.match(account, /Type DELETE to confirm/);
});
