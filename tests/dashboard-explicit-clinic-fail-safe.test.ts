import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const paths = [
  "app/dashboard/activity/page.tsx",
  "app/dashboard/history/page.tsx",
  "app/dashboard/staff/page.tsx",
  "app/dashboard/assistant/page.tsx",
];

for (const path of paths) {
  test(`${path} rejects an explicit clinic that is invalid or unavailable`, () => {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(source, /if \(params\.clinic && \(!requestedClinic(?:Id)? \|\| !clinics\.some\(\(item\) => item\.id === requestedClinic(?:Id)?\)\)\)/);
    assert.match(source, /redirect\("\/dashboard\?error=clinic_unavailable"\)/);
  });
}
