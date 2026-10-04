import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/api/clinic-live-flow/route.ts", import.meta.url), "utf8");

test("live clinic flow does not turn failed reads into an empty healthy state", () => {
  assert.match(source, /data: flow, error: flowError/);
  assert.match(source, /data: signals, error: signalsError/);
  assert.match(source, /if \(flowError \|\| signalsError\)/);
  assert.match(source, /status: 503/);
  assert.match(source, /error: "unavailable"/);
  assert.ok(
    source.indexOf("if (flowError || signalsError)") < source.indexOf("delayMinutes: flow?.delay_minutes ?? null"),
    "read errors must fail before Atlas emits empty timing or signal data",
  );
});
