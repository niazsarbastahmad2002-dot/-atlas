import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");

test("front desk action queue uses only authorized day and doctor rows", () => {
  assert.match(page, /const visibleRows = multiDoctor && selectedDoctor/);
  assert.match(page, /const pendingQueue = visibleRows\.filter\(\(row\) => row\.status === "pending"\)\.slice\(0, 3\)/);
  assert.match(page, /const confirmedQueue = visibleRows\.filter\(\(row\) => row\.status === "confirmed"\)\.slice\(0, 3\)/);
  assert.match(page, /const hasArrivalQueue = pending > 0 \|\| confirmed > 0/);
  assert.match(page, /arrivalLanes\.map\(\(lane\) => <section/);
  assert.match(page, /scheduleHref\(clinic\.id, selectedDay, selectedDoctorId, lane\.status\)/);
  assert.match(page, /#atlas-appointment-\$\{appointment\.id\}/);
  assert.match(page, /id=\{`atlas-appointment-\$\{appointment\.id\}`\}/);
  assert.match(page, /<bdi dir="ltr">\{formatTimeValue/);
  assert.match(page, /data-atlas-user-content="true">\{appointment\.patient_name\}/);
});

test("action lanes distinguish attendance confirmation from physical waiting claims", () => {
  assert.match(page, /needsConfirmation: "Attendance not confirmed"/);
  assert.match(page, /attendanceConfirmed: "Attendance confirmed"/);
  assert.doesNotMatch(page, /waitingPatients|arrivedPatients/);
  for (const language of ["en", "ku", "bd", "ar"]) {
    assert.match(page, new RegExp(`\\b${language}: \\{ title:`));
  }
  assert.match(page, /aria-labelledby="clinic-arrival-heading"/);
  assert.match(page, /aria-label=\{lane\.label\}/);
  assert.match(page, /clinic-arrival-lane a:focus-visible/);
  assert.match(page, /@media\(max-width:700px\)\{\.clinic-arrival-lanes\{grid-template-columns:1fr\}/);
  assert.match(page, /\.appointment-row:target\{/);
});
