import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("live clinic flow follows the schedule's resolved clinic doctor and day", () => {
  const page = source("app/dashboard/page.tsx");
  const navigation = source("app/dashboard/app-navigation.tsx");
  const flow = source("app/dashboard/live-clinic-flow.tsx");

  assert.match(page, /<LiveClinicFlow/);
  assert.match(page, /key=\{\`\$\{clinic\.id\}:\$\{selectedDoctor\?\.id \?\? "none"\}:\$\{selectedDay\}\`\}/);
  assert.match(page, /clinicId=\{clinic\.id\}/);
  assert.match(page, /doctorId=\{selectedDoctor\?\.id \?\? null\}/);
  assert.match(page, /day=\{selectedDay\}/);
  assert.match(page, /\s+embedded\s*\/>/);
  assert.match(flow, /const shellClass = embedded \? "live-clinic-flow" : "live-clinic-flow shell"/);
  assert.ok((flow.match(/className=\{shellClass\}/g) ?? []).length >= 2);
  assert.doesNotMatch(navigation, /LiveClinicFlow|liveFlowKey/);
});
