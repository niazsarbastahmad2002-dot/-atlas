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
  assert.match(page, /removeStaffMember[\s\S]*<ConfirmSubmitButton[\s\S]*className="danger-link"[\s\S]*pendingLabel=\{text\.working\}[\s\S]*confirmMessage=\{text\.removeConfirm\.replace\("\{person\}", member\.identity\)\}/);
  assert.match(page, /transferClinicAdministrator[\s\S]*<SubmitButton className="button button-small" pendingLabel=\{text\.working\}>\{text\.transferButton\}<\/SubmitButton>/);
});

test("removing clinic staff requires confirmation before the pending submit", async () => {
  const [page, button] = await Promise.all([
    read("app/dashboard/staff/page.tsx"),
    read("app/dashboard/staff/confirm-submit-button.tsx"),
  ]);

  assert.ok(page.includes('removeConfirm: "Remove {person} from this clinic'));
  assert.ok(page.includes('removeConfirm: "{person} لەم کلینیکە لاببرێت'));
  assert.ok(page.includes('removeConfirm: "{person} ژ ڤێ کلینیکێ بهێتە لابرن'));
  assert.ok(page.includes('removeConfirm: "إزالة {person} من هذه العيادة'));
  assert.match(button, /useFormStatus\(\)/);
  assert.match(button, /const \[hydrated, setHydrated\] = useState\(false\)/);
  assert.match(button, /useEffect\(\(\) => \{[\s\S]*setHydrated\(true\)/);
  assert.match(button, /const disabled = pending \|\| !hydrated/);
  assert.match(button, /disabled=\{disabled\}/);
  assert.match(button, /window\.confirm\(confirmMessage\)/);
  assert.match(button, /event\.preventDefault\(\)/);
});

