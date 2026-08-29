import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { maskPhone, normalizeAuthPhone, normalizeOtpToken } from "../lib/phone-auth.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("normalizes Iraq-first and international authentication phone numbers", () => {
  assert.equal(normalizeAuthPhone("0750 123 4567"), "+9647501234567");
  assert.equal(normalizeAuthPhone("7501234567"), "+9647501234567");
  assert.equal(normalizeAuthPhone("00964-750-123-4567"), "+9647501234567");
  assert.equal(normalizeAuthPhone("+964 750 123 4567"), "+9647501234567");
  assert.equal(normalizeAuthPhone("9647501234567"), "+9647501234567");
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

test("normal login is phone OTP only, country-aware, and open signup is rollout-gated", () => {
  const page = read("app/login/page.tsx");
  const form = read("app/login/login-form.tsx");

  assert.doesNotMatch(page, /CreateClinicAccount/);
  assert.match(form, /Iraq \(\+964\)/);
  assert.match(form, /Other international \(\+…\)/);
  assert.match(form, /signInWithOtp\(\{[\s\S]*phone/);
  assert.match(form, /verifyOtp\(\{[\s\S]*type: "sms"/);
  assert.match(form, /shouldCreateUser: PHONE_SIGNUP_ENABLED/);
  assert.match(form, /POST_AUTH_DESTINATION = "\/dashboard\/select-clinic"/);
  assert.doesNotMatch(form, /signInWithOAuth/);
  assert.doesNotMatch(form, /type="email"/);
});

test("WhatsApp OTP is feature-gated and never presented as a fake default", () => {
  const form = read("app/login/login-form.tsx");
  const envExample = read(".env.example");

  assert.match(form, /NEXT_PUBLIC_ATLAS_WHATSAPP_OTP_ENABLED/);
  assert.match(form, /WHATSAPP_OTP_ENABLED \?/);
  assert.match(form, /channel: "whatsapp"/);
  assert.match(envExample, /NEXT_PUBLIC_ATLAS_WHATSAPP_OTP_ENABLED=false/);
});

test("existing email-era users migrate without creating replacement auth users", () => {
  const legacy = read("app/login/legacy/legacy-login-form.tsx");
  const legacyPage = read("app/login/legacy/page.tsx");
  const phoneChangeForm = read("app/dashboard/settings/phone-change-form.tsx");

  assert.match(legacy, /shouldCreateUser: false/);
  assert.match(legacyPage, /ATLAS_LEGACY_AUTH_ENABLED/);
  assert.match(phoneChangeForm, /auth\.updateUser\(\{ phone \}\)/);
  assert.match(phoneChangeForm, /type: "phone_change"/);
  assert.doesNotMatch(phoneChangeForm, /admin\.createUser|signUp\(/);
});

test("authentication and clinic membership remain separate concepts", () => {
  const chooser = read("app/dashboard/select-clinic/page.tsx");
  const inviteAuth = read("app/join/[token]/join-auth.tsx");
  const inviteFinish = read("app/join/[token]/finish/route.ts");

  assert.match(chooser, /if \(!clinics\?\.length\) redirect\("\/dashboard"\)/);
  assert.match(chooser, /if \(clinics\.length === 1\) redirect/);
  assert.match(chooser, /Choose a clinic/);
  assert.match(inviteAuth, /signInWithOtp/);
  assert.match(inviteFinish, /phone_confirmed_at/);
  assert.match(inviteFinish, /redeem_phone_staff_invite_link_service/);
  assert.match(inviteFinish, /p_user_id: userData\.user\.id/);
  assert.match(inviteFinish, /p_verified_phone_hash: verifiedPhoneHash/);
  assert.doesNotMatch(inviteFinish, /redeem_staff_invite_link_service/);
  assert.doesNotMatch(inviteAuth, /clinic_members/);
});

test("clinic access management uses secure join links and phone identity instead of normal email provisioning", () => {
  const staffPage = read("app/dashboard/staff/page.tsx");
  const inviteForm = read("app/dashboard/staff/invite-link-form.tsx");
  const inviteAction = read("app/dashboard/staff/invite-actions.ts");

  assert.match(staffPage, /InviteLinkForm/);
  assert.doesNotMatch(staffPage, /StaffProvisionForm/);
  assert.match(staffPage, /user\.phone \?\?/);
  assert.doesNotMatch(staffPage, /user\.email/);
  assert.match(inviteForm, /must verify the same number/);
  assert.match(inviteAction, /randomBytes\(32\)/);
  assert.match(inviteAction, /24 \* 60 \* 60 \* 1000/);
});

test("settings use phone identity and last-clinic deletion keeps the Atlas account for an explicit next choice", () => {
  const settings = read("app/dashboard/settings/page.tsx");
  const account = read("app/dashboard/settings/account/page.tsx");
  const deletion = read("app/dashboard/settings/delete/actions.ts");

  assert.match(settings, /userData\.user\.phone/);
  assert.doesNotMatch(settings, /userData\.user\.email/);
  assert.match(account, /userData\.user\.phone/);
  assert.doesNotMatch(account, /userData\.user\.email/);
  assert.doesNotMatch(deletion, /supabase\.auth\.signOut\(\)/);
  assert.match(deletion, /\/dashboard\/settings\/account\?notice=clinic_deleted/);
  assert.match(account, /Clinic deleted\. Your Atlas account is still active\./);
  assert.match(account, /Delete my Atlas account too/);
  assert.doesNotMatch(deletion, /admin\.deleteUser|deleteUser\(/);
});

test("auth readiness endpoint exposes only non-secret rollout booleans", () => {
  const readiness = read("lib/auth-readiness.ts");
  const route = read("app/api/auth/readiness/route.ts");

  assert.match(readiness, /supabasePhoneEnabled/);
  assert.match(readiness, /openPhoneSignupEnabled/);
  assert.match(readiness, /whatsappOtpEnabled/);
  assert.doesNotMatch(readiness, /SERVICE_ROLE|SECRET_KEY|access_token/);
  assert.match(route, /Cache-Control/);
  assert.match(route, /no-store/);
});
