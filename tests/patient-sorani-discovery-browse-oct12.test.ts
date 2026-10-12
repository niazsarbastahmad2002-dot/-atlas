import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const care = read("app/care/page.tsx");
const explore = read("app/explore/[kind]/page.tsx");

test("Screenshot-reported Sorani city and specialty placeholders use everyday patient language", () => {
  assert.match(care, /cityPlaceholder: "ناوی شار بنووسە"/);
  assert.match(care, /specialtyPlaceholder: "پسپۆڕی بنووسە"/);
  assert.match(care, /title: "دکتۆرێک بدۆزەوە"/);
  assert.match(care, /filters: "گەڕانی وردتر"/);
  assert.doesNotMatch(care, /بە ناوی شار بگەڕێ|بە پسپۆڕی بگەڕێ/);
  assert.match(care, /<input name="city" dir="auto"/);
  assert.match(care, /<input name="specialty" dir="auto"/);
});

test("There are three separate browse URLs reachable from Patient homepage in all four languages", () => {
  for (const path of ["/explore/clinics", "/explore/specialties", "/explore/locations"]) {
    assert.ok(care.includes(`patientLocaleHref("${path}", locale)`));
  }
  assert.match(explore, /type ExploreKind = "clinics" \| "specialties" \| "locations"/);
  assert.match(explore, /isExploreKind\(kind\)/);
  assert.match(explore, /<AtlasPatientNav locale=\{locale\}/);
  assert.match(explore, /lang=\{meta\.language\} dir=\{meta\.direction\}/);
  for (const label of ["Clinics", "کلینیکەکان", "کلینیک", "العيادات", "Specialties", "پسپۆڕییەکان", "الاختصاصات", "Cities", "شارەکان", "المدن"]) {
    assert.ok(explore.includes(label));
  }
});

test("New pages only derive listings from existing publication-gated public search, never private records", () => {
  assert.match(explore, /search_public_doctors_with_availability/);
  assert.match(explore, /p_limit: 30/);
  assert.match(explore, /doctors\.filter\(\(doctor\) => doctor\.clinic_slug && doctor\.clinic_name\)/);
  assert.match(explore, /doctors\.map\(\(doctor\) => doctor\.specialty\?\.trim\(\)\)/);
  assert.match(explore, /doctors\.map\(\(doctor\) => doctor\.city\?\.trim\(\)\)/);
  assert.match(explore, /item\.detail\.map/);
  assert.match(explore, /<bdi>\{item\.label\}<\/bdi>/);
  assert.doesNotMatch(explore, /supabase\.from\(|service_role|createAdminClient|\.from\("appointments"\)|patient_phone|hardcodedDoctors|Dr\. Example/);
  assert.match(explore, /not a complete directory/);
  assert.match(explore, /error \? <p className="notice notice-error"/);
});

test("Browse navigation and mobile styles remain touch-friendly and localized", () => {
  assert.match(care, /atlas-care-more-pages/);
  assert.match(care, /min-height:48px/);
  assert.match(explore, /@media\(max-width:700px\)/);
  assert.match(explore, /@media\(max-width:370px\)/);
  assert.match(explore, /aria-current=\{kind === tab \? "page"/);
  assert.doesNotMatch(explore, /createAppointment|insert\(|update\(|delete\(/);
});
