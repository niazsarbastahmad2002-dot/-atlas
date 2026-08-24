import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// Keep these checks focused on the two visible product regressions reported in production and guarded for release.
test("marketing Atlas wordmark keeps readable contrast and sample clinic is a real secondary action", async () => {
  const home = await read("app/page.tsx");
  assert.match(home, /atlas-marketing-brand/);
  assert.match(home, /atlas-marketing-brand \.app-brand-word\{color:var\(--ink\);opacity:1\}/);
  assert.match(home, /button button-ghost atlas-demo-link/);
  assert.match(home, /Try a sample clinic/);
});

test("sample clinic uses the current Atlas-style interactive workspace", async () => {
  const [page, demo] = await Promise.all([
    read("app/demo/page.tsx"),
    read("app/demo/demo-modern.tsx"),
  ]);
  assert.match(page, /ModernDemoWorkspace/);
  assert.match(demo, /app-topbar/);
  assert.match(demo, /workspace-page shell/);
  assert.match(demo, /schedule-date-shortcuts/);
  assert.match(demo, /workspace-stats/);
  assert.match(demo, /appointment-composer/);
  assert.match(demo, /polished-appointment-list/);
  assert.match(demo, /Sample clinic/);
  assert.match(demo, /nothing is saved/i);
});
