import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("private patient clinic location is service-role only and publication-gated", () => {
  const migration = source("supabase/migrations/20261003214500_patient_published_clinic_location.sql");

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

test("patient directions require a specific published address and do not trust stale coordinates", () => {
  const page = source("app/patient/[token]/page.tsx");
  const migration = source("supabase/migrations/20261003214500_patient_published_clinic_location.sql");

  assert.match(page, /clinicLocation\?\.address_text/);
  assert.match(page, /https:\/\/www\.google\.com\/maps\/dir\//);
  assert.match(page, /new URLSearchParams\(\{ api: "1", destination: clinicLocationText \}\)/);
  assert.doesNotMatch(page, /clinicLocation\.latitude|clinicLocation\.longitude/);
  assert.doesNotMatch(migration, /latitude|longitude/);
  assert.doesNotMatch(page, /GOOGLE_MAPS_API_KEY|NEXT_PUBLIC_GOOGLE_MAPS|maps\/api\/js/);
  assert.match(page, /target="_blank"/);
  assert.match(page, /rel="noreferrer"/);
  assert.match(page, /patient-directions-link \{ width: 100%; min-height: 48px/);
});
