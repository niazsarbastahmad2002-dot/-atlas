import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { clinicPriorities } from "../lib/clinic-priorities.ts";

const page = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");
const now = Date.parse("2026-10-12T10:00:00+03:00");
const row = (status: "pending" | "confirmed", offsetMinutes: number) => ({
  id: status + offsetMinutes,
  status,
  appointment_at: new Date(now + offsetMinutes * 60_000).toISOString(),
});

test("full front-desk queue is secondary when immediate priorities already exist", () => {
  const urgent = [row("pending", -20), row("confirmed", -15)];
  assert.ok(clinicPriorities(urgent, now, true).length > 0);
  assert.deepEqual(clinicPriorities(urgent, now, false), []);

  const disclosure = readFileSync(new URL("../app/dashboard/clinic-arrival-disclosure.tsx", import.meta.url), "utf8");
  assert.match(page, /<ClinicPriorityBoard/);
  assert.match(page, /<ClinicArrivalDisclosure/);
  assert.match(page, /appointments=\{visibleRows\.map\(\(\{ id, status, appointment_at \}\) => \(\{ id, status, appointment_at \}\)\)\}/);
  assert.match(page, /selectedDay=\{selectedDay\}/);
  assert.match(page, /nowAtRender=\{now\}/);
  assert.match(disclosure, /clinicPriorities\(appointments, now, isToday\)/);
  assert.match(disclosure, /open=\{!hasImmediatePriority\}/);
  assert.match(disclosure, /<summary className="clinic-arrival-disclosure-summary">\{summary\}<\/summary>/);
  assert.match(page, /<section className="clinic-arrival-board"/);
  assert.match(page, /<\/section>\s*<\/ClinicArrivalDisclosure> : null/);
});

test("expanded reception queue preserves all status actions and workspace isolation", () => {
  assert.match(page, /key=\{\`\$\{clinic\.id\}:\$\{selectedDoctor\?\.id \?\? "none"\}:\$\{selectedDay\}\`\}/);
  assert.match(page, /arrivalCopy\.needsConfirmation/);
  assert.match(page, /arrivalCopy\.attendanceConfirmed/);
  assert.match(page, /arrivalLanes\.map\(\(lane\) => <section/);
  assert.match(page, /<ClinicArrivalQuickAction/);
  assert.match(page, /clinicId=\{clinic\.id\}/);
  assert.match(page, /appointmentId=\{appointment\.id\}/);
  assert.match(page, /revision=\{appointment\.appointment_revision\}/);
  assert.match(page, /status=\{lane\.status\}/);
  assert.match(page, /selectedDay === today \? <ClinicArrivalQuickAction/);
  const disclosure = readFileSync(new URL("../app/dashboard/clinic-arrival-disclosure.tsx", import.meta.url), "utf8");
  assert.match(disclosure, /window\.setInterval\(update, 30_000\)/);
  assert.match(disclosure, /document\.addEventListener\("visibilitychange", update\)/);
  assert.match(disclosure, /document\.removeEventListener\("visibilitychange", update\)/);
  assert.match(disclosure, /lastPriorityRef\.current === hasImmediatePriority/);
  assert.match(disclosure, /detailsRef\.current\.open = !hasImmediatePriority/);
  assert.doesNotMatch(disclosure, /router\.refresh\(\)|window\.location\.reload\(/);
  assert.match(page, /clinic-arrival-disclosure-summary:focus-visible/);
  assert.match(page, /@media\(max-width:700px\)\{\.clinic-arrival-disclosure-summary/);
  for (const locale of ["en", "ku", "bd", "ar"]) {
    assert.match(page, new RegExp(`\\b${locale}: \\{ title:.*showFullQueue:`));
  }
});

test("front-desk arrival queue avoids repeating past/future schedules without removing patient actions", () => {
  // Only today's queue offers one-tap attendance actions. Other dates keep the
  // complete appointment list and status filters, without an extra copy.
  assert.match(page, /hasArrivalQueue && selectedDay === today \? <ClinicArrivalDisclosure/);
  assert.match(page, /const focusOptions = \[/);
  assert.match(page, /focusedRows\.map\(\(appointment\) =>/);
  assert.match(page, /selectedDay === today \? <ClinicArrivalQuickAction/);
  assert.match(page, /appointmentAt=\{appointment\.appointment_at\}/);
});
