import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const care = source("app/care/page.tsx");
const nav = source("app/care/patient-nav.tsx");
const cardCss = source("app/care/patient-directory-card.css");
const account = source("app/patient-account/page.tsx");
const preview = source("app/care/marketplace-preview/page.tsx");

test("Patient has a visibly redesigned high-contrast marketplace and tablet-first hero", () => {
  assert.match(care, /Patient marketplace — October premium visual system/);
  assert.match(care, /\.atlas-care-hero-main\{position:relative;background:linear-gradient/);
  assert.match(care, /\.atlas-care-search-primary \.button\{display:flex/);
  assert.match(care, /@media\(max-width:1200px\)/);
  assert.match(care, /@media\(max-width:700px\)/);
  assert.match(care, /@media\(max-width:440px\)/);
  assert.match(care, /@media\(max-width:360px\)/);
  assert.match(care, /:root\[data-theme="dark"\] \.atlas-care-hero-main h1\{color:#edfff1!important\}/);
  assert.match(care, /:root\[data-theme="system"\] \.atlas-care-hero-main h1\{color:#edfff1!important\}/);
});

test("original Atlas identity remains visible in compact Patient navigation and truthful empty state", () => {
  assert.match(nav, /atlas-patient-logo\{background:#082a23 url\("\/atlas-icon\.svg"\)/);
  assert.match(nav, /loading="eager" decoding="sync"/);
  assert.match(nav, /@media\(max-width:660px\)/);
  assert.match(care, /atlas-care-empty-symbol"><img src="\/atlas-icon\.svg"/);
  assert.match(care, /\{copy\.noPublished\}/);
  assert.match(care, /patientLocaleHref\("\/patient-account", locale\)/);
});

test("search reset saves taps but results and timestamps still come only from published records", () => {
  assert.match(care, /hasActiveFilters \? <Link className="atlas-care-clear-filters"/);
  assert.match(care, /search_public_doctors_with_availability/);
  assert.match(care, /p_limit: 30/);
  assert.match(care, /nextAvailabilityLabel\(doctor\.next_available_at, locale\)/);
  assert.match(care, /results\.map\(\(doctor\) => \(/);
  assert.doesNotMatch(care, /Dr\. Example A|hardcodedSpecialties|\/book\b|service_role/);
});

test("professional cards and private appointments have separate readable status and action styles", () => {
  assert.match(cardCss, /Premium published-profile cards/);
  assert.match(cardCss, /var\(--surface\)/);
  assert.match(cardCss, /\.atlas-marketplace-card-no-times/);
  assert.match(account, /Patient visit hub — readable statuses/);
  assert.match(account, /\.patient-account-list>\.patient-account-appointment:first-child:not\(\.is-history\)/);
  assert.match(account, /data-status=\{appointment\.appointment_status\}/);
  assert.match(account, /resolvePatientAccountSession\(admin, rawSession\)/);
  assert.match(account, /list_patient_account_appointments_service/);
});

test("synthetic populated marketplace remains inaccessible in production", () => {
  assert.match(preview, /process\.env\.VERCEL_ENV !== "preview" && process\.env\.NODE_ENV !== "development"/);
  assert.match(preview, /FICTIONAL VISUAL TEST/);
  assert.doesNotMatch(preview, /createClient|\.rpc\(|\/book\b/);
});
