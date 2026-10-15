import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const care = readFileSync(new URL("../app/care/page.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("patient search supports typed city and specialty with published-only browse suggestions", () => {
  assert.match(care, /const citySuggestions = Array\.from\(new Set\(/);
  assert.match(care, /const specialtySuggestions = Array\.from\(new Set\(/);
  assert.match(care, /results\.map\(\(doctor\) => doctor\.city\?\.trim\(\)\)/);
  assert.match(care, /results\.map\(\(doctor\) => doctor\.specialty\?\.trim\(\)\)/);
  assert.match(care, /name="city" dir="auto" list="atlas-patient-cities"/);
  assert.match(care, /name="specialty" dir="auto" list="atlas-patient-specialties"/);
  assert.match(care, /<datalist id="atlas-patient-cities">/);
  assert.match(care, /<datalist id="atlas-patient-specialties">/);
  assert.doesNotMatch(care, /e\.g\. Erbil|e\.g\. Orthopedics|مثلاً: أربيل|بۆ نموونە: هەولێر/);
});

test("common Atlas landing has two prominent separate experiences and original Atlas asset", () => {
  assert.match(home, /href="\/care"/);
  assert.match(home, /href="\/dashboard"/);
  assert.match(home, /src="\/atlas-icon\.svg"/);
  assert.match(home, /atlas-mode-icon/);
  assert.match(home, /atlas-local-link/);
  assert.match(home, /Run a Clinic or Center/);
});

test("patient discovery remains published-only and cannot book or claim appointments", () => {
  assert.match(care, /search_public_doctors_with_availability/);
  assert.match(care, /p_limit: 30/);
  assert.doesNotMatch(care, /\.from\("appointments"\)|patient_phone|service_role|insert\(/);
});
