import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const care = source("app/care/page.tsx");
const clinics = source("app/care/patient-clinic-browse.tsx");
const preview = source("app/care/marketplace-preview/page.tsx");
const style = source("app/care/patient-clinic-browse.css");

test("clinic browse is sourced only from published doctors already returned by existing public search", () => {
  assert.match(care, /search_public_doctors_with_availability/);
  assert.match(care, /const browseClinics: PatientClinicBrowseItem\[\] = hasSearch \? \[\] : Array\.from/);
  assert.match(care, /new Map\(results\.map/);
  assert.match(care, /doctor\.clinic_slug/);
  assert.match(care, /\.slice\(0, 6\)/);
  assert.match(care, /!error && browseClinics\.length/);
  assert.doesNotMatch(care, /list_public_clinics|\.from\("clinics"\)|\.from\("appointments"\)/);
});

test("patient can reach legitimate clinics without gaining membership or seeing fabricated results", () => {
  assert.match(clinics, /patientLocaleHref\(`\/care\/\$\{clinic\.clinic_slug\}`, locale\)/);
  assert.match(clinics, /preview\s*\?\s*<div/);
  assert.match(clinics, /aria-disabled="true"/);
  assert.doesNotMatch(clinics, /\/book|service_role|patient_phone|clinic_members|supabase|\.rpc\(/i);
  assert.match(preview, /VERCEL_ENV !== "preview"/);
  assert.match(preview, /<PatientClinicBrowse/);
  assert.match(preview, /preview\s*\/>/);
});

test("clinic cards remain accessible, responsive and multilingual", () => {
  for (const label of ["Explore clinics", "کلینیکەکان بدۆزەرەوە", "کلینیکان بدیتەوە", "تصفّح العيادات"]) assert.ok(care.includes(label));
  assert.match(style, /@media\(max-width:1000px\)/);
  assert.match(style, /@media\(max-width:640px\)/);
  assert.match(style, /min-height:84px/);
  assert.match(style, /focus-visible/);
  assert.match(style, /var\(--surface\)/);
  assert.match(clinics, /dir="auto"/);
});
