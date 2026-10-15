import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { patientSpecialtyDetails, publishedSubspecialties } from "../lib/patient-specialties.ts";

const explore = readFileSync(new URL("../app/explore/[kind]/page.tsx", import.meta.url), "utf8");

test("patient-friendly names stay tied to real specialty strings, not invented availability", () => {
  assert.equal(patientSpecialtyDetails("Orthopaedics", "en")?.name, "Bones and joints");
  assert.equal(patientSpecialtyDetails("Cardiology", "ku")?.name, "دڵ و خوێنبەرەکان");
  assert.equal(patientSpecialtyDetails("ENT", "bd")?.name, "گوھ و دفن و گەروو");
  assert.equal(patientSpecialtyDetails("Dermatology", "ar")?.name, "الجلدية");
  assert.equal(patientSpecialtyDetails("A specialty we do not know", "en"), null);
});

test("published focus areas stay under their matching published parent", () => {
  const published = [
    { specialty: "Orthopedics", subspecialty: "Sports Medicine" },
    { specialty: "orthopedics ", subspecialty: " sports medicine " },
    { specialty: "Orthopedics", subspecialty: "Foot and Ankle" },
    { specialty: "Cardiology", subspecialty: "Interventional Cardiology" },
    { specialty: "Orthopedics", subspecialty: null },
  ];
  assert.deepEqual(publishedSubspecialties(published, "Orthopedics"), ["Foot and Ankle", "Sports Medicine"]);
  assert.deepEqual(publishedSubspecialties(published, "Unknown"), []);
});

test("explore uses existing published-only search and no private joins or booking", () => {
  assert.match(explore, /search_public_doctors_with_availability/);
  assert.match(explore, /p_limit: 30/);
  assert.match(explore, /p_query: null/);
  assert.match(explore, /p_specialty: null/);
  assert.match(explore, /patientSpecialtyDetails\(item\.label, locale\)/);
  assert.match(explore, /publishedSubspecialties\(doctors, item\.label\)/);
  assert.match(explore, /specialty: item\.label, q: focus/);
  assert.match(explore, /clinic-listed focus areas are not independently credential-verified/);
  assert.match(explore, /patientLocaleHref\("\/care", locale, \{ specialty: name \}\)/);
  assert.doesNotMatch(explore, /service_role|\.from\("doctor_directory_profiles"\)|\.from\("appointments"\)|\/book\b|insert\(/);
});

test("specialty cards keep separate accessible links across screen sizes and RTL languages", () => {
  assert.match(explore, /<article className="atlas-explore-card atlas-explore-specialty"/);
  assert.match(explore, /className="atlas-explore-specialty-main"/);
  assert.match(explore, /className="atlas-explore-focus-links"/);
  assert.match(explore, /dir=\{meta\.direction\}/);
  assert.match(explore, /<bdi>\{focus\}<\/bdi>/);
  assert.match(explore, /@media\(max-width:700px\)/);
  for (const locale of ["ku", "bd", "ar", "en"] as const) {
    assert.ok(patientSpecialtyDetails("Neurology", locale)?.about);
  }
});
