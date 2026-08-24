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

test("WhatsApp challenges use atomic database reservation verification and finalization", () => {
  const verification = read("lib/whatsapp-verification.ts");
  const migration = read("supabase/migrations/20260824050500_whatsapp_auth_atomic_identity_account_cascade.sql");

  assert.match(verification, /createHmac/);
  assert.match(verification, /reserve_whatsapp_auth_challenge_service/);
  assert.match(verification, /verify_whatsapp_auth_challenge_service/);
  assert.match(verification, /finalize_whatsapp_auth_challenge_service/);
  assert.match(verification, /OTP_TTL_MS = 10 \* 60 \* 1000/);
  assert.doesNotMatch(verification, /phoneCount|ipCount|timingSafeEqual/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /v_phone_count >= 6/);
  assert.match(migration, /v_ip_count >= 20/);
  assert.match(migration, /v_row\.attempts >= 5/);
  assert.match(migration, /superseded_at = now\(\)/);
  assert.match(migration, /verified_at = now\(\)/);
  assert.match(migration, /session_established_at = now\(\)/);
});

test("WhatsApp Cloud delivery is centralized and protected by an independent kill switch", () => {
  const cloud = read("lib/whatsapp-cloud.ts");
  const verification = read("lib/whatsapp-verification.ts");
  const staffSender = read("lib/whatsapp-staff-invite.ts");
  const env = read(".env.example");

  assert.match(cloud, /graph\.facebook\.com/);
  assert.match(cloud, /ATLAS_WHATSAPP_AUTH_ENABLED/);
  assert.match(cloud, /sendWhatsAppAuthenticationCode/);
  assert.match(cloud, /sendWhatsAppStaffInvite/);
  assert.match(cloud, /AbortSignal\.timeout\(12_000\)/);
  assert.match(verification, /sendWhatsAppAuthenticationCode/);
  assert.match(staffSender, /sendWhatsAppStaffInvite/);
  assert.doesNotMatch(staffSender, /graph\.facebook\.com/);
  assert.match(env, /ATLAS_WHATSAPP_AUTH_ENABLED=false/);
  assert.match(env, /WHATSAPP_WABA_ID=/);
});

test("verified WhatsApp phone resolves through the private identity index and opens a Supabase session", () => {
  const session = read("lib/whatsapp-session.ts");
  const verifyRoute = read("app/api/auth/whatsapp/verify/route.ts");
  const migration = read("supabase/migrations/20260824050500_whatsapp_auth_atomic_identity_account_cascade.sql");

  assert.match(session, /resolve_whatsapp_identity_service/);
  assert.match(session, /bind_whatsapp_identity_service/);
  assert.doesNotMatch(session, /listUsers/);
  assert.match(session, /@auth\.atlas\.invalid/);
  assert.match(session, /atlas_identity: "whatsapp_phone"/);
  assert.match(session, /generateLink\(\{/);
  assert.match(session, /token_hash: generated\.data\.properties\.hashed_token/);
  assert.match(verifyRoute, /establishWhatsAppAtlasSession/);
  assert.match(verifyRoute, /finalizeWhatsAppVerification/);
  assert.ok(verifyRoute.indexOf("establishWhatsAppAtlasSession") < verifyRoute.lastIndexOf("finalizeWhatsAppVerification"));
  assert.match(migration, /create table if not exists private\.whatsapp_phone_identities/);
  assert.match(migration, /user_id uuid not null unique references auth\.users\(id\) on delete cascade/);
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

test("receptionist invitation becomes redeemable only after WhatsApp accepts delivery", () => {
  const inviteAction = read("app/dashboard/staff/invite-actions.ts");
  const migration = read("supabase/migrations/20260824054000_staff_invite_activate_after_delivery.sql");

  assert.match(inviteAction, /create_phone_staff_invite_link_service/);
  assert.match(inviteAction, /sendReceptionistInviteWhatsApp/);
  assert.match(inviteAction, /activate_phone_staff_invite_link_service/);
  assert.match(inviteAction, /p_provider_message_id: sent\.messageId/);
  assert.match(migration, /sent_at is not null/);
  assert.match(migration, /revoked_at = now\(\)/);
  assert.match(migration, /id <> v_id/);
  assert.match(migration, /sent_at is null/);
});

test("permanent account deletion is atomic: Auth deletion cascades owned clinics", () => {
  const account = read("app/dashboard/settings/account/page.tsx");
  const deletion = read("app/dashboard/settings/account/actions.ts");
  const migration = read("supabase/migrations/20260824050500_whatsapp_auth_atomic_identity_account_cascade.sql");
  const manager = read("app/dashboard/settings/phone-number-manager.tsx");

  assert.match(account, /Delete Atlas account permanently/);
  assert.match(account, /brand-new account/);
  assert.match(deletion, /auth\.admin\.deleteUser\(userId\)/);
  assert.doesNotMatch(deletion, /from\("clinics"\)[\s\S]*\.delete\(\)/);
  assert.match(migration, /foreign key \(owner_id\) references auth\.users\(id\) on delete cascade/i);
  assert.match(deletion, /\/login\?notice=account_deleted/);
  assert.match(manager, /\/dashboard\/settings\/account/);
  assert.match(manager, /Account & deletion/);
});

test("sign-in phone changes use indexed WhatsApp identity and preserve the same user id", () => {
  const manager = read("app/dashboard/settings/phone-number-manager.tsx");
  const route = read("app/api/auth/whatsapp/change-phone/route.ts");

  assert.match(manager, /\/api\/auth\/whatsapp\/start/);
  assert.match(manager, /\/api\/auth\/whatsapp\/change-phone/);
  assert.doesNotMatch(manager, /auth\.updateUser|type: "phone_change"/);
  assert.match(route, /consumeWhatsAppVerification/);
  assert.match(route, /resolve_whatsapp_identity_service/);
  assert.match(route, /bind_whatsapp_identity_service/);
  assert.doesNotMatch(route, /listUsers/);
  assert.match(route, /updateUserById\(current\.data\.user\.id/);
  assert.match(route, /phone_in_use/);
  assert.match(route, /finalizeWhatsAppVerification/);
});

test("auth readiness exposes only safe release gates and never sender secret values", () => {
  const route = read("app/api/auth/readiness/route.ts");

  assert.match(route, /whatsappSenderConfigured/);
  assert.match(route, /whatsappAuthEnabled/);
  assert.match(route, /whatsappAuthReadyForAttempt/);
  assert.match(route, /dedicatedAuthHashSecretConfigured/);
  assert.match(route, /whatsappAuthTemplateNameConfigured/);
  assert.match(route, /Cache-Control/);
  assert.match(route, /no-store/);
  assert.doesNotMatch(route, /process\.env\.WHATSAPP_ACCESS_TOKEN\s*[,}]/);
});

test("Meta readiness tooling checks approved templates without printing the access token", () => {
  const script = read("scripts/whatsapp-meta-readiness.mjs");
  const pkg = read("package.json");

  assert.match(script, /AUTHENTICATION/);
  assert.match(script, /COPY_CODE/);
  assert.match(script, /staffInviteApproved/);
  assert.match(script, /releaseReady/);
  assert.match(script, /--require-live/);
  assert.doesNotMatch(script, /console\.log\([^\n]*token/);
  assert.match(pkg, /whatsapp:readiness/);
  assert.match(pkg, /whatsapp:prepare-templates/);
  assert.match(pkg, /whatsapp:release-gate/);
});
