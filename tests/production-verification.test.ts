import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("production verification waits for the exact deployed commit before browser smoke tests", () => {
  const route = source("app/api/version/route.ts");
  const waiter = source("scripts/wait-for-production.mjs");
  const workflow = source(".github/workflows/production-smoke.yml");

  assert.match(route, /VERCEL_GIT_COMMIT_SHA/);
  assert.match(route, /Cache-Control/);
  assert.match(waiter, /ATLAS_EXPECTED_COMMIT/);
  assert.match(waiter, /lastSeen === expectedCommit/);
  assert.match(workflow, /ATLAS_EXPECTED_COMMIT: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /wait-for-production\.mjs/);
});

test("production browser verification is read-only against clinic systems and covers Apple-sized viewports", () => {
  const config = source("playwright.production.config.mjs");
  const spec = source("e2e/production-smoke.spec.mjs");

  assert.match(config, /browserName: "webkit"/);
  assert.match(config, /width: 390, height: 844/);
  assert.match(config, /width: 1024, height: 1366/);
  assert.match(spec, /production login renders safely without sending authentication traffic/);
  assert.match(spec, /production safe demo supports the receptionist appointment flow without backend writes/);
  assert.match(spec, /expect\(backendWrites\)\.toEqual\(\[\]\)/);
});
