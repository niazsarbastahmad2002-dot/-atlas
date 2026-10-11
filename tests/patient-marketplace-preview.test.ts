import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const care = source("app/care/page.tsx");
const card = source("app/care/patient-directory-card.tsx");
const preview = source("app/care/marketplace-preview/page.tsx");

test("live Patient cards are populated only from the published-search RPC", () => {
  assert.match(care, /search_public_doctors_with_availability/);
  assert.match(care, /results\.map\(\(doctor\) => \(/);
  assert.match(care, /<PatientDirectoryCard/);
  assert.match(care, /nextAvailabilityLabel\(doctor\.next_available_at, locale\)/);
  assert.doesNotMatch(care, /Dr\. Example A|fictional-example/i);
});

test("cards communicate no public slots without inventing availability or a booking link", () => {
  assert.match(card, /nextOpening \? \(/);
  assert.match(card, /atlas-marketplace-card-no-times/);
  assert.match(card, /No free times in the next 14 days/);
  assert.match(card, /View times/);
  assert.match(card, /patientLocaleHref\(\`\/care\/\$\{doctor\.clinic_slug\}\/\$\{doctor\.doctor_slug\}\/times\`, locale\)/);
  assert.doesNotMatch(card, /\/book\b|from\("appointments"\)|service_role/i);
});

test("isolated fictional preview is prohibited in production and never creates data", () => {
  assert.match(preview, /process\.env\.VERCEL_ENV !== "preview" && process\.env\.NODE_ENV !== "development"/);
  assert.match(preview, /notFound\(\)/);
  assert.match(preview, /robots: \{ index: false, follow: false \}/);
  assert.match(preview, /FICTIONAL VISUAL TEST/);
  assert.match(preview, /preview \/>/);
  assert.doesNotMatch(preview, /createClient|supabase|\.rpc\(|insert\(|update\(|delete\(|\/book/);
});

test("multilingual, responsive card uses theme tokens and real clinic/profile links", () => {
  const style = source("app/care/patient-directory-card.css");
  for (const locale of ["en:", "ku:", "bd:", "ar:"]) assert.ok(card.includes(locale));
  assert.match(style, /var\(--surface\)/);
  assert.match(style, /@media\(max-width:680px\)/);
  assert.match(card, /patientLocaleHref/);
  assert.match(style, /focus-visible/);
});

test("card text stays readable in explicit and system dark themes", () => {
  const style = source("app/care/patient-directory-card.css");
  assert.match(style, /:root\[data-theme="dark"\] \.atlas-marketplace-card \.atlas-marketplace-card-time strong/);
  assert.match(style, /:root\[data-theme="system"\] \.atlas-marketplace-card \.atlas-marketplace-card-time strong/);
  assert.match(style, /color:var\(--ink\)!important/);
});
