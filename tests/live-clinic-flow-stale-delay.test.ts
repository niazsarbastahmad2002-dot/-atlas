import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/live-clinic-flow.tsx", import.meta.url), "utf8");

test("stale clinic timing accepts a cleared delay from another device", () => {
  assert.match(
    source,
    /saved\.delayMinutes === null \|\| typeof saved\.delayMinutes === "number" \? saved\.delayMinutes : current\.delayMinutes/,
  );
  assert.match(source, /response\.status === 409 && saved\.error === "stale"/);
});
