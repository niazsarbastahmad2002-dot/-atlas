import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/loading.tsx", import.meta.url), "utf8");

test("dashboard loading skeleton matches the six-metric receptionist summary", () => {
  assert.match(source, /workspace-stats schedule-summary/);
  assert.match(source, /Array\.from\(\{ length: 6 \}/);
  assert.match(source, /stat schedule-stat skeleton/);
});
