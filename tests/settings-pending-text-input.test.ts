import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("settings name fields stay fixed while their server action is pending", () => {
  const page = read("app/dashboard/settings/page.tsx");
  const input = read("app/dashboard/settings/pending-text-input.tsx");

  assert.match(page, /import \{ PendingTextInput \} from "\.\/pending-text-input"/);
  assert.match(page, /<PendingTextInput id="clinic_name" name="clinic_name"/);
  assert.match(page, /<PendingTextInput id="new_doctor_name" name="doctor_name"/);
  assert.match(page, /<PendingTextInput id=\{\`doctor-\$\{doctor\.id\}\`\} name="doctor_name"/);
  assert.match(input, /useFormStatus\(\)/);
  assert.match(input, /disabled=\{disabled \|\| pending\}/);
});
