import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("appointment outcome controls refresh only at availability boundaries", () => {
  const source = readFileSync(
    new URL("../app/dashboard/appointment-actions.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /setClockTick/);
  assert.match(source, /scheduledAt - 5 \* 60 \* 1000/);
  assert.match(source, /scheduledAt \+ 5 \* 60 \* 1000/);
  assert.match(source, /const nextBoundary = boundaries\.find/);
  assert.match(source, /document\.hidden/);
  assert.match(source, /window\.setTimeout\(syncVisibility/);
  assert.match(source, /window\.clearTimeout\(timer\)/);
  assert.doesNotMatch(source, /window\.setInterval\(/);
  assert.match(source, /document\.addEventListener\("visibilitychange", syncVisibility\)/);
  assert.match(source, /scheduledAt > Date\.now\(\) \+ 5 \* 60 \* 1000/);
});


test("appointment status controls identify the patient for assistive technology", () => {
  const actions = readFileSync(new URL("../app/dashboard/appointment-actions.tsx", import.meta.url), "utf8");
  const dashboard = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");
  assert.ok(actions.includes('const statusLabel = `${workflow.status}: ${patientName}`;'));
  assert.ok(actions.includes('role="group" aria-label={statusLabel}'));
  assert.ok(actions.includes("aria-label={statusLabel}"));
  assert.ok(dashboard.includes("patientName={appointment.patient_name}"));
});


test("patient share controls identify the appointment patient for assistive technology", () => {
  const share = readFileSync(new URL("../app/dashboard/patient-link-button.tsx", import.meta.url), "utf8");
  const actions = readFileSync(new URL("../app/dashboard/appointment-actions.tsx", import.meta.url), "utf8");
  assert.ok(share.includes('const shareLabel = `${t.shareAppointment}: ${patientName}`;'));
  assert.ok(share.includes("aria-label={shareLabel}"));
  assert.ok(actions.includes("patientName={patientName}"));
});


test("appointment remove controls identify the patient for assistive technology", () => {
  const actions = readFileSync(new URL("../app/dashboard/appointment-actions.tsx", import.meta.url), "utf8");
  assert.ok(actions.includes('aria-label={`${workflow.remove}: ${patientName}`}'));
});

test("prepared patient sharing resets after the appointment revision changes", () => {
  const actions = readFileSync(new URL("../app/dashboard/appointment-actions.tsx", import.meta.url), "utf8");
  assert.ok(actions.includes('key={`${appointmentId}:${revision}`}'));
});
