import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const form = source("app/patient-account/login-form.tsx");
const page = source("app/patient-account/page.tsx");

test("patient verification explains privacy in every Atlas Patient language", () => {
  for (const phrase of [
    "Verification protects your private appointments",
    "بۆ پاراستنی مەوعیدە تایبەتییەکانت",
    "بۆ پاراستنا وادەیێن تایبەت",
    "نتحقق من ملكية رقم الموبايل",
  ]) {
    assert.ok(form.includes(phrase), `Missing localized verification explanation: ${phrase}`);
  }
  assert.match(form, /t\.why/);
  assert.match(form, /t\.privacy/);
  assert.match(form, /maskPhone\(verifiedPhone\)/);
  assert.match(form, /<bdi dir="ltr" lang="en">\{maskPhone\(verifiedPhone\)\}<\/bdi>/);
});

test("patient verification has accessible loading, expiration, resend, and retry states", () => {
  assert.match(form, /aria-busy=\{busy\}/);
  assert.match(form, /role="status"/);
  assert.match(form, /role="alert"/);
  assert.match(form, /isExpiredCodeError\(verifyError\)/);
  assert.match(form, /setCodeExpired\(expired\)/);
  assert.match(form, /expired \? t\.expiredCode : t\.incorrectCode/);
  assert.match(form, /t\.network/);
  assert.match(form, /t\.resent/);
  assert.match(form, /t\.codeTip/);
  assert.match(form, /disabled=\{busy \|\| codeExpired\}/);
  assert.match(form, /disabled=\{busy \|\| cooldown > 0\}/);
  assert.match(form, /setInterval\(update, 1000\)/);
  assert.match(form, /requestInFlight\.current/);
  assert.match(page, /\.patient-account-login-actions button\{min-height:48px\}/);
});

test("verification retains the proven patient identity and session boundaries", () => {
  assert.match(form, /createEphemeralVerificationClient\(\)/);
  assert.match(form, /shouldCreateUser: allowSignup/);
  assert.match(form, /supabase\.auth\.verifyOtp\(/);
  assert.match(form, /type: "sms"/);
  assert.match(form, /"\/patient-account\/api\/session"/);
  assert.match(form, /window\.location\.replace\(`\/patient-account\?lang=\$\{locale\}`\)/);
  assert.match(form, /if \(!ready\)/);
  assert.doesNotMatch(form, /localStorage|sessionStorage|setCookie|service_role|clinic_members/);
  assert.doesNotMatch(form, /createClient\(|signUp\(|updateUser\(/);

  const session = source("app/patient-account/api/session/route.ts");
  assert.match(session, /admin\.auth\.getUser\(token\)/);
  assert.match(session, /issuePatientAccountSession\(admin, user\.id\)/);
  const booking = source("app/api/care/booking/finalize/route.ts");
  assert.match(booking, /issuePatientAccountSession\(admin, user\.id\)/);
});
