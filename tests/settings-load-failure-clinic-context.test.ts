import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/settings/page.tsx", import.meta.url), "utf8");

test("settings load failures return to the same clinic dashboard", () => {
  assert.match(source, /<SettingsUnavailable[^>]*clinicId=\{clinic\.id\}/);
  assert.match(source, /function SettingsUnavailable\([^)]*clinicId/);
  assert.match(source, /href=\{\`\/dashboard\?clinic=\$\{clinicId\}\`\}/);
});
