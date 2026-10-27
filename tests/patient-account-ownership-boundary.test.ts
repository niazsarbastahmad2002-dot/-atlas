import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const page = read("app/patient-account/page.tsx");
const listMigration = read("supabase/migrations/20261004160000_patient_account_portal.sql");
const manageRoute = read("app/patient-account/api/appointments/[appointmentId]/manage/route.ts");

function serviceFunctionBody(name: string, nextName: string) {
  const start = listMigration.indexOf("create or replace function public." + name + "(");
  const end = listMigration.indexOf("create or replace function public." + nextName + "(", start);
  assert.ok(start >= 0 && end > start, "Expected isolated service function " + name);
  return listMigration.slice(start, end);
}

test("private list can return only patient-owned appointments within their original clinic", () => {
  const sql = serviceFunctionBody(
    "list_patient_account_appointments_service",
    "issue_patient_account_appointment_token_service",
  );
  assert.match(sql, /if \(select auth\.role\(\)\) <> 'service_role' or p_user_id is null then\s*return;/);
  assert.match(sql, /from private\.patient_appointment_accounts ownership/);
  assert.match(sql, /join public\.appointments a\s+on a\.id = ownership\.appointment_id\s+and a\.clinic_id = ownership\.clinic_id/);
  assert.match(sql, /left join public\.doctors d\s+on d\.id = a\.doctor_id\s+and d\.clinic_id = a\.clinic_id/);
  assert.match(sql, /where ownership\.user_id = p_user_id\s+and a\.voided_at is null/);
  assert.doesNotMatch(sql, /where\s+1\s*=\s*1|using\s*\(true\)/i);
});

test("private appointment list is not exposed to anonymous or patient browser database roles", () => {
  assert.match(listMigration, /revoke all on function public\.list_patient_account_appointments_service\(uuid\)\s+from public, anon, authenticated/);
  assert.match(listMigration, /grant execute on function public\.list_patient_account_appointments_service\(uuid\)\s+to service_role/);
  assert.match(page, /const session = admin \? await resolvePatientAccountSession\(admin, rawSession\) : null/);
  assert.match(page, /if \(admin && session\) \{/);
  assert.match(page, /p_user_id: session\.user_id/);
  assert.doesNotMatch(page, /\.from\("appointments"\)|patient_phone|patient_name|clinic_members/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
});

test("Manage does not grant access based on a supplied appointment ID alone", () => {
  assert.match(manageRoute, /if \(!isUuid\(appointmentId\)\)/);
  assert.match(manageRoute, /const session = await resolvePatientAccountSession\(admin, accountToken\)/);
  assert.match(manageRoute, /if \(!session\)/);
  assert.match(manageRoute, /consume_patient_link_rate_limit/);
  assert.match(manageRoute, /p_user_id: session\.user_id/);
  assert.match(manageRoute, /p_appointment_id: appointmentId/);
  assert.match(manageRoute, /if \(error \|\| issued !== true\)/);
  assert.match(listMigration, /where ownership\.user_id = p_user_id\s+and ownership\.appointment_id = p_appointment_id\s+and a\.voided_at is null/);
  assert.match(listMigration, /a\.clinic_id = ownership\.clinic_id/);
  assert.match(listMigration, /to service_role/);
});
