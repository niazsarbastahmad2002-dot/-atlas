import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = source("app/patient/[token]/page.tsx");

test("My Appointments entry never carries the private appointment token into the account portal", () => {
  assert.match(page, /href=\{\`\/patient-account\?lang=\$\{locale\}\`\}/);
  assert.doesNotMatch(page, /patient-account\?[^"'\`]*token|patient-account\/\$\{token\}/);
});

test("patient account continuity is signed server-side and tied to the appointment token", () => {
  const marker = source("lib/patient-account-continuity.ts");
  const finalize = source("app/api/care/booking/finalize/route.ts");
  const manage = source("app/patient-account/api/appointments/[appointmentId]/manage/route.ts");

  assert.match(marker, /createHmac\("sha256", patientAccountContinuitySecret\(\)\)/);
  assert.match(marker, /atlas:patient-account-continuity:v1:\$\{token\}/);
  assert.match(marker, /timingSafeEqual/);
  assert.match(marker, /SUPABASE_SECRET_KEY/);
  assert.match(marker, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(finalize, /createPatientAccountContinuityMarker\(patientToken\)/);
  assert.match(manage, /createPatientAccountContinuityMarker\(patientToken\)/);
  assert.doesNotMatch(finalize, /account=1/);
  assert.doesNotMatch(manage, /set\("account", "1"\)/);
});

test("patient page trusts only a valid signed continuity marker", () => {
  assert.match(page, /verifyPatientAccountContinuityMarker\(token, query\.account\)/);
  assert.match(page, /const accountOwned = Boolean\(accountMarker\)/);
  assert.match(page, /\{accountOwned \? \([\s\S]*patient-account-entry/);
  assert.doesNotMatch(page, /query\.account === "1"/);
});

test("patient actions preserve continuity only after server verification", () => {
  const actions = source("app/patient/[token]/actions.ts");
  const returnViews = (page.match(/name="return_view"/g) ?? []).length;
  const returnAccounts = (page.match(/name="return_account"/g) ?? []).length;

  assert.equal(returnAccounts, returnViews);
  assert.ok(returnAccounts >= 4);
  assert.match(page, /name="return_account" value=\{accountMarker\}/);
  assert.match(actions, /verifyPatientAccountContinuityMarker\(token, marker\)/);
  assert.equal(
    (actions.match(/preservePatientAccountContinuity\(params, token, formData\)/g) ?? []).length,
    2,
  );
  assert.doesNotMatch(actions, /return_account"\) === "1"/);
});

test("patient account continuity remains localized and mobile-sized", () => {
  assert.match(page, /myAppointments: "My appointments"/);
  assert.match(page, /myAppointments: "مەوعیدەکانم"/);
  assert.match(page, /myAppointments: "وادەیێن من"/);
  assert.match(page, /myAppointments: "مواعيدي"/);
  assert.match(page, /patient-account-entry/);
  assert.match(page, /min-height: 48px/);
});
