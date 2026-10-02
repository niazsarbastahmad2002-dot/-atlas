import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("live clinic flow resets immediately when clinic doctor or day changes", () => {
  const navigation = source("app/dashboard/app-navigation.tsx");

  assert.match(navigation, /const liveFlowKey = \[searchParams\.get\("clinic"\)/);
  assert.match(navigation, /searchParams\.get\("doctor"\)/);
  assert.match(navigation, /searchParams\.get\("day"\)/);
  assert.match(navigation, /<LiveClinicFlow[\s\S]*key=\{liveFlowKey\}/);
});
