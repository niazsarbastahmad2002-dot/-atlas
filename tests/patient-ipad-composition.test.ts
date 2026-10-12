import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const care = readFileSync(new URL("../app/care/page.tsx", import.meta.url), "utf8");
test("iPad Patient hero uses one full-width search and compact three-step journey", () => {
  assert.match(care, /@media\(max-width:1200px\)/);
  assert.match(care, /\.atlas-care-journey-steps\{width:100%;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(care, /\.atlas-care-hero\{grid-template-columns:minmax\(0,1fr\) 230px\}/);
  assert.doesNotMatch(care, /className="atlas-care-orbit/);
});
test("empty state uses the same Atlas icon as the header, not a giant decorative ring", () => {
  assert.match(care, /atlas-care-empty-symbol"><img src="\/atlas-icon\.svg" width="64"/);
  assert.doesNotMatch(care, /className="atlas-care-empty-ring"/);
  assert.match(care, /noPublished: "No doctors are published on Atlas yet\."/);
  assert.match(care, /patientLocaleHref\("\/patient-account", locale\)/);
});
test("the visual correction preserves published data, real times, and dormant booking", () => {
  assert.match(care, /search_public_doctors_with_availability/);
  assert.match(care, /nextAvailabilityLabel\(doctor\.next_available_at, locale\)/);
  assert.doesNotMatch(care, /\.from\("appointments"\)|\/book\b|service_role/);
});
