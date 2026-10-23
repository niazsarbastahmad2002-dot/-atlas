import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { publishedSubspecialties } from "../lib/patient-specialties.ts";

const explore = readFileSync(new URL("../app/explore/[kind]/page.tsx", import.meta.url), "utf8");

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
  assert.match(explore, /p_query: clinicQuery \\|\\| null/);
  assert.match(explore, /p_specialty: null/);
  assert.doesNotMatch(explore, /patientSpecialtyDetails\(item\.label, locale\)/);
  assert.match(explore, /<bdi>\{item\.label\}<\/bdi>/);
  assert.doesNotMatch(explore, /details\.about/);
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
});
