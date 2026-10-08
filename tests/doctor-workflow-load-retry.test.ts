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

test("failed doctor switches hide stale settings but retain an administrator doctor recovery picker", () => {
  const loadFailure = source.indexOf('} catch {\n      if (requestId !== loadRequestRef.current) return;');
  const clear = source.indexOf("setWorkflow(null);", loadFailure);
  const retry = source.indexOf("setRetryDoctorId(requested);", loadFailure);
  const failed = source.indexOf('setState("load-failed");', loadFailure);
  assert.ok(loadFailure >= 0 && clear > loadFailure && clear < retry && retry < failed);

  assert.match(source, /const \[availableDoctors, setAvailableDoctors\] = useState<Workflow\["doctors"\]>\(\[\]\)/);
  assert.match(source, /setAvailableDoctors\(data\.doctors\)/);
  assert.match(source, /availableDoctors\.length > 1 \? \(/);
  assert.match(source, /availableDoctors\.map\(\(doctor\) => <option key=\{doctor\.id\} value=\{doctor\.id\} data-atlas-user-content="true">/);
  assert.match(source, /<select aria-label=\{t\.doctor\} value="" onChange=\{\(event\) => void load\(event\.target\.value\)\}>/);
  assert.match(source, /if \(!workflow \|\| state === "saving" \|\| state === "loading" \|\| state === "load-failed"\) return;/);
});

test("doctor selectors preserve persisted names in Sorani and Badini", () => {
  const userNameOptions = source.match(/<option key=\{doctor\.id\} value=\{doctor\.id\} data-atlas-user-content="true">\{doctor\.name\}<\/option>/g) ?? [];
  assert.equal(userNameOptions.length, 2, "both recovery and normal doctor selectors keep user names unchanged");
});
