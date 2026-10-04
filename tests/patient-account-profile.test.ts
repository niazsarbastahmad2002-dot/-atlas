import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("patient account profile editor reuses the verified account session and existing private profile", () => {
  const page = source("app/patient-account/page.tsx");
  const route = source("app/patient-account/api/profile/route.ts");

  assert.match(page, /action=\{\`\/patient-account\/api\/profile\?lang=\$\{locale\}\`\}/);
  assert.match(page, /name="display_name"/);
  assert.match(page, /name="preferred_language"/);
  assert.match(route, /patientAccountCookieName/);
  assert.match(route, /resolvePatientAccountSession\(admin, accountToken\)/);
  assert.match(route, /\.from\("patient_profiles"\)/);
  assert.match(route, /user_id: session\.user_id/);
  assert.doesNotMatch(route, /clinic_members|appointments|auth\.admin|updateUser/);
});

test("patient profile save validates the same minimal identity fields used by self-booking", () => {
  const route = source("app/patient-account/api/profile/route.ts");

  assert.match(route, /value\.length >= 2/);
  assert.match(route, /value\.length <= 120/);
  assert.match(route, /value\.trim\(\) === value/);
  assert.match(route, /!\/[\\u0000-\\u001f\\u007f\]\/\.test\(value\)/);
  assert.match(route, /isUiLocale\(preferredLanguage\)/);
  assert.match(route, /display_name: displayName/);
  assert.match(route, /preferred_language: preferredLanguage/);
});

test("patient profile save is bounded, same-origin protected, rate limited, and fail-closed", () => {
  const route = source("app/patient-account/api/profile/route.ts");

  assert.match(route, /origin && origin !== request\.nextUrl\.origin/);
  assert.match(route, /contentLength > 4096/);
  assert.match(route, /patient-account-profile:\$\{session\.user_id\}/);
  assert.match(route, /consume_patient_link_rate_limit/);
  assert.match(route, /profile_failed/);
  assert.match(route, /session_expired/);
});

test("patient profile remains small, private, multilingual, and does not make phone editable", () => {
  const page = source("app/patient-account/page.tsx");

  assert.match(page, /profileTitle: "Your profile"/);
  assert.match(page, /profileTitle: "زانیارییەکانت"/);
  assert.match(page, /profileTitle: "زانیارییێن تە"/);
  assert.match(page, /profileTitle: "معلوماتك"/);
  assert.match(page, /Your patient profile stays private/);
  assert.doesNotMatch(page, /name="phone"|type="tel"/);
  assert.match(page, /patient-account-profile-form button\{min-height:48px\}/);
});
