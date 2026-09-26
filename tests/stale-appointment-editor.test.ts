import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("appointment detail edits compare against the status the editor opened with", () => {
  const action = read("app/dashboard/instant-actions.ts");
  const editor = read("app/dashboard/appointment-editor.tsx");

  assert.match(action, /updateAppointmentDetailsInline\([\s\S]*expectedStatus: string,[\s\S]*formData: FormData/);
  assert.match(action, /\["pending", "confirmed", "cancelled"\]\.includes\(expectedStatus\)/);
  assert.match(action, /\.eq\("status", expectedStatus\)/);
  assert.match(action, /current\.status !== expectedStatus[\s\S]*reason: "stale"/);

  assert.match(editor, /updateAppointmentDetailsInline\(clinicId, appointmentId, status, formData\)/);
  assert.match(editor, /result\.reason === "stale"[\s\S]*router\.refresh\(\)/);
});

test("stale appointment edit feedback is localized in all Atlas interface languages", () => {
  const editor = read("app/dashboard/appointment-editor.tsx");

  assert.match(editor, /This appointment changed elsewhere\. Loading the latest status\./);
  assert.match(editor, /ئەم وادەیە لە شوێنێکی تر گۆڕدراوە/);
  assert.match(editor, /ئەڤ وادەیە ل جهەکێ دی هاتیە گۆڕین/);
  assert.match(editor, /تم تغيير هذا الموعد من مكان آخر/);
});
