import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");

test("new appointment time choices start with the selected doctor's own interval", () => {
  assert.match(page, /from\("doctor_workflow_settings"\)\.select\("doctor_id, appointment_interval_minutes, default_reminder_language"\)\.eq\("clinic_id", clinic\.id\)/);
  assert.match(page, /\.find\(\(row\) => row\.doctor_id === selectedDoctor\?\.id\)/);
  assert.match(page, /const doctorInterval = selectedDoctorWorkflow\?\.appointment_interval_minutes/);
  assert.match(page, /\[5, 10, 15, 20, 30\]\.includes\(doctorInterval\)/);
  assert.match(page, /: clinic\.appointment_interval_minutes/);
  assert.match(page, /<AppointmentTimeField[^\n]*intervalMinutes=\{bookingInterval\}/);
  assert.doesNotMatch(page, /<AppointmentTimeField[^\n]*intervalMinutes=\{clinic\.appointment_interval_minutes\}/);
});

test("doctor interval selection preserves clinic and doctor isolation", () => {
  assert.match(page, /\.eq\("clinic_id", clinic\.id\)/);
  assert.match(page, /const selectedDoctor = multiDoctor/);
  assert.match(page, /const selectedDoctorWorkflow =/);
  assert.match(page, /const defaultReminderLanguage = selectedDoctorWorkflow\?\.default_reminder_language/);
  assert.match(page, /key=\{`time:\$\{selectedDay\}:\$\{selectedDoctor\?\.id \?\? "none"\}`\}/);
  assert.match(page, /<input id="doctor_id" name="doctor_id" type="hidden" value=\{selectedDoctor\?\.id \?\? ""\}/);
});
