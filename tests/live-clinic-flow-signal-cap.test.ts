import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("../app/api/clinic-live-flow/route.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../app/dashboard/live-clinic-flow.tsx", import.meta.url), "utf8");

test("live clinic patient updates disclose when the bounded view is incomplete", () => {
  assert.match(route, /arrival_signal_at", \{ count: "exact" \}\)/);
  assert.match(route, /signalsTruncated: signalCount !== null && signalCount > \(signals\?\.length \?\? 0\)/);
  assert.match(client, /signalsTruncated\?: boolean/);
  assert.match(client, /flow\.signalsTruncated \? <span className="live-patient-limit" role="status">/);
  assert.match(client, /More patient updates exist\. Atlas is showing the first 100\./);
  assert.match(client, /Atlas تەنها یەکەم ١٠٠ دانە پیشان دەدات/);
  assert.match(client, /Atlas تەنێ ١٠٠ یێن ئێکێ نیشان ددەت/);
  assert.match(client, /يعرض Atlas أول ١٠٠ فقط/);
});


test("live clinic truncation notice keeps patient pills visible across RTL and desktop layouts", () => {
  assert.match(client, /live-patient-updates\{display:grid;grid-template-columns:auto minmax\(0,1fr\)/);
  assert.match(client, /live-patient-limit\{grid-column:1\/-1/);
  assert.match(client, /live-patient-updates\{grid-template-columns:1fr;align-items:flex-start;gap:5px\}/);
});
