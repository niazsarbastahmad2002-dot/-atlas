import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { clinicPriorities } from "../lib/clinic-priorities.ts";

const now = Date.parse("2026-10-12T10:00:00+03:00");
const row = (id: string, status: string, minutesFromNow: number) => ({
  id,
  status,
  appointment_at: new Date(now + minutesFromNow * 60_000).toISOString(),
});

test("right-now queue prioritizes overdue attendance, unresolved visits, and the next hour", () => {
  const rows = [
    row("future", "pending", 90),
    row("finished", "completed", -55),
    row("due-visit", "confirmed", -20),
    row("due-attendance", "pending", -30),
    row("next", "pending", 20),
    row("cancelled", "cancelled", -35),
    row("extra-attendance", "pending", -10),
    row("future-visit", "confirmed", 40),
  ];
  const priorities = clinicPriorities(rows, now, true);
  assert.deepEqual(priorities.map(({ kind, appointment, count }) => [kind, appointment.id, count]), [
    ["attendance", "due-attendance", 2],
    ["finish", "due-visit", 1],
    ["soon", "next", 2],
  ]);
});

test("right-now queue never treats completed, cancelled, or no-show as active work", () => {
  const rows = [
    row("completed", "completed", -30),
    row("cancelled", "cancelled", 5),
    row("no-show", "no_show", -20),
    row("future", "pending", 90),
    { id: "invalid", status: "pending", appointment_at: "not-a-date" },
  ];
  assert.deepEqual(clinicPriorities(rows, now, true), []);
  assert.deepEqual(clinicPriorities([row("due", "pending", -40)], now, false), []);
});

test("right-now queue respects the appointment-time grace window", () => {
  assert.deepEqual(
    clinicPriorities([row("grace", "pending", -3)], now, true).map(({ kind }) => kind),
    ["soon"],
  );
  assert.deepEqual(
    clinicPriorities([row("overdue", "pending", -6)], now, true).map(({ kind }) => kind),
    ["attendance"],
  );
});

test("priority cards stay scoped to the authorized schedule with direct actions", () => {
  const page = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");
  assert.match(page, /const priorities = clinicPriorities\(visibleRows, now, selectedDay === today\)/);
  assert.match(page, /priorities\.length > 0 \? <section className="clinic-priority-board"/);
  assert.match(page, /scheduleHref\(clinic\.id, selectedDay, selectedDoctorId, appointment\.status\)/);
  assert.match(page, /appointmentId=\{appointment\.id\}/);
  assert.match(page, /revision=\{appointment\.appointment_revision\}/);
  assert.match(page, /status=\{kind === "attendance" \? "pending" : "confirmed"\}/);
  assert.match(page, /kind !== "soon" \? <ClinicArrivalQuickAction/);
  assert.match(page, /data-atlas-user-content="true">\{appointment\.patient_name\}/);
  assert.match(page, /\.clinic-priority-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(page, /@media\(max-width:700px\)\{\.clinic-priority-grid\{grid-template-columns:1fr\}/);
  for (const locale of ["en", "ku", "bd", "ar"]) {
    assert.match(page, new RegExp(`\\b${locale}: \\{ eyebrow:`));
  }
  assert.match(page, /not automatic arrival or no-show decisions/);
});
