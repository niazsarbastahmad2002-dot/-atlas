import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/care/page.tsx", import.meta.url), "utf8");

test("Patient discovery shows one prominent search with progressive filters in every language", () => {
  assert.match(page, /className="atlas-care-search-primary"/);
  assert.match(page, /type="search" defaultValue=\{query\}/);
  assert.match(page, /<details className="atlas-care-filters" open=\{Boolean\(city \|\| specialty \|\| sort === "soonest"\)\}>/);
  assert.match(page, /filters: "More filters"/);
  assert.match(page, /filters: "فلتەرەکان"/);
  assert.match(page, /filters: "فلتەرێن دی"/);
  assert.match(page, /filters: "خيارات البحث"/);
});

test("responsive doctor cards reveal only published real openings, and link to a read-only times page", () => {
  assert.match(page, /search_public_doctors_with_availability/);
  assert.match(page, /const nextOpening = doctor\.next_available_at/);
  assert.match(page, /\{nextOpening \? \(/);
  assert.match(page, /atlas-care-next-opening/);
  assert.ok(page.includes('`/care/${doctor.clinic_slug}/${doctor.doctor_slug}/times`'));
  assert.match(page, /@media\(max-width:700px\)\{\.atlas-care-results\{grid-template-columns:1fr\}/);
  assert.doesNotMatch(page, /doctor\.photo|fakeDoctor|hardcodedSpecialties/i);
});

test("discoverability UI keeps private patient and booking operations out of discovery", () => {
  assert.match(page, /p_limit: 30/);
  assert.match(page, /p_sort: sort/);
  assert.doesNotMatch(page, /\.from\("appointments"\)|\.from\("clinic_members"\)|\/book\b|service_role|patient_phone|patient_name/i);
});
