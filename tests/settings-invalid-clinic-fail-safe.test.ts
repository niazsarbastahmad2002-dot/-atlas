import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/settings/page.tsx", import.meta.url), "utf8");

test("settings never falls through to another clinic when an explicit clinic link is invalid or unavailable", () => {
  assert.match(source, /if \(params\.clinic && \(!requestedClinic \|\| !clinics\.some\(\(item\) => item\.id === requestedClinic\)\)\)/);
  assert.match(source, /redirect\("\/dashboard\?error=clinic_unavailable"\)/);
  assert.match(source, /const clinic = clinics\.find\(\(item\) => item\.id === requestedClinic\) \?\? clinics\[0\]/);
});
