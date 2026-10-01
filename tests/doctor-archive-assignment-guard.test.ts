import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("an assigned receptionist blocks doctor archival until access is reassigned", async () => {
  const [actions, page] = await Promise.all([
    read("app/dashboard/settings/actions.ts"),
    read("app/dashboard/settings/page.tsx"),
  ]);

  assert.match(actions, /if \(!active\) \{/);
  assert.match(actions, /\.from\("clinic_members"\)[\s\S]*\.eq\("clinic_id", clinicId\)[\s\S]*\.eq\("role", "receptionist"\)[\s\S]*\.eq\("assigned_doctor_id", doctorId\)/);
  assert.match(actions, /if \(assignmentError\) redirect\(settingsUrl\(clinicId, "error", "save_failed"\)\)/);
  assert.match(actions, /if \(assignedReceptionist\) redirect\(settingsUrl\(clinicId, "error", "doctor_has_receptionist"\)\)/);

  assert.match(page, /doctor_has_receptionist: "This doctor still has a receptionist assigned/);
  assert.match(page, /doctor_has_receptionist: "هێشتا ستافی ڕیسێپشن/);
  assert.match(page, /doctor_has_receptionist: "هێشتا ستافەکێ ڕیسێپشنێ/);
  assert.match(page, /doctor_has_receptionist: "ما زال موظف استقبال/);
});

test("removing a doctor from new scheduling requires confirmation", async () => {
  const page = await read("app/dashboard/settings/page.tsx");

  assert.match(page, /import \{ ConfirmSubmitButton \} from "\.\.\/staff\/confirm-submit-button"/);
  assert.match(page, /archiveDoctorConfirm: "Remove \{doctor\} from new scheduling\?/);
  assert.match(page, /archiveDoctorConfirm: "\{doctor\} لە وادە نوێکان لاببرێت/);
  assert.match(page, /archiveDoctorConfirm: "\{doctor\} ژ وادەیێن نوو بهێتە لابرن/);
  assert.match(page, /archiveDoctorConfirm: "إزالة \{doctor\} من المواعيد الجديدة/);
  assert.match(page, /setDoctorActive\.bind\(null, clinic\.id, doctor\.id, false\)[\s\S]*<ConfirmSubmitButton[\s\S]*confirmMessage=\{copy\.archiveDoctorConfirm\.replace\("\{doctor\}", doctor\.name\)\}/);
  assert.doesNotMatch(page, /setDoctorActive\.bind\(null, clinic\.id, doctor\.id, false\)\}><button className="danger-link"/);
});

test("doctor reorder buttons lock while their server action is pending", async () => {
  const page = await read("app/dashboard/settings/page.tsx");

  assert.match(page, /moveDoctor\.bind\(null, clinic\.id, doctor\.id, "up"\)\}><SubmitButton className="" pendingLabel=\{t\.saving\}>\{t\.moveUp\}<\/SubmitButton>/);
  assert.match(page, /moveDoctor\.bind\(null, clinic\.id, doctor\.id, "down"\)\}><SubmitButton className="" pendingLabel=\{t\.saving\}>\{t\.moveDown\}<\/SubmitButton>/);
  assert.doesNotMatch(page, /moveDoctor\.bind\(null, clinic\.id, doctor\.id, "up"\)\}><button type="submit">/);
  assert.doesNotMatch(page, /moveDoctor\.bind\(null, clinic\.id, doctor\.id, "down"\)\}><button type="submit">/);
});

