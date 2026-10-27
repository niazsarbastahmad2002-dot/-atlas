import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const formSource = readFileSync(
  new URL("../app/dashboard/appointment-time-field-v2.tsx", import.meta.url), "utf8",
);
const scheduleSource = readFileSync(
  new URL("../app/dashboard/page.tsx", import.meta.url), "utf8",
);

test("server-locked receptionist doctor does not refetch the same settings on mount", () => {
  const syncStart = formSource.indexOf("const syncDoctor = () => {");
  const guard = formSource.indexOf('if (doctor instanceof HTMLInputElement && doctor.type === "hidden")', syncStart);
  const request = formSource.indexOf("fetch(`/api/settings/doctor-workflow?", syncStart);
  assert.ok(syncStart !== -1 && guard > syncStart && request > guard);
  assert.match(formSource, /setDoctorId\(nextDoctor\)/);
  assert.match(formSource, /languageSelect\.value = savedLanguage/);
  assert.match(formSource, /doctor\.addEventListener\("change", syncDoctor\)/);
  assert.match(formSource, /controller\?\.abort\(\)/);
});

test("locked booking keeps server-resolved interval, language and doctor membership", () => {
  assert.match(scheduleSource, /intervalMinutes=\{bookingInterval\}/);
  assert.match(scheduleSource, /defaultValue=\{defaultReminderLanguage\}/);
  assert.match(scheduleSource, /name="doctor_id" type="hidden" value=\{selectedDoctor\?\.id \?\? ""\}/);
  assert.match(formSource, /name="appointment_at" value=\{usable \? value : ""\}/);
});
