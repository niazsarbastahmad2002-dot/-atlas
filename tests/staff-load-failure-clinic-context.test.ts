import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/staff/page.tsx", import.meta.url), "utf8");

test("staff directory load failures return to settings for the active clinic", () => {
  assert.ok((source.match(/<DirectoryUnavailable label=\{text\.unavailable\} back=\{text\.backSettings\} clinicId=\{clinic\.id\} \/>/g) ?? []).length >= 2);
  assert.match(source, /function DirectoryUnavailable\(\{ label, back, clinicId \}/);
  assert.match(source, /href=\{\`\/dashboard\/settings\?clinic=\$\{clinicId\}\`\}/);
});
