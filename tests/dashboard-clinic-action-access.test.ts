import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = () => readFileSync(new URL("../app/dashboard/actions.ts", import.meta.url), "utf8");

function actionBlock(actions: string, name: string) {
  const start = actions.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const nextExport = actions.indexOf("export async function ", start + 1);
  return actions.slice(start, nextExport >= 0 ? nextExport : actions.length);
}

test("dashboard clinic actions require explicit clinic ownership or membership", () => {
  const actions = source();

  assert.match(actions, /async function authorizeClinic\(clinicId: string\)/);
  assert.match(actions, /from\("clinics"\)[\s\S]*select\("id, owner_id"\)/);
  assert.match(actions, /from\("clinic_members"\)[\s\S]*\.eq\("user_id", userId\)/);
  assert.match(actions, /const isClinicOwner = clinic\.owner_id === userId/);
  assert.match(actions, /if \(!isClinicOwner && membershipError\)/);
  assert.match(actions, /const hasClinicAccess = isClinicOwner/);
  assert.match(actions, /membership\?\.role === "owner"/);
  assert.match(actions, /membership\?\.role === "manager"/);
  assert.match(actions, /membership\?\.role === "receptionist"/);
  assert.match(actions, /if \(clinicError \|\| !clinic\)/);
  assert.match(actions, /if \(!hasClinicAccess\)/);
  assert.match(actions, /redirect\(dashboardUrl\("error", "clinic_unavailable"\)\)/);
});

test("clinic administration actions require owner or manager access", () => {
  const actions = source();

  assert.match(actions, /const canManage = isClinicOwner[\s\S]*membership\?\.role === "owner"[\s\S]*membership\?\.role === "manager"/);
  assert.match(actions, /async function authorizeClinicManagement\(clinicId: string\)/);
  assert.match(actions, /if \(!context\.canManage\)/);

  for (const name of ["updateClinicInterval", "createDoctor", "updateDoctor", "setDoctorActive", "moveDoctor"]) {
    assert.match(actionBlock(actions, name), /authorizeClinicManagement\(clinicId\)/, `${name} must require manager access`);
  }
});

test("appointment server actions allow real clinic members through the guarded clinic context", () => {
  const actions = source();

  for (const name of ["createAppointment", "updateAppointmentStatus", "archiveAppointment"]) {
    const block = actionBlock(actions, name);
    assert.match(block, /authorizeClinic\(clinicId\)/, `${name} must use clinic membership authorization`);
    assert.doesNotMatch(block, /authorizeClinicManagement\(clinicId\)/, `${name} must remain available to receptionists`);
  }
});
