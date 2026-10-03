import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const page = source("app/care/[clinicSlug]/[doctorSlug]/times/page.tsx");

test("full public availability uses the truthful bounded public slot window", () => {
  assert.match(page, /get_public_doctor_profile/);
  assert.match(page, /list_public_doctor_slots_window/);
  assert.match(page, /p_days: 14/);
  assert.doesNotMatch(page, /\.from\("appointments"\)/);
  assert.doesNotMatch(page, /service_role|createAdminClient/);
});

test("public times stay grouped in Baghdad and use Atlas locale formatters", () => {
  assert.match(page, /timeZone: "Asia\/Baghdad"/);
  assert.match(page, /formatLocalDateValue/);
  assert.match(page, /formatTimeValue/);
  assert.match(page, /groups\.find/);
});

test("online booking links remain gated by launch plus real phone readiness", () => {
  assert.match(page, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED === "true"/);
  assert.match(page, /readiness\?\.reachable/);
  assert.match(page, /readiness\.supabasePhoneEnabled/);
  assert.match(page, /!readiness\.signupDisabled/);
  assert.match(page, /\/book\?slot=/);
});

test("full availability is mobile-first and preserves 48px slot targets", () => {
  assert.match(page, /atlas-time-option\{min-height:48px/);
  assert.match(page, /@media\(max-width:620px\)/);
  assert.match(page, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test("full availability page is noindex to avoid duplicate dynamic search pages", () => {
  assert.match(page, /robots: \{ index: false, follow: true \}/);
});


test("doctor profile links to the full public availability page with a 48px action", () => {
  const profile = source("app/care/[clinicSlug]/[doctorSlug]/page.tsx");

  assert.match(profile, /\/care\/\$\{clinicSlug\}\/\$\{doctorSlug\}\/times/);
  assert.match(profile, /atlas-care-availability-actions/);
  assert.match(profile, /atlas-care-availability-actions \.button\{min-height:48px/);
});


test("full doctor availability bypasses the lightweight 200-slot cap through a dedicated bounded RPC", () => {
  const page = source("app/care/[clinicSlug]/[doctorSlug]/times/page.tsx");
  const migration = source("supabase/migrations/20261003214000_public_full_availability_window.sql");

  assert.match(page, /list_public_doctor_slots_window/);
  assert.doesNotMatch(page, /rpc\("list_public_doctor_slots",/);
  assert.match(migration, /least\(coalesce\(p_days, 14\), 14\)/);
  assert.doesNotMatch(migration, /limit 200/i);
  assert.match(migration, /grant execute[\s\S]*to anon, authenticated/i);
  assert.doesNotMatch(migration, /patient_name|patient_phone|reminder_language/);
});
