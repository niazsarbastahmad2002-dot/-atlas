import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const page = readFileSync(join(process.cwd(), "app/care/page.tsx"), "utf8");

test("Find Care offers both choices in all four patient locales", () => {
  assert.match(page, /const findCarePathCopy: Record<UiLocale,/);
  for (const locale of ["en", "ku", "bd", "ar"]) {
    assert.match(page, new RegExp(`  ${locale}: \\\{\\s*directTitle: "[^"]+"[\\s\\S]*?guidedTitle: "[^"]+"`));
  }
  assert.match(page, /<h2>\{paths\.directTitle\}<\/h2>/);
  assert.match(page, /<h2 id="atlas-care-guided-title">\{paths\.guidedTitle\}<\/h2>/);
  assert.match(page, /id="atlas-care-direct-search"/);
  assert.match(page, /aria-labelledby="atlas-care-guided-title"/);
});

test("Complaint navigation cannot run before its clinical review feature gate", () => {
  assert.match(page, /process\.env\.ATLAS_PATIENT_COMPLAINT_GUIDE_ENABLED === "true"\s*\?\s*\(/);
  assert.match(page, /patientLocaleHref\("\/care\/complaints", locale\)/);
  assert.match(page, /patientLocaleHref\("\/explore\/specialties", locale\)/);
  assert.match(page, /\{paths\.reviewPending\}/);
});

test("Find Care retains genuine published provider search and advanced filters", () => {
  assert.match(page, /search_public_doctors_with_availability/);
  assert.match(page, /p_limit: 30/);
  assert.match(page, /const results = error \? \[\] : \(data \?\? \[\]\)/);
  assert.match(page, /className="atlas-care-filters"/);
  assert.match(page, /name="q"/);
  assert.match(page, /name="city"/);
  assert.match(page, /name="specialty"/);
  assert.match(page, /name="sort"/);
  assert.match(page, /doctor\.next_available_at \? nextAvailabilityLabel/);
  assert.match(page, /@media\(max-width:700px\)/);
});
