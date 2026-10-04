import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("secondary dashboard views preserve user-supplied clinic doctor and patient identities", () => {
  const history = read("app/dashboard/history/history-client.tsx");
  const settings = read("app/dashboard/settings/page.tsx");
  const account = read("app/dashboard/settings/account/page.tsx");
  const deletion = read("app/dashboard/settings/delete/page.tsx");
  const workflow = read("app/dashboard/doctor-workflow-card.tsx");
  const staff = read("app/dashboard/staff/page.tsx");
  const appointmentEditor = read("app/dashboard/appointment-editor.tsx");

  assert.ok(history.includes('data-atlas-user-content="true">{row.patientName}'));
  assert.ok(history.includes('data-atlas-user-content="true">{row.doctorName}'));
  assert.ok(settings.includes('data-atlas-user-content="true">{clinic.name}'));
  assert.ok(settings.includes('data-atlas-user-content="true">{doctor.name}'));
  assert.ok(account.includes('data-atlas-user-content="true">{clinic.name}'));
  assert.ok(deletion.includes('data-atlas-user-content="true">{clinic.name}'));
  assert.ok(workflow.includes('data-atlas-user-content="true">{workflow.doctorName}'));
  assert.ok(staff.includes('data-atlas-user-content="true">{invitation.doctor_name}'));
  assert.ok(staff.includes('data-atlas-user-content="true">{assignedDoctor.name}'));
  assert.ok(appointmentEditor.includes('className="appointment-locked-doctor" data-atlas-user-content="true"'));
  assert.ok(appointmentEditor.includes('data-atlas-user-content="true">{lockedDoctor.name}'));
});
