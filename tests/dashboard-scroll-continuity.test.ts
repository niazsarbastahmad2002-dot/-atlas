import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("dashboard scroll restoration stays inside the exact clinic doctor and day context", () => {
  const continuity = source("app/dashboard/scroll-continuity.tsx");

  assert.match(continuity, /search: window\.location\.search/);
  assert.match(continuity, /const currentSearch = searchKey \? `\?\$\{searchKey\}` : ""/);
  assert.match(continuity, /saved\.search !== currentSearch/);
  assert.match(continuity, /saved\.path !== pathname/);
  assert.match(continuity, /Date\.now\(\) - saved\.at > 15_000/);
});
