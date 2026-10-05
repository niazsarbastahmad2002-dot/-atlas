import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/patient-account/page.tsx", import.meta.url), "utf8");

test("My Appointments exposes appointment status to semantic Patient styling", () => {
  const markers = page.match(/className="patient-account-status" data-status=\{appointment\.appointment_status\}/g) ?? [];
  assert.equal(markers.length, 2);
});

test("Patient status badges reuse Atlas warning, success, and danger semantics", () => {
  assert.match(page, /\.patient-account-status\{[^}]*background:var\(--warning-bg\);color:var\(--warning\)!important/);
  assert.match(page, /data-status="confirmed"\][^}]*data-status="completed"\][^}]*background:var\(--success-bg\);color:var\(--success\)!important/);
  assert.match(page, /data-status="cancelled"\][^}]*data-status="no_show"\][^}]*background:var\(--danger-bg\);color:var\(--danger\)!important/);
});

test("semantic status styling does not change Patient appointment data or authorization", () => {
  assert.match(page, /admin\.rpc\("list_patient_account_appointments_service"/);
  assert.match(page, /resolvePatientAccountSession\(admin, rawSession\)/);
  assert.doesNotMatch(page, /\.from\("appointments"\)|clinic_members|service_role/i);
});
