import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("fast appointment status updates use compare-and-set against the status the receptionist saw", () => {
  const action = read("app/dashboard/instant-actions.ts");
  const ui = read("app/dashboard/appointment-actions.tsx");

  assert.match(action, /expectedStatus: string,[\s\S]*status: string/);
  assert.match(action, /canTransitionAppointment\(expectedStatus, status\)/);
  assert.match(action, /\.eq\("status", expectedStatus\)/);
  assert.match(action, /return \{ ok: false, reason: "stale" \}/);

  assert.match(ui, /updateAppointmentStatusInline\(clinicId, appointmentId, previousStatus, nextStatus\)/);
  assert.match(ui, /result\.reason === "stale"[\s\S]*router\.refresh\(\)/);
});

test("concurrent identical status changes are idempotent instead of reported stale", () => {
  const action = read("app/dashboard/instant-actions.ts");

  assert.match(action, /select\("status"\)/);
  assert.match(action, /current\.status === status/);
  assert.match(action, /outcome: "duplicate"/);
  assert.match(action, /return \{ ok: true, status \}/);
});

test("stale status feedback is localized across all Atlas interface languages", () => {
  const ui = read("app/dashboard/appointment-actions.tsx");

  assert.match(ui, /This appointment changed elsewhere\. Loading the latest status\./);
  assert.match(ui, /ئەم مەوعیدە لە شوێنێکی تر گۆڕدراوە/);
  assert.match(ui, /ئەڤ مەوعیدە ل جهەکێ دی هاتیە گۆڕین/);
  assert.match(ui, /تم تغيير هذا الموعد من مكان آخر/);
});
