import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { maskPhone, normalizeAuthPhone, normalizeOtpToken } from "../lib/phone-auth.ts";

const file = (path: string) => new URL(`../${path}`, import.meta.url);
const read = (path: string) => readFileSync(file(path), "utf8");

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

test("normal Atlas login is WhatsApp-only and country-aware", () => {
  const page = read("app/login/page.tsx");
  const form = read("app/login/login-form.tsx");

  assert.doesNotMatch(page, /LegacyLoginForm|CreateClinicAccount|Existing Atlas email|migration sign-in/i);
  assert.match(page, /Enter your WhatsApp number/);
  assert.match(form, /Iraq \(\+964\)/);
  assert.match(form, /Other international \(\+…\)/);
  assert.match(form, /\/api\/auth\/whatsapp\/start/);
  assert.match(form, /\/api\/auth\/whatsapp\/verify/);
  assert.match(form, /Send code to WhatsApp/);
  assert.match(form, /Check your WhatsApp/);
  assert.match(form, /autoComplete="one-time-code"/);
  assert.doesNotMatch(form, /signInWithOtp|signInWithOAuth|type="email"|type: "sms"|channel: "sms"/);
});

test("legacy Gmail/email authentication route is removed", () => {
  const page = read("app/login/page.tsx");
  assert.equal(existsSync(file("app/login/legacy/page.tsx")), false);
  assert.equal(existsSync(file("app/login/legacy/legacy-login-form.tsx")), false);
  assert.doesNotMatch(page, /email|gmail|magic link/i);
});

test("WhatsApp challenges are hashed, rate-limited, expiring and one-use", () => {
  const verification = read("lib/whatsapp-verification.ts");

  assert.match(verification, /createHmac/);
  assert.match(verification, /timingSafeEqual/);
  assert.match(verification, /whatsapp_auth_challenges/);
  assert.match(verification, /OTP_TTL_MS = 10 \* 60 \* 1000/);
  assert.match(verification, /OTP_MAX_ATTEMPTS = 5/);
  assert.match(verification, /\(phoneCount\.count \?\? 0\) >= 6/);
  assert.match(verification, /\(ipCount\.count \?\? 0\) >= 20/);
  assert.match(verification, /consumed_at/);
  assert.match(verification, /otp_hash: hashOtp/);
  assert.doesNotMatch(verification, /otp:\s*code|code:\s*code/);
});

test("verified WhatsApp phone opens a real Supabase session without sending email", () => {
  const session = read("lib/whatsapp-session.ts");
  const verifyRoute = read("app/api/auth/whatsapp/verify/route.ts");

  assert.match(session, /@auth\.atlas\.invalid/);
  assert.match(session, /atlas_phone/);
  assert.match(session, /atlas_identity: "whatsapp_phone"/);
  assert.match(session, /generateLink\(\{/);
  assert.match(session, /type: "magiclink"/);
  assert.match(session, /token_hash: generated\.data\.properties\.hashed_token/);
  assert.match(verifyRoute, /establishWhatsAppAtlasSession/);
  assert.doesNotMatch(session, /signInWithOtp\(\{\s*email|resend\(|send.*email/i);
});

test("authentication and clinic membership stay separate and invites require the same verified phone", () => {
  const chooser = read("app/dashboard/select-clinic/page.tsx");
  const inviteAuth = read("app/join/[token]/join-auth.tsx");
  const inviteFinish = read("app/join/[token]/finish/route.ts");

  assert.match(chooser, /if \(!clinics\?\.length\) redirect\("\/dashboard"\)/);
  assert.match(chooser, /if \(clinics\.length === 1\) redirect/);
  assert.match(chooser, /Choose a clinic/);
  assert.match(inviteAuth, /LoginForm/);
  assert.match(inviteFinish, /redeem_phone_staff_invite_link_service/);
  assert.match(inviteFinish, /p_user_id: userData\.user\.id/);
  assert.match(inviteFinish, /p_verified_phone_hash: hashVerifiedPhone\(verifiedPhone\)/);
  assert.doesNotMatch(inviteAuth, /clinic_members/);
});

test("clinic access management sends phone-bound receptionist invitations through WhatsApp", () => {
  const staffPage = read("app/dashboard/staff/page.tsx");
  const inviteForm = read("app/dashboard/staff/invite-link-form.tsx");
  const inviteAction = read("app/dashboard/staff/invite-actions.ts");
  const inviteSender = read("lib/whatsapp-staff-invite.ts");

  assert.match(staffPage, /InviteLinkForm/);
  assert.doesNotMatch(staffPage, /StaffProvisionForm/);
  assert.doesNotMatch(staffPage, /user\.email/);
  assert.match(inviteForm, /Receptionist WhatsApp number/);
  assert.match(inviteForm, /Send invitation on WhatsApp/);
  assert.match(inviteAction, /randomBytes\(32\)/);
  assert.match(inviteAction, /create_phone_staff_invite_link_service/);
  assert.match(inviteAction, /hashVerifiedPhone\(phone\)/);
  assert.match(inviteAction, /sendReceptionistInviteWhatsApp/);
  assert.match(inviteSender, /graph\.facebook\.com/);
});

test("permanent account deletion removes owned clinics and the auth identity", () => {
  const account = read("app/dashboard/settings/account/page.tsx");
  const deletion = read("app/dashboard/settings/account/actions.ts");

  assert.match(account, /Delete Atlas account permanently/);
  assert.match(account, /brand-new account/);
  assert.match(deletion, /from\("clinics"\)[\s\S]*\.delete\(\)[\s\S]*\.eq\("owner_id", userId\)/);
  assert.match(deletion, /auth\.admin\.deleteUser\(userId\)/);
  assert.match(deletion, /\/login\?notice=account_deleted/);
});

test("sign-in phone changes are verified by WhatsApp and keep the same user id", () => {
  const manager = read("app/dashboard/settings/phone-number-manager.tsx");
  const route = read("app/api/auth/whatsapp/change-phone/route.ts");

  assert.match(manager, /\/api\/auth\/whatsapp\/start/);
  assert.match(manager, /\/api\/auth\/whatsapp\/change-phone/);
  assert.doesNotMatch(manager, /auth\.updateUser|type: "phone_change"/);
  assert.match(route, /consumeWhatsAppVerification/);
  assert.match(route, /candidate\.id !== current\.data\.user!\.id/);
  assert.match(route, /updateUserById\(current\.data\.user\.id/);
  assert.match(route, /phone_in_use/);
});

test("auth readiness exposes sender presence only, never sender secret values", () => {
  const route = read("app/api/auth/readiness/route.ts");

  assert.match(route, /directMetaSenderConfigured/);
  assert.match(route, /whatsappAccessTokenConfigured/);
  assert.match(route, /whatsappPhoneNumberIdConfigured/);
  assert.match(route, /Cache-Control/);
  assert.match(route, /no-store/);
  assert.doesNotMatch(route, /accessToken\s*:/);
});
