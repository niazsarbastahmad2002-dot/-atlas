import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/doctor-workflow-card.tsx", import.meta.url), "utf8");

test("superseded doctor workflow loads cannot overwrite the latest doctor settings", () => {
  assert.match(source, /const loadRequestRef = useRef\(0\)/);
  assert.match(source, /const requestId = \+\+loadRequestRef\.current/);
  assert.match(source, /if \(requestId !== loadRequestRef\.current\) return;/);
  assert.match(source, /const next = await response\.json\(\) as Workflow/);
  assert.match(source, /apply\(next\)/);
});


test("doctor workflow client state is isolated by clinic", () => {
  const settings = readFileSync(new URL("../app/dashboard/settings/page.tsx", import.meta.url), "utf8");
  assert.match(settings, /<DoctorWorkflowCard key=\{clinic\.id\} clinicId=\{clinic\.id\}/);
});
