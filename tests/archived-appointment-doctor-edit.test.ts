import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("archived assigned doctors are not silently reused when editing", () => {
  const page = read("app/dashboard/page.tsx");
  const editor = read("app/dashboard/appointment-editor.tsx");
  assert.match(page, /doctor\.active \|\| doctor\.id === appointment\.doctor_id/);
  assert.match(page, /name: doctor\.name, active: doctor\.active/);
  assert.match(editor, /type DoctorOption = \{ id: string; name: string; active: boolean \}/);
  assert.match(editor, /doctors\.find\(\(doctor\) => doctor\.id === doctorId && !doctor\.active\)/);
  assert.match(editor, /activeDoctors\.length === 1 && !archivedAssignedDoctor/);
  assert.match(editor, /defaultValue=\{selectedActiveDoctorId\} required/);
  assert.match(editor, /\{activeDoctors\.map\(\(doctor\) => <option/);
  assert.doesNotMatch(editor, /\{doctors\.map\(\(doctor\) => <option/);
});
test("archive guidance is localized and save is blocked if no doctor is active", () => {
  const editor = read("app/dashboard/appointment-editor.tsx");
  const copy = editor.slice(editor.indexOf("const archivedDoctorCopy"), editor.indexOf("const copy ="));
  for (const language of ["en", "ku", "bd", "ar"]) assert.ok(copy.includes(`${language}: {`));
  assert.match(editor, /archivedDoctorCopy\[locale\]\.archived/);
  assert.match(editor, /archivedDoctorCopy\[locale\]\.noneActive/);
  assert.match(editor, /type="submit" disabled=\{pending \|\| activeDoctors\.length === 0\}/);
});
test("the server still requires clinic-scoped active doctor selection", () => {
  const actions = read("app/dashboard/instant-actions.ts");
  const details = actions.slice(actions.indexOf("export async function updateAppointmentDetailsInline"));
  assert.match(details, /\.from\("doctors"\)[\s\S]*?\.eq\("clinic_id", clinicId\)[\s\S]*?\.eq\("id", doctorId\)[\s\S]*?\.eq\("active", true\)/);
});
