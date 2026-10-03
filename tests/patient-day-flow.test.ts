import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { baghdadDateKey, patientDayFlowDelay } from "../lib/patient-day-flow.ts";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("patient clinic timing accepts only Atlas bounded timing values", () => {
  for (const value of [-15, 0, 15, 30, 45, 60, 90, 120]) {
    assert.equal(patientDayFlowDelay(value), value);
  }
  assert.equal(patientDayFlowDelay(13), null);
  assert.equal(patientDayFlowDelay(180), null);
  assert.equal(patientDayFlowDelay("15"), null);
  assert.equal(patientDayFlowDelay(null), null);
});

test("patient clinic timing compares service dates in Baghdad time", () => {
  assert.equal(
    baghdadDateKey(new Date("2026-10-03T21:30:00Z")),
    "2026-10-04",
  );
});

test("private patient page shows bounded live clinic timing and refreshes automatically", () => {
  const page = source("app/patient/[token]/page.tsx");
  const refresh = source("app/components/live-page-refresh.tsx");
  const types = source("lib/database.types.ts");

  assert.match(page, /patient_get_day_flow/);
  assert.match(page, /baghdadDateKey\(appointmentDate\) === baghdadDateKey\(new Date\(\)\)/);
  assert.match(page, /patientDayFlowDelay/);
  assert.match(page, /Clinic timing/);
  assert.match(page, /Running on time/);
  assert.match(page, /About \{minutes\} min late/);
  assert.match(page, /کاتی کلینیک/);
  assert.match(page, /وقت العيادة/);
  assert.match(page, /estimate, not an exact wait time/);
  assert.match(refresh, /pathname\.startsWith\("\/patient\/"\)/);
  assert.match(refresh, /15_000/);
  assert.match(types, /patient_get_day_flow: \{ Args: \{ p_token_hash: string \}; Returns: \{ delay_minutes: number; timing_updated_at: string \}\[\] \}/);
});
