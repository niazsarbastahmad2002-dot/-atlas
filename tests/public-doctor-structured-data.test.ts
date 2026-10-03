import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(
  new URL("../app/care/[clinicSlug]/[doctorSlug]/page.tsx", import.meta.url),
  "utf8",
);

test("public doctor profile emits Physician JSON-LD from published fields only", () => {
  assert.match(page, /"@type": "Physician"/);
  assert.match(page, /name: profile\.doctor_name/);
  assert.match(page, /description: profile\.bio \|\| undefined/);
  assert.match(page, /telephone: profile\.public_phone \|\| undefined/);
  assert.match(page, /knowsAbout: \[profile\.specialty, profile\.subspecialty\]\.filter\(Boolean\)/);
  assert.match(page, /"@type": "MedicalClinic"/);
  assert.match(page, /name: profile\.clinic_name/);
});

test("structured address uses only explicitly public directory fields", () => {
  assert.match(page, /streetAddress: profile\.address_text \|\| undefined/);
  assert.match(page, /addressLocality: profile\.city \|\| undefined/);
  assert.match(page, /addressRegion: profile\.area \|\| undefined/);
  assert.match(page, /addressCountry: profile\.country_code \|\| undefined/);
  assert.doesNotMatch(page, /patient_name|patient_phone|appointment_at|reminder_language/);
});

test("JSON-LD serialization is escaped before entering script HTML", () => {
  assert.match(page, /JSON\.stringify\(physicianStructuredData\)\.replace\(\/<\/g, "\\\\u003c"\)/);
  assert.match(page, /type="application\/ld\+json"/);
  assert.match(page, /dangerouslySetInnerHTML=\{\{ __html: physicianStructuredDataJson \}\}/);
});

test("structured data does not invent ratings, credentials, or booking claims", () => {
  assert.doesNotMatch(page, /aggregateRating|reviewCount|ratingValue|usNPI|award|credential/);
  assert.doesNotMatch(page, /isAcceptingNewPatients/);
});
