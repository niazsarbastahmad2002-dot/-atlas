import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/explore/[kind]/page.tsx", import.meta.url), "utf8");

test("clinic directory searches only the authorized published-doctor RPC", () => {
  assert.match(page, /search_public_doctors_with_availability/);
  assert.match(page, /p_query: clinicQuery \|\| null/);
  assert.match(page, /p_city: clinicCity \|\| null/);
  assert.match(page, /p_limit: 30/);
  assert.match(page, /const clinicQuery = kind === "clinics"/);
  assert.match(page, /const clinicCity = kind === "clinics"/);
  assert.doesNotMatch(page, /\.from\("clinics"\)|\.from\("appointments"\)|\.from\("clinic_members"\)|service_role|patient_phone/);
});

test("clinic filters reject repeated parameters and preserve language", () => {
  assert.match(page, /q\?: string \| string\[\]/);
  assert.match(page, /city\?: string \| string\[\]/);
  assert.match(page, /typeof value === "string"/);
  assert.match(page, /value\.trim\(\)\.slice\(0, max\)/);
  assert.match(page, /name="q" type="search" dir="auto" maxLength=\{80\}/);
  assert.match(page, /name="city" type="search" dir="auto" maxLength=\{100\}/);
  assert.match(page, /name="lang" value=\{locale\}/);
  assert.match(page, /patientLocaleHref\("\/explore\/clinics", locale\)/);
});

test("clinic cards link to published clinic profiles, display public location and doctors", () => {
  assert.match(page, /doctor\.clinic_slug && doctor\.clinic_name/);
  assert.match(page, /patientLocaleHref\(`\/care\/\$\{doctor\.clinic_slug\}`, locale\)/);
  assert.match(page, /doctor\.clinic_slug === clinic\.key && doctor\.doctor_slug && doctor\.doctor_name/);
  assert.match(page, /clinic\.detail\.length/);
  assert.match(page, /clinic\.doctors\.map/);
  assert.match(page, /clinic\.href/);
  assert.doesNotMatch(page, /\/book|Book now|verified clinic|verified address|fakeClinic/i);
});

test("clinic browsing discloses sampling and verification limits in all four languages", () => {
  for (const locale of ["en", "ku", "bd", "ar"]) {
    assert.match(page, new RegExp(`\\b${locale}: \\{`));
  }
  assert.match(page, /not a complete clinic directory/);
  assert.match(page, /not been independently verified/);
  assert.match(page, /لیستی تەواوی کلینیکەکان نییە/);
  assert.match(page, /ليستا هەمی کلینیکان|لیستا هەمی کلینیکان/);
  assert.match(page, /مو دليل كامل للعيادات/);
  assert.match(page, /hasClinicFilters \? t\.noMatch : t\.empty/);
});

test("clinic page is keyboard-friendly and mobile responsive without touching cities or specialties routes", () => {
  assert.match(page, /role="search"/);
  assert.match(page, /atlas-clinic-directory-form input:focus-visible/);
  assert.match(page, /@media\(max-width:480px\)/);
  assert.match(page, /kind === "clinics" \? \(/);
  assert.match(page, /"specialties", "locations"/);
  assert.match(page, /AtlasPatientNav/);
});
