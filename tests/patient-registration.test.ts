import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canRegisterPatient } from "../lib/patient-registration.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("patient registration requires every existing auth and rollout gate", () => {
  const ready = {
    reachable: true,
    supabasePhoneEnabled: true,
    openPhoneSignupEnabled: true,
    signupDisabled: false,
  };

  assert.equal(canRegisterPatient(ready), true);
  assert.equal(canRegisterPatient({ ...ready, reachable: false }), false);
  assert.equal(canRegisterPatient({ ...ready, supabasePhoneEnabled: false }), false);
  assert.equal(canRegisterPatient({ ...ready, openPhoneSignupEnabled: false }), false);
  assert.equal(canRegisterPatient({ ...ready, signupDisabled: true }), false);
});

test("standalone registration uses existing verified patient-account flow only", () => {
  const page = read("app/patient-register/page.tsx");
  const form = read("app/patient-account/login-form.tsx");
  const session = read("app/patient-account/api/session/route.ts");

  assert.match(page, /canRegisterPatient\(readiness\)/);
  assert.match(page, /signupAvailable \? \(/);
  assert.match(page, /<PatientAccountLoginForm/);
  assert.match(page, /allowSignup=\{true\}/);
  assert.match(page, /registration=\{true\}/);
  assert.match(form, /registration \? t\.register : t\.send/);
  assert.match(form, /registration \? t\.verifyRegister : t\.verify/);
  assert.match(form, /registration \? t\.registerFailed : t\.failed/);
  assert.match(form, /shouldCreateUser: allowSignup/);
  assert.match(form, /signInWithOtp\(/);
  assert.match(form, /verifyOtp\(/);
  assert.match(form, /\/patient-account\/api\/session/);
  assert.match(session, /phone_confirmed_at/);
  assert.match(session, /issuePatientAccountSession/);
  assert.doesNotMatch(page, /signInWithOtp|createUser|createAdminClient|clinic_members|\.rpc\(/);
});

test("registration stays multilingual, RTL-ready, accessible, and unindexed", () => {
  const page = read("app/patient-register/page.tsx");
  const portal = read("app/patient-account/page.tsx");

  for (const locale of ["en", "ku", "bd", "ar"]) {
    assert.match(page, new RegExp(`  ${locale}: \\{`));
  }

  assert.match(page, /lang=\{localeMeta\.language\}/);
  assert.match(page, /dir=\{localeMeta\.direction\}/);
  assert.match(page, /aria-current=\{locale === language/);
  assert.match(page, /@media\(max-width:800px\)/);
  assert.match(page, /@media\(max-width:520px\)/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(portal, /signInReady && allowSignup/);
  assert.match(portal, /\/patient-register\?lang=/);
});
