import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { nextReceptionQuickAction } from "../lib/reception-quick-action";

test("quick action respects attendance and visit outcome timing", () => {
  assert.equal(nextReceptionQuickAction("pending", false, false), null);
  assert.equal(nextReceptionQuickAction("pending", true, false), "confirmed");
  assert.equal(nextReceptionQuickAction("confirmed", true, false), null);
  assert.equal(nextReceptionQuickAction("confirmed", true, true), "completed");
  for (const status of ["cancelled", "completed", "no_show"] as const) {
    assert.equal(nextReceptionQuickAction(status, true, true), null);
  }
});

test("schedule one-tap status uses existing guarded mutation, revision and rollback", () => {
  const source = readFileSync(new URL("../app/dashboard/appointment-actions.tsx", import.meta.url), "utf8");
  assert.match(source, /nextReceptionQuickAction\(optimisticStatus, !tooEarlyForAttendance, !tooEarlyForOutcome\)/);
  assert.match(source, /onClick=\{\(event\) => changeStatus\(quickNextStatus, event\.currentTarget\)\}/);
  assert.match(source, /disabled=\{pending\}/);
  assert.match(source, /updateAppointmentStatusInline\(clinicId, appointmentId, previousStatus, optimisticRevision, nextStatus\)/);
  assert.match(source, /if \(!result\.ok\) \{[\s\S]*setOptimisticStatus\(previousStatus\)/);
  assert.match(source, /allowedAppointmentTransitions\(optimisticStatus\)/);
  for (const label of ["Confirm arrival", "هاتن پشتڕاست بکە", "هاتنێ پشتڕاست بکە", "تأكيد الحضور"]) {
    assert.ok(source.includes(label));
  }
  assert.match(source, /min-height: 46px/);
});
