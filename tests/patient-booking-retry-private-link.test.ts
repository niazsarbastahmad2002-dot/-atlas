import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = source("supabase/migrations/20261026180000_preserve_patient_link_on_exact_booking_retry.sql");
const route = source("app/api/care/booking/finalize/route.ts");
const bookingForm = source("app/care/[clinicSlug]/[doctorSlug]/book/booking-form.tsx");

test("an exact retry does not revoke the first appointment's private link", () => {
  const verifiedIdentity = migration.indexOf("u.phone_confirmed_at is not null");
  const accountOwnership = migration.indexOf("from private.patient_appointment_accounts ownership");
  const duplicateGuard = migration.indexOf("if v_result = 'duplicate' then");
  const tokenRevoke = migration.indexOf("update private.patient_appointment_tokens");
  assert.ok(verifiedIdentity > 0 && verifiedIdentity < accountOwnership);
  assert.ok(accountOwnership < duplicateGuard && duplicateGuard < tokenRevoke);
  assert.match(migration, /if v_result = 'duplicate' then\s*return query select v_result, v_appointment_id;\s*return;\s*end if;/);
  assert.match(migration, /insert into private\.patient_appointment_accounts/);
  assert.match(migration, /and ownership\.user_id = p_verified_user_id/);
  assert.match(migration, /and ownership\.clinic_id = v_clinic_id/);
});

test("the retry fix keeps the verified service-role-only permission boundary", () => {
  assert.match(migration, /auth\.role\(\)\) <> 'service_role'/);
  assert.match(migration, /revoke all on function public\.finalize_verified_public_booking_service/);
  assert.match(migration, /from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.finalize_verified_public_booking_service[\s\S]*to service_role/);
  assert.doesNotMatch(migration, /grant execute[\s\S]*to anon|clinic_members|assigned_doctor_id/i);
});

test("the server only recovers duplicates with a verified private patient account", () => {
  const duplicateAt = route.indexOf('if (result.result === "duplicate" && result.appointment_id)');
  const createdAt = route.indexOf('if (result.result === "created" && result.appointment_id)');
  assert.ok(duplicateAt > 0 && duplicateAt < createdAt);
  assert.match(route, /const patientSession = await issuePatientAccountSession\(admin, user\.id\)/);
  assert.ok(route.includes('return response({ status: "uncertain" }, 503);'));
  assert.ok(route.includes('accountPath: `/patient-account?lang='));
  assert.match(route, /setPatientAccountCookie\(bookingResponse, patientSession\.token, patientSession\.expiresAt\)/);
  assert.match(route, /patientPath: `\/patient\/\$\{patientToken\}/);
  assert.match(bookingForm, /outcome === "existing" && typeof booking\?\.accountPath === "string"/);
  assert.ok(bookingForm.includes('destination.pathname === "/patient-account"'));
  assert.doesNotMatch(route, /clinic_members|patientPhone\?: unknown/);
});

// This is a static safety contract, not a database concurrency test.
// Same-key overlapping transactions must still be exercised in isolated QA.
