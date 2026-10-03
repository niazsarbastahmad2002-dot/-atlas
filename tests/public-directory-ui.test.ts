import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public care search uses only the explicit directory RPC", () => {
  const page = source("app/care/page.tsx");

  assert.match(page, /search_public_doctors/);
  assert.match(page, /p_limit: 30/);
  assert.match(page, /maxLength=\{80\}/);
  assert.match(page, /maxLength=\{100\}/);
  assert.match(page, /maxLength=\{120\}/);
  assert.doesNotMatch(page, /\.from\("appointments"\)|\.from\("clinic_members"\)|patient_name|patient_phone|reminder_/);
});

test("public doctor profile reads only a published-profile RPC", () => {
  const page = source("app/care/[clinicSlug]/[doctorSlug]/page.tsx");

  assert.match(page, /get_public_doctor_profile/);
  assert.match(page, /safeSlug\(clinicSlug\)/);
  assert.match(page, /safeSlug\(doctorSlug\)/);
  assert.doesNotMatch(page, /\.from\("appointments"\)|\.from\("clinic_members"\)|patient_name|patient_phone|reminder_/);
});

test("public directory draft includes all four Atlas interface languages", () => {
  const search = source("app/care/page.tsx");
  const profile = source("app/care/[clinicSlug]/[doctorSlug]/page.tsx");

  for (const locale of ["en", "ku", "bd", "ar"]) {
    assert.match(search, new RegExp(`\\b${locale}: \\{`));
    assert.match(profile, new RegExp(`\\b${locale}: \\{`));
  }
  assert.match(search, /LoginLanguagePicker/);
});


test("Atlas home gives patients a direct path into discovery", () => {
  const home = source("app/page.tsx");
  assert.match(home, /href="\/care"/);
  assert.match(home, /Looking for a doctor\? Find care/);
  assert.match(home, /پزیشک دەگەڕێیت؟ پزیشک بدۆزەرەوە/);
  assert.match(home, /تبحث عن طبيب؟ ابحث عن رعاية/);
});


test("public doctor search safely rejects repeated query parameters", () => {
  const page = source("app/care/page.tsx");

  assert.match(page, /q\?: string \| string\[\]/);
  assert.match(page, /if \(typeof value !== "string"\) return ""/);
});
