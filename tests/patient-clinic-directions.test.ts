import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("private patient clinic location is service-role only and publication-gated", () => {
  const migration = source("supabase/migrations/20261003220759_patient_published_clinic_location.sql");

  assert.match(migration, /patient_get_clinic_location/);
  assert.match(migration, /profile\.is_published/);
  assert.match(migration, /private\.patient_appointment_tokens/);
  assert.match(migration, /token\.revoked_at is null/);
  assert.match(migration, /token\.expires_at > now\(\)/);
  assert.match(migration, /revoke all[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute[\s\S]*to service_role/i);
  assert.doesNotMatch(migration, /patient_name|patient_phone|reminder_language/);
});

test("patient location enrichment never makes the core appointment page depend on location", () => {
  const page = source("app/patient/[token]/page.tsx");

  assert.match(page, /Promise\.all\(\[/);
  assert.match(page, /patient_get_clinic_location/);
  assert.match(page, /const clinicLocation = !locationError/);
  assert.match(page, /if \(error \|\| !appointment\) return <Unavailable/);
  assert.doesNotMatch(page, /if \(locationError/);
});

test("patient directions require an explicit published address and use a free Maps URL", () => {
  const page = source("app/patient/[token]/page.tsx");

  assert.match(page, /const clinicLocationText = clinicLocation\?\.address_text/);
  assert.match(page, /\[clinicLocation\.address_text, clinicLocation\.area, clinicLocation\.city\]/);
  assert.match(page, /const clinicDirectionsUrl = clinicLocationText/);
  assert.doesNotMatch(page, /clinicLocation\.latitude|clinicLocation\.longitude/);
  assert.match(page, /https:\/\/www\.google\.com\/maps\/dir\//);
  assert.match(page, /new URLSearchParams\(\{ api: "1", destination: clinicLocationText \}\)/);
  assert.doesNotMatch(page, /GOOGLE_MAPS_API_KEY|NEXT_PUBLIC_GOOGLE_MAPS|maps\/api\/js/);
  assert.match(page, /target="_blank"/);
  assert.match(page, /rel="noreferrer"/);
  assert.match(page, /patient-directions-link \{ width: 100%; min-height: 48px/);
});

test("changing published clinic location invalidates stale saved coordinates", () => {
  const actions = source("app/dashboard/settings/public-profile/actions.ts");

  assert.match(actions, /select\("clinic_id, country_code, address_text, area, city, latitude, longitude"\)/);
  assert.match(actions, /const locationChanged = Boolean\(existing && \(/);
  assert.match(actions, /\(existing\.country_code \?\? ""\) !== countryCode/);
  assert.match(actions, /\(existing\.address_text \?\? ""\) !== addressText/);
  assert.match(actions, /\(existing\.area \?\? ""\) !== area/);
  assert.match(actions, /\(existing\.city \?\? ""\) !== city/);
  assert.match(actions, /latitude: locationChanged \? null/);
  assert.match(actions, /longitude: locationChanged \? null/);
});

test("city-only public profiles never create a directions action", () => {
  const page = source("app/patient/[token]/page.tsx");

  assert.match(page, /clinicLocation\?\.address_text/);
  assert.doesNotMatch(page, /\[clinicLocation\.area, clinicLocation\.city\]\.filter/);
  assert.doesNotMatch(page, /: clinicLocationText;/);
});
