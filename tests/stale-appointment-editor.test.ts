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
  assert.match(action, /\.eq\("appointment_revision", expectedRevision\)/);
  assert.match(editor, /revision: number/);
  assert.match(editor, /updateAppointmentDetailsInline\(clinicId, appointmentId, expectedStatus, expectedRevision, formData\)/);
  assert.match(action, /select\("status, voided_at"\)/);
  assert.match(action, /current\?\.voided_at[\s\S]*reason: "stale"/);
  assert.match(action, /current\.status !== expectedStatus[\s\S]*reason: "stale"/);
  const editAction = action.slice(
    action.indexOf("export async function updateAppointmentDetailsInline"),
    action.indexOf("export async function archiveAppointmentInline"),
  );
  assert.match(
    editAction,
    /if \(current && isAppointmentStatus\(current\.status\) && current\.status !== expectedStatus\) \{\s*return \{ ok: false, reason: "stale" \};\s*\}\s*return \{ ok: false, reason: "stale" \};/,
  );

  assert.match(editor, /openedStatusRef\.current = status[\s\S]*openedRevisionRef\.current = revision/);
  assert.match(editor, /const expectedStatus = openedStatusRef\.current[\s\S]*const expectedRevision = openedRevisionRef\.current/);
  assert.match(editor, /updateAppointmentDetailsInline\(clinicId, appointmentId, expectedStatus, expectedRevision, formData\)/);
  assert.match(editor, /openedStatusRef\.current !== status[\s\S]*openedRevisionRef\.current !== revision[\s\S]*setOpen\(false\)/);
  assert.match(editor, /result\.reason === "stale"[\s\S]*openedStatusRef\.current = null[\s\S]*setOpen\(false\)[\s\S]*router\.refresh\(\)/);
});

test("stale appointment edit feedback is localized in all Atlas interface languages", () => {
  const editor = read("app/dashboard/appointment-editor.tsx");

  assert.match(editor, /This appointment changed elsewhere\. The latest details are now loaded\./);
  assert.match(editor, /ئەم وادەیە لە شوێنێکی تر گۆڕدراوە[\s\S]*نوێترین زانیارییەکان بارکران/);
  assert.match(editor, /ئەڤ وادەیە ل جهەکێ دی هاتیە گۆڕین[\s\S]*نووترین زانیاری هاتنە بارکرن/);
  assert.match(editor, /تم تغيير هذا الموعد من مكان آخر[\s\S]*تم تحميل أحدث التفاصيل/);
});


test("concurrent identical appointment detail saves are idempotent instead of reported stale", () => {
  const action = read("app/dashboard/instant-actions.ts");
  const editAction = action.slice(
    action.indexOf("export async function updateAppointmentDetailsInline"),
    action.indexOf("export async function archiveAppointmentInline"),
  );

  assert.match(editAction, /select\("status, appointment_revision, patient_name, patient_phone, contact_relationship, doctor_id, doctor_name, appointment_at, reminder_language, reminder_consent, voided_at"\)/);
  assert.match(editAction, /current\.appointment_revision === expectedRevision \+ 1/);
  assert.match(editAction, /current\.patient_name === patientName/);
  assert.match(editAction, /current\.patient_phone === patientPhone/);
  assert.match(editAction, /current\.contact_relationship === relationship/);
  assert.match(editAction, /current\.doctor_id === doctor\.id/);
  assert.match(editAction, /current\.doctor_name === doctor\.name/);
  assert.match(editAction, /currentTime === appointmentAt\.getTime\(\)/);
  assert.match(editAction, /current\.reminder_language === reminderLanguage/);
  assert.match(editAction, /current\.reminder_consent === reminderConsent/);
  assert.match(editAction, /return \{ ok: true, updated: true \}/);
});
