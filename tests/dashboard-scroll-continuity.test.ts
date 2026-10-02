import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("dashboard scroll restoration follows clinic doctor and day but ignores transient feedback", () => {
  const continuity = source("app/dashboard/scroll-continuity.tsx");

  assert.match(continuity, /function scheduleContextKey/);
  assert.match(continuity, /params\.get\("clinic"\)/);
  assert.match(continuity, /params\.get\("doctor"\)/);
  assert.match(continuity, /params\.get\("day"\)/);
  assert.match(continuity, /saved\.scheduleKey !== currentScheduleKey/);
  assert.doesNotMatch(continuity, /params\.get\("notice"\)/);
  assert.doesNotMatch(continuity, /params\.get\("error"\)/);
  assert.doesNotMatch(continuity, /params\.get\("after"\)/);
  assert.match(continuity, /Date\.now\(\) - saved\.at > 15_000/);
});
