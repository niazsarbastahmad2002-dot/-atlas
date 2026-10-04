import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/history/history-client.tsx", import.meta.url), "utf8");

test("appointment history reuses Atlas multilingual name and phone normalization", () => {
  assert.match(source, /normalizeName, normalizePhone/);
  assert.match(source, /const nameNeedle = normalizeName\(rawQuery\)/);
  assert.match(source, /const phoneDigits = normalizePhone\(rawQuery\)/);
  assert.match(source, /const nameQuery = \/\\p\{L\}\/u\.test\(rawQuery\)/);
  assert.match(source, /nameNeedle && normalizeName\(\`\$\{row\.patientName\} \$\{row\.doctorName\}\`\)/);
  assert.doesNotMatch(source, /normalizeName\(\`\$\{row\.patientName\} \$\{row\.patientPhone\}/);
  assert.match(source, /phoneDigits\.length >= 4 && normalizePhone\(row\.patientPhone\)\.includes\(phoneDigits\)/);
  assert.doesNotMatch(source, /function normalizeHistorySearch/);
});
