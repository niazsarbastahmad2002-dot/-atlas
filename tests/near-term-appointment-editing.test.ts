import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("near-term appointment details remain editable at their existing time", () => {
  const source = readFileSync(
    new URL("../app/dashboard/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /min=\{toBaghdadInputValue\(new Date\(Math\.min\(minimum\.getTime\(\), new Date\(appointment\.appointment_at\)\.getTime\(\)\)\)\)\}/,
  );
  assert.match(source, /const canEditDetails = new Date\(appointment\.appointment_at\)\.getTime\(\) >= now - 60_000/);
});


test("appointment edit disclosure identifies the patient for assistive technology", () => {
  const editor = readFileSync(new URL("../app/dashboard/appointment-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /aria-label=\\{`\\$\\{open \\? t\\.close : t\\.edit\\}: \\$\\{patientName\\}`\\}/);
});
