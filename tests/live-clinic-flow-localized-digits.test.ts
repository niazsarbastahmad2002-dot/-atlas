import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/live-clinic-flow.tsx", import.meta.url), "utf8");

test("live clinic timing renders delay digits in the active locale", () => {
  assert.match(source, /localizeDigits\(value, locale\)/);
  assert.match(source, /early: "١٥ د أبكر"/);
});
