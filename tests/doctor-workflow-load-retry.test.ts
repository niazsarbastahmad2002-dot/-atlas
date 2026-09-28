import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/doctor-workflow-card.tsx", import.meta.url), "utf8");

test("doctor workflow initial load failure replaces the skeleton with a retry action", () => {
  assert.match(source, /!workflow && state === "load-failed"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /onClick=\{\(\) => void load\(retryDoctorId\)\}/);
  assert.match(source, />\{t\.retry\}<\/button>/);
});

test("doctor workflow load failure and retry copy exists in every Atlas interface language", () => {
  assert.match(source, /Doctor settings could not load/);
  assert.match(source, /ڕێکخستنەکانی پزیشک بار نەکران/);
  assert.match(source, /ڕێکخستنێن دکتۆری بار نەبوون/);
  assert.match(source, /تعذر تحميل إعدادات الطبيب/);
});

test("doctor workflow distinguishes load failures from save failures", () => {
  assert.match(source, /setState\("load-failed"\)/);
  assert.match(source, /setState\("save-failed"\)/);
  assert.match(source, /state === "load-failed" \? t\.loadFailed : state === "save-failed" \? t\.failed/);
});

test("doctor workflow retry remembers the doctor request that failed", () => {
  assert.match(source, /setRetryDoctorId\(requested\)/);
  assert.match(source, /void load\(retryDoctorId\)/);
});
