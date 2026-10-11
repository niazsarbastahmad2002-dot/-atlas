import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/care/page.tsx", import.meta.url), "utf8");
const nav = readFileSync(new URL("../app/care/patient-nav.tsx", import.meta.url), "utf8");

test("Patient wordmark stays dark and visible against light navigation in all routes", () => {
  assert.match(nav, /atlas-patient-brand \.app-brand-word\{color:#153e2c!important;opacity:1!important;visibility:visible!important/);
  assert.match(nav, /atlas-patient-account-link\{[^}]*color:#164b33!important/);
  assert.match(nav, /focus-visible\{outline:3px solid #2c8760/);
});

test("Find Care has a prominent visual hero and meaningful tablet/mobile compositions", () => {
  assert.match(page, /className="atlas-care-hero"/);
  assert.match(page, /className="atlas-care-journey"/);
  assert.match(page, /atlas-care-hero\{display:grid;grid-template-columns:/);
  assert.match(page, /@media\(max-width:850px\)/);
  assert.match(page, /@media\(max-width:700px\)/);
  assert.match(page, /@media\(max-width:440px\)/);
  assert.match(page, /prefers-reduced-motion/);
});

test("Unpublished directory displays a truthful useful illustrated empty state", () => {
  assert.match(page, /className="atlas-care-empty atlas-care-empty-published"/);
  assert.match(page, /aria-labelledby="atlas-care-empty-heading"/);
  assert.match(page, /\{copy\.noPublished\}/);
  assert.match(page, /patientLocaleHref\("\/patient-account", locale\)/);
  assert.match(page, /stepContact: "Contact clinic"/);
  assert.match(page, /stepContact: "پەیوەندی بە کلینیک"/);
  assert.match(page, /stepContact: "تواصل مع العيادة"/);
});

test("Redesign preserves real directory, existing availability, and no live booking", () => {
  assert.match(page, /search_public_doctors_with_availability/);
  assert.match(page, /p_limit: 30/);
  assert.match(page, /nextAvailabilityLabel\(doctor\.next_available_at, locale\)/);
  assert.match(page, /atlas-care-next-opening/);
  assert.doesNotMatch(page, /fakeDoctor|mockDoctor|\.from\("appointments"\)|service_role|\/book\b/i);
});
