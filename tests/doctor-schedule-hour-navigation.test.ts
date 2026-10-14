import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");

test("hour navigation uses only the visible authorized clinic/day/doctor schedule", () => {
  assert.match(page, /const visibleRows = multiDoctor && selectedDoctor/);
  assert.match(page, /const focusedRows = focus === "all" \? visibleRows : visibleRows\.filter/);
  assert.match(page, /const scheduleHours = focusedRows\.reduce/);
  assert.match(page, /toBaghdadInputValue\(new Date\(appointment\.appointment_at\)\)\.slice\(11, 13\)/);
  assert.match(page, /else groups\.push\(\{ hour, appointmentId: appointment\.id, count: 1 \}\)/);
  assert.match(page, /href=\{\`#atlas-appointment-\$\{appointmentId\}\`\}/);
  assert.match(page, /scheduleHours\.length > 1/);
  assert.doesNotMatch(page, /const waitingPatients =/);
});

test("the next patient shortcut opens the same scoped appointment list without status changes", () => {
  assert.match(page, /className="clinic-command-next"/);
  assert.match(page, /scheduleHref\(clinic\.id, selectedDay, selectedDoctorId\)\}#atlas-appointment-\$\{nextAppointment\.id\}/);
  assert.match(page, /nextAppointment\.patient_name/);
  assert.match(page, /data-atlas-user-content="true">\{nextAppointment\.patient_name\}/);
  assert.match(page, /<AppointmentActions clinicId=\{clinic\.id\}/);
  assert.match(page, /<AppointmentEditor clinicId=\{clinic\.id\}/);
});

test("time rail is readable on desktop, tablet and phone while preserving RTL and locale", () => {
  assert.match(page, /className="appointment-time-rail"/);
  assert.match(page, /<bdi dir="ltr">\{formatTimeValue/);
  assert.match(page, /\.schedule-hour-links a:focus-visible/);
  assert.match(page, /@media\(min-width:901px\)\{\.appointments-panel \.polished-appointment/);
  assert.match(page, /@media\(max-width:900px\)\{\.appointments-panel \.appointment-time-rail/);
  for (const locale of ["en", "ku", "bd", "ar"]) {
    assert.match(page, new RegExp(`\\b${locale}: "[^"]+"`));
  }
  assert.match(page, /const timelineCopy: Record<UiLocale, string>/);
});
