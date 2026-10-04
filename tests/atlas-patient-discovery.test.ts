import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/care/page.tsx", import.meta.url), "utf8");

test("care discovery is clearly the Atlas Patient front door", () => {
  assert.match(page, /atlas-patient-brand/);
  assert.match(page, />Patient<\/span>/);
  assert.match(page, /href="\/patient-account"/);
  assert.match(page, /myAppointments: "My appointments"/);
  assert.match(page, /myAppointments: "مەوعیدەکانم"/);
  assert.match(page, /myAppointments: "وادەیێن من"/);
  assert.match(page, /myAppointments: "مواعيدي"/);
});

test("visual browse choices come only from legitimately published doctor results", () => {
  assert.match(page, /const browseSpecialties = hasSearch[\s\S]*results[\s\S]*doctor\.specialty/);
  assert.match(page, /const hasAvailableSoon = !hasSearch && results\.some/);
  assert.match(page, /href=\{\`\/care\?specialty=\$\{encodeURIComponent\(item\)\}&sort=soonest\`\}/);
  assert.match(page, /href="\/care\?sort=soonest"/);
  assert.doesNotMatch(page, /hardcodedSpecialties|fakeDoctor/i);
});

test("patient discovery does not fake a photo when the public API does not expose one", () => {
  assert.match(page, /atlas-care-doctor-mark/);
  assert.match(page, /doctor\.doctor_name\.trim\(\)\.slice\(0, 1\)/);
  assert.doesNotMatch(page, /<img|next\/image|doctor\.photo|avatar_url/i);
});

test("zero published doctors still leaves a useful patient experience", () => {
  assert.match(page, /noPublished: "No doctors are published on Atlas yet\."/);
  assert.match(page, /noPublishedHelp:/);
  assert.match(page, /atlas-care-empty-published/);
  assert.match(page, /href="\/patient-account"/);
});

test("existing safe search and real availability contract remain intact", () => {
  assert.match(page, /search_public_doctors_with_availability/);
  assert.match(page, /p_limit: 30/);
  assert.match(page, /p_sort: sort/);
  assert.match(page, /doctor\.next_available_at/);
  assert.match(page, /<select name="sort" defaultValue=\{sort\}>/);
  assert.doesNotMatch(page, /\.from\("appointments"\)|patient_name|patient_phone|clinic_members/);
});
