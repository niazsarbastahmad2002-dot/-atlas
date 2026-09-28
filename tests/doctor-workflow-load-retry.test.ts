import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/doctor-workflow-card.tsx", import.meta.url), "utf8");

test("doctor workflow initial load failure replaces the skeleton with a retry action", () => {
  assert.match(source, /!workflow && state === "failed"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /onClick=\{\(\) => void load\(\)\}/);
  assert.match(source, />\{t\.retry\}<\/button>/);
});

test("doctor workflow load failure and retry copy exists in every Atlas interface language", () => {
  assert.match(source, /Doctor settings could not load/);
  assert.match(source, /ڕێکخستنەکانی پزیشک بار نەکران/);
  assert.match(source, /ڕێکخستنێن دکتۆری بار نەبوون/);
  assert.match(source, /تعذر تحميل إعدادات الطبيب/);
});
