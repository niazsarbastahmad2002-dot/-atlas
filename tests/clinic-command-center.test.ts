import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");

test("clinic command center prioritizes active work and booking without inventing arrival states", () => {
  assert.match(page, /className="clinic-command-center"/);
  assert.match(page, /pending \+ confirmed/);
  assert.match(page, /workbench\.review/);
  assert.match(page, /href="#new-appointment"/);
  assert.match(page, /const nextAppointment = selectedDay >= today/);
  assert.match(page, /selectedDay > today \|\| new Date\(row\.appointment_at\)\.getTime\(\) >= now - 5 \* 60 \* 1000/);
  assert.doesNotMatch(page, /const waitingPatients =/);
});

test("status focus preserves clinic, day and doctor while filtering only the authorized daily rows", () => {
  assert.match(page, /function scheduleHref\(clinicId: string, day: string, doctorId\?: string \| null, focus\?: string\)/);
  assert.match(page, /new URLSearchParams\(\{ clinic: clinicId, day \}\)/);
  assert.match(page, /if \(doctorId\) params\.set\("doctor", doctorId\)/);
  assert.match(page, /if \(focus && focus !== "all"\) params\.set\("focus", focus\)/);
  assert.match(page, /const focus = focusStatuses\.find\(\(item\) => item === params\.focus\) \?\? "all"/);
  assert.match(page, /const focusedRows = focus === "all" \? visibleRows : visibleRows\.filter\(\(row\) => row\.status === focus\)/);
  assert.match(page, /\{focusedRows\.map\(\(appointment\)/);
  assert.match(page, /\.eq\("clinic_id", clinic\.id\)/);
  assert.match(page, /aria-current=\{focus === option\.key \? "page" : undefined\}/);
});

test("command center is responsive, keyboard-visible and localized in all Atlas interface languages", () => {
  assert.match(page, /@media\(max-width:900px\)\{\.clinic-command-center/);
  assert.match(page, /@media\(max-width:600px\)\{\.clinic-command-center/);
  assert.match(page, /\.schedule-focus-options a:focus-visible/);
  assert.match(page, /en: \{ eyebrow: "Clinic operations"/);
  assert.match(page, /ku: \{ eyebrow: "کاروباری کلینیک"/);
  assert.match(page, /bd: \{ eyebrow: "کارێن کلینیکێ"/);
  assert.match(page, /ar: \{ eyebrow: "إدارة العيادة"/);
  assert.match(page, /focusedRows\.length === 0/);
  assert.match(page, /workbench\.filteredEmpty/);
});
