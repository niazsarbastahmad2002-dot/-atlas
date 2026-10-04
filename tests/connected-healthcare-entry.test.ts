import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("home presents patient discovery and professional workspace as separate Atlas entry paths", () => {
  const page = source("app/page.tsx");
  assert.match(page, /atlas-patient-entry[^>]*href="\/care"|href="\/care"[^>]*atlas-patient-entry/);
  assert.match(page, /atlas-professional-entry[^>]*href="\/dashboard"|href="\/dashboard"[^>]*atlas-professional-entry/);
  assert.match(page, /patientTitle: "Find care"/);
  assert.match(page, /professionalTitle: "Clinic workspace"/);
  assert.match(page, /Patient discovery is public\. Clinic work stays private\./);
});

test("home keeps Atlas Local separate and does not invent a patient-account shortcut", () => {
  const page = source("app/page.tsx");
  assert.match(page, /href="\/atlas-local\.html"/);
  assert.match(page, /if \(data\.user\) redirect\("\/dashboard"\)/);
  assert.doesNotMatch(page, /localStorage|sessionStorage|role=patient|patient_profile/i);
});

test("connected profiles architecture records the patient identity authorization boundary", () => {
  const doc = source("docs/atlas-vision-connected-healthcare-profiles.md");
  assert.match(doc, /Patient ↔ Doctor ↔ Clinic ↔ Availability ↔ Appointment/);
  assert.match(doc, /does \*\*not\*\* currently have a reusable private patient profile\/account model/);
  assert.match(doc, /requires explicit authorization/);
  assert.match(doc, /Do not place patient profile fields in public directory tables/);
});
