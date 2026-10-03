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


test("published clinics have a direct public profile route and doctors link back to it", () => {
  const clinic = source("app/care/[clinicSlug]/page.tsx");
  const search = source("app/care/page.tsx");
  const doctor = source("app/care/[clinicSlug]/[doctorSlug]/page.tsx");

  assert.match(clinic, /get_public_clinic_profile/);
  assert.match(clinic, /list_public_doctors/);
  assert.match(clinic, /safeSlug\(clinicSlug\)/);
  assert.doesNotMatch(clinic, /\.from\("appointments"\)|patient_name|patient_phone|reminder_/);
  assert.match(search, /href=\{\`\/care\/\$\{doctor\.clinic_slug\}\`\}/);
  assert.match(doctor, /href=\{\`\/care\/\$\{profile\.clinic_slug\}\`\}/);
});


test("public doctor search safely rejects repeated query parameters", () => {
  const page = source("app/care/page.tsx");

  assert.match(page, /q\?: string \| string\[\]/);
  assert.match(page, /if \(typeof value !== "string"\) return ""/);
});


test("public clinic cards use theme-aware Atlas surfaces", () => {
  const clinic = source("app/care/[clinicSlug]/page.tsx");

  assert.match(clinic, /background:var\(--surface\)/);
  assert.doesNotMatch(clinic, /background:#fff/);
});


test("public care cards use theme-aware surfaces", () => {
  for (const path of [
    "app/care/page.tsx",
    "app/care/[clinicSlug]/[doctorSlug]/page.tsx",
    "app/care/[clinicSlug]/page.tsx",
  ]) {
    const page = source(path);
    assert.doesNotMatch(page, /background:#fff/);
    assert.match(page, /background:var\(--surface\)/);
  }
});
