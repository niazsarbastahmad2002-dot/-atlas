import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("dashboard loading landmarks do not force English labels in Kurdish or Arabic interfaces", () => {
  const dashboard = read("app/dashboard/loading.tsx");
  const settings = read("app/dashboard/settings/loading.tsx");

  assert.match(dashboard, /aria-busy="true"/);
  assert.match(settings, /aria-busy="true"/);
  assert.doesNotMatch(dashboard, /aria-label="Loading schedule"/);
  assert.doesNotMatch(settings, /aria-label="Loading settings"/);
});
