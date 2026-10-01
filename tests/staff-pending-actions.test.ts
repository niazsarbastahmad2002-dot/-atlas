import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("clinic access administration disables consequential submit buttons while pending", async () => {
  const page = await read("app/dashboard/staff/page.tsx");

  assert.match(page, /import \{ SubmitButton \} from "@\/app\/components\/submit-button"/);
  assert.match(page, /working: "Working…"/);
  assert.match(page, /working: "چاوەڕێ بکە…"/);
  assert.match(page, /working: "چاڤەڕێ بە…"/);
  assert.match(page, /working: "جارٍ التنفيذ…"/);

  assert.match(page, /revokeManualStaffInvitation[\s\S]*<SubmitButton className="danger-link" pendingLabel=\{text\.working\}>\{text\.revokeInvite\}<\/SubmitButton>/);
  assert.match(page, /cancelPendingInvitation[\s\S]*<SubmitButton className="danger-link" pendingLabel=\{text\.working\}>\{text\.remove\}<\/SubmitButton>/);
  assert.match(page, /updateStaffRole[\s\S]*<SubmitButton className="" pendingLabel=\{text\.working\}>\{text\.saveRole\}<\/SubmitButton>/);
  assert.match(page, /removeStaffMember[\s\S]*<SubmitButton className="danger-link" pendingLabel=\{text\.working\}>\{text\.remove\}<\/SubmitButton>/);
  assert.match(page, /transferClinicAdministrator[\s\S]*<SubmitButton className="button button-small" pendingLabel=\{text\.working\}>\{text\.transferButton\}<\/SubmitButton>/);
});
