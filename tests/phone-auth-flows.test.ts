import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("OTP login has incorrect-expired, rate-limit, resend cooldown and loading states", () => {
  const login = read("app/login/login-form.tsx");
  const otpField = read("app/components/otp-code-field.tsx");

  assert.match(login, /incorrect or expired/);
  assert.match(login, /rateLimited/);
  assert.match(login, /remainingCooldown\(\)/);
  assert.match(login, /rememberCooldown\(60\)/);
  assert.match(login, /copy\.resend/);
  assert.match(login, /copy\.sending/);
  assert.match(login, /copy\.verifying/);
  assert.match(login, /<OtpCodeField/);
  assert.match(otpField, /autoComplete="one-time-code"/);
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
  const form = read("app/dashboard/settings/phone-change-form.tsx");

  assert.match(form, /auth\.updateUser\(\{ phone \}\)/);
  assert.match(form, /auth\.verifyOtp\(\{/);
  assert.match(form, /type: "phone_change"/);
  assert.match(form, /phone === normalizedCurrentPhone/);
  assert.doesNotMatch(form, /admin\.updateUserById/);
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

test("last-clinic deletion preserves the auth account and keeps the session for an explicit account choice", () => {
  const deletion = read("app/dashboard/settings/delete/actions.ts");
  const account = read("app/dashboard/settings/account/page.tsx");

  assert.match(deletion, /from\("clinics"\)\s*\.delete\(\)/);
  assert.doesNotMatch(deletion, /auth\.signOut\(\)/);
  assert.match(deletion, /\/dashboard\/settings\/account\?notice=clinic_deleted/);
  assert.match(account, /Clinic deleted\. Your Atlas account is still active\./);
  assert.match(account, /Keep my Atlas account \/ Create a clinic later/);
  assert.match(account, /Delete my Atlas account too/);
  assert.doesNotMatch(deletion, /auth\.admin\.deleteUser/);
});

test("temporary email fallback safely recreates a deleted account while SMS is unavailable", () => {
  const page = read("app/login/page.tsx");
  const legacy = read("app/login/legacy/legacy-login-form.tsx");
  const route = read("app/api/auth/temporary-email/route.ts");

  assert.match(page, /legacyFallbackEnabled = !phoneFlowEnabled && readiness\?\.supabaseEmailEnabled === true/);
  assert.match(page, /<LegacyLoginForm locale=\{locale\} \/>/);
  assert.doesNotMatch(page, /: accountDeleted \? \(/);
  assert.match(legacy, /fetch\("\/api\/auth\/temporary-email"/);
  assert.match(legacy, /JSON\.stringify\(\{ email, locale \}\)/);
  assert.match(legacy, /confirmTitle: "Is this email correct\?"/);
  assert.match(legacy, /setConfirming\(true\)/);
  assert.match(legacy, /sendConfirmedEmail/);
  assert.doesNotMatch(legacy, /signInWithOtp/);
  assert.match(legacy, /rate_limited/);
  assert.match(legacy, /not_authorized/);
  assert.match(route, /admin\.auth\.admin\.createUser/);
  assert.match(route, /user_metadata: \{ atlas_ui_language: locale \}/);
  assert.match(route, /admin\.auth\.signInWithOtp/);
  assert.match(route, /shouldCreateUser: false/);
  assert.match(route, /over_email_send_rate_limit/);
  assert.match(route, /email_address_not_authorized/);
  assert.match(route, /redirectTo\.searchParams\.set\("next", "\/dashboard\/select-clinic"\)/);
  assert.match(route, /redirectTo\.searchParams\.set\("atlas_email_locale", locale\)/);
  assert.match(route, /readiness\.supabasePhoneEnabled/);
  assert.match(route, /!readiness\.supabaseEmailEnabled/);
  assert.match(legacy, /ku:\s*\{/);
  assert.match(legacy, /bd:\s*\{/);
  assert.match(legacy, /ar:\s*\{/);
});


test("phone change distinguishes request failures from verification failures in every Atlas language", () => {
  const form = read("app/dashboard/settings/phone-change-form.tsx");
  assert.match(form, /requestFailed: string/);
  assert.match(form, /verifyFailed: string/);
  assert.match(form, /could not verify that code/);
  assert.match(form, /نەیتوانی کۆدەکە پشتڕاست بکاتەوە/);
  assert.match(form, /نەشیا کۆدی پشتڕاست بکەت/);
  assert.match(form, /تعذر التحقق من الرمز/);
  assert.match(form, /setError\(copy\.verifyFailed\)/);
});


test("phone change verification exposes a direct recovery path to request another code", () => {
  const form = read("app/dashboard/settings/phone-change-form.tsx");
  assert.match(form, /Use a different number \/ send a new code/);
  assert.match(form, /setStep\("phone"\)/);
  assert.match(form, /setPendingPhone\(""\)/);
  assert.match(form, /setToken\(""\)/);
  assert.match(form, /\{copy\.back\}<\/button>/);
});


test("OTP paste failures are visible and localized across login and phone change", () => {
  const login = read("app/login/login-form.tsx");
  const form = read("app/dashboard/settings/phone-change-form.tsx");
  const otpField = read("app/components/otp-code-field.tsx");

  assert.match(otpField, /onPasteFailure\?: \(\) => void/);
  assert.match(otpField, /onPasteFailure\?\.\(\)/);
  assert.match(login, /Atlas could not paste a valid code/);
  assert.match(login, /نەیتوانی کۆدەکە دابنێت/);
  assert.match(login, /نەشیا کۆدی دابنێت/);
  assert.match(login, /تعذر لصق رمز صالح/);
  assert.match(form, /pasteFailed: string/);
  assert.match(form, /Atlas could not paste a valid code/);
  assert.match(login, /onPasteFailure=\{\(\) => setError\(copy\.pasteFailed\)\}/);
  assert.match(form, /onPasteFailure=\{\(\) => setError\(copy\.pasteFailed\)\}/);
});


test("passkey-disabled guidance stays correct across available sign-in methods", () => {
  const passkey = read("app/dashboard/settings/passkey-manager.tsx");

  assert.match(passkey, /Your normal Atlas sign-in is still available/);
  assert.match(passkey, /چوونەژوورەوەی ئاسایی Atlas هەر بەردەستە/);
  assert.match(passkey, /چوونەژوورا ئاسایی یا Atlas هێشتا بەردەستە/);
  assert.match(passkey, /تسجيل الدخول العادي إلى Atlas ما زال متاحاً/);
  assert.doesNotMatch(passkey, /Phone verification still works normally|Email sign-in still works normally/);
});
