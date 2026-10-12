import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const nav = source("app/care/patient-nav.tsx");
const care = source("app/care/page.tsx");
const language = source("app/care/patient-language-switcher.tsx");

test("Patient uses the original Atlas vector identity in both shared header and directory", () => {
  assert.match(nav, /src="\/atlas-icon\.svg"/);
  assert.match(care, /className="atlas-care-journey-art"[\s\S]*src="\/atlas-icon\.svg"/);
  assert.match(care, /atlas-care-empty-symbol"><img src="\/atlas-icon\.svg"/);
  assert.doesNotMatch(care, /atlas-care-orbit-heart">✳|atlas-care-empty-symbol">✳|className="atlas-care-empty-spark/);
});

test("language selection is compact, shared across Patient pages, and keeps deep links", () => {
  assert.match(nav, /PatientLanguageSwitcher/);
  assert.doesNotMatch(care, /LoginLanguagePicker/);
  assert.match(language, /const url = new URL\(window\.location\.href\)/);
  assert.match(language, /url\.searchParams\.set\("lang", next\)/);
  assert.match(language, /aria-label=\{label\[locale\]\}/);
  for (const value of ["ku", "bd", "ar", "en"]) assert.match(language, new RegExp(`\\b${value}: "`));
});

test("iPad and mobile layouts use restrained artwork and compact hero/empty directory", () => {
  assert.match(care, /\.atlas-care-empty-published\{grid-template-columns:112px minmax\(0,1fr\)/);
  assert.match(care, /\.atlas-care-hero-main\{min-width:0;padding:clamp\(24px/);
  assert.match(care, /@media\(max-width:850px\)/);
  assert.match(care, /@media\(max-width:700px\)/);
  assert.match(nav, /@media\(max-width:660px\)/);
});

test("the public care page preserves genuine data and booking safety", () => {
  assert.match(care, /search_public_doctors_with_availability/);
  assert.match(care, /p_limit: 30/);
  assert.match(care, /doctor\.next_available_at/);
  assert.match(care, /atlas-care-empty-published/);
  assert.doesNotMatch(care, /\.from\("appointments"\)|ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED|doctor\.photo/);
});

test("private Patient pages retain their existing secure language link behavior without duplicate selectors", () => {
  const account = source("app/patient-account/page.tsx");
  const appointment = source("app/patient/[token]/page.tsx");
  assert.match(account, /actionHref=\{findCareHref\}[\s\S]*?hideLanguageSwitcher/);
  assert.match(account, /className="patient-account-languages"/);
  assert.match(appointment, /actionHref=\{patientNavHref\}[\s\S]*?hideLanguageSwitcher/);
  assert.match(appointment, /patientLanguageHref\(token, option\.locale, reminderView, accountMarker\)/);
  assert.match(nav, /!hideLanguageSwitcher \? <PatientLanguageSwitcher locale=\{locale\} \/>/);
});
