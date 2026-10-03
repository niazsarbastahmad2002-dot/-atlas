import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("dashboard loading landmarks stay language-neutral without breaking Safari stall recovery", () => {
  const dashboard = read("app/dashboard/loading.tsx");
  const settings = read("app/dashboard/settings/loading.tsx");
  const refresh = read("app/components/live-page-refresh.tsx");

  assert.match(dashboard, /aria-busy="true" data-atlas-loading="schedule"/);
  assert.match(settings, /aria-busy="true" data-atlas-loading="settings"/);
  assert.doesNotMatch(dashboard, /aria-label="Loading schedule"/);
  assert.doesNotMatch(settings, /aria-label="Loading settings"/);
  assert.match(refresh, /data-atlas-loading="schedule"/);
  assert.doesNotMatch(refresh, /aria-label="Loading schedule"/);
});
