import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("first clinic launch distinguishes private creation from joining by invitation", () => {
  const onboarding = source("app/dashboard/clinic-first-workspace.tsx");
  const dashboard = source("app/dashboard/page.tsx");

  assert.match(dashboard, /if \(!clinics\?\.length\)/);
  assert.match(dashboard, /<ClinicFirstWorkspace locale=\{locale\} error=\{messageError\}/);
  assert.match(onboarding, /<form action=\{createClinic\}/);
  assert.match(onboarding, /name="name" minLength=\{2\} maxLength=\{120\}/);
  assert.match(onboarding, /Signing in does not automatically join anyone else.s clinic/);
  assert.match(onboarding, /private operations workspace, not a verified or public listing/);
  assert.match(onboarding, /Do not upload IDs, medical licenses, or business documents here/);
  assert.match(onboarding, /stage\.ready \? t\.available : t\.planned/);
  assert.doesNotMatch(onboarding, /from\("clinic_members"\)|\.insert\(|\.update\(|createAdminClient/);
});

test("first clinic launch keeps Sorani, Badini, Arabic and English paths and mobile layout", () => {
  const onboarding = source("app/dashboard/clinic-first-workspace.tsx");

  for (const language of ["en", "ku", "bd", "ar"]) {
    assert.match(onboarding, new RegExp(`\\b${language}: \\{`));
  }
  assert.match(onboarding, /@media\(max-width:850px\)/);
  assert.match(onboarding, /@media\(max-width:540px\)/);
  assert.match(onboarding, /className="atlas-first-clinic-grid"/);
  assert.match(onboarding, /aria-labelledby="first-clinic-roadmap-heading"/);
  assert.match(onboarding, /<ClinicSetupNameInput/);
});
