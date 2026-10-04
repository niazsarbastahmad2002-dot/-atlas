import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("account settings keeps the active clinic when returning to clinic settings", () => {
  const settings = read("app/dashboard/settings/page.tsx");
  const account = read("app/dashboard/settings/account/page.tsx");

  assert.match(settings, /href=\{\`\/dashboard\/settings\/account\?clinic=\$\{clinic\.id\}\`\}/);
  assert.match(account, /clinic\?: string/);
  assert.match(account, /params\.clinic && isUuid\(params\.clinic\)/);
  assert.match(account, /\`\/dashboard\/settings\?clinic=\$\{returnClinicId\}\`/);
  assert.match(account, /clinicDeleted[\s\S]*\? "\/dashboard"/);
});
