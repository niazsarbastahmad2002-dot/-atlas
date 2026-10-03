import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/dashboard-client-polish.tsx", import.meta.url), "utf8");

test("dashboard polish observer stays scoped to the Atlas shell", () => {
  assert.match(source, /const observerRoot = document\.querySelector\("\.app-shell"\) \?\? document\.body/);
  assert.match(source, /observer\.observe\(observerRoot, \{ childList: true, subtree: true, characterData: true \}\)/);
  assert.doesNotMatch(source, /observer\.observe\(document\.body/);
});


test("dashboard polish removes locale-bound DOM listeners before rebuilding", () => {
  assert.match(source, /const listenerCleanups: Array<\(\) => void> = \[\]/);
  assert.match(source, /input\.removeEventListener\("input", update\)/);
  assert.match(source, /form\.removeEventListener\("submit", handleSubmit, true\)/);
  assert.match(source, /listenerCleanups\.forEach\(\(cleanup\) => cleanup\(\)\)/);
});


test("dashboard localization preserves patient and clinic supplied text", () => {
  const polish = source;
  const page = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");

  assert.match(polish, /\["SCRIPT", "STYLE", "OPTION"\]\.includes\(parent\.tagName\)/);
  assert.match(polish, /parent\.closest\('\[data-atlas-user-content="true"\], \[dir="ltr"\], bdi'\)/);
  assert.match(page, /<h1 data-atlas-user-content="true">\{clinic\.name\}<\/h1>/);
  assert.match(page, /className="patient-cell" data-atlas-user-content="true"/);
  assert.match(page, /<dd data-atlas-user-content="true">\{appointment\.doctor_name\}<\/dd>/);
  assert.match(page, /<strong data-atlas-user-content="true">\{doctor\.name\}<\/strong>/);
  assert.match(page, /className="panel-subtitle" data-atlas-user-content=\{selectedDoctor \? "true" : undefined\}/);

  const chooser = readFileSync(new URL("../app/dashboard/select-clinic/page.tsx", import.meta.url), "utf8");
  assert.match(chooser, /<span data-atlas-user-content="true">\{clinic\.name\}<\/span>/);
});
