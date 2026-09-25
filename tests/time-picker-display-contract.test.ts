import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/components/atlas-time-picker-polish.tsx", import.meta.url), "utf8");

test("time picker polish applies to every Atlas UI locale", () => {
  assert.doesNotMatch(source, /locale\s*!==\s*["']ku["']/);
  assert.match(source, /\.atlas-hour-grid button/);
  assert.match(source, /\.atlas-minute-grid button/);
  assert.match(source, /\.fast-time-picker \.hour-grid button/);
  assert.match(source, /\.fast-time-picker \.minute-grid button/);
});

test("time display polish covers dashboard, edit, and patient clocks", () => {
  assert.match(source, /\.atlas-selected-time strong/);
  assert.match(source, /\.patient-time-value bdi/);
  assert.match(source, /\.edit-time-preview/);
  assert.match(source, /\[٠0\]/);
});


test("appointment date and time controls stay visually separate", () => {
  const createField = readFileSync(new URL("../app/dashboard/appointment-time-field-v2.tsx", import.meta.url), "utf8");
  const editField = readFileSync(new URL("../app/dashboard/appointment-edit-datetime-field.tsx", import.meta.url), "utf8");

  assert.match(createField, /formatAppointmentDateValue\(date\)/);
  assert.match(createField, /className="atlas-date-value"/);
  assert.match(editField, /edit-datetime-fields/);
  assert.match(editField, /id=\{\`\$\{id\}-date-trigger\`\}/);
  assert.match(editField, /id=\{\`\$\{id\}-time-trigger\`\}/);
  assert.match(editField, /formatAppointmentDateValue\(date\)/);
  assert.match(editField, /formatTimeValue\(clock, locale\)/);
});


test("appointment edit date and time controls stack safely on narrow phones", () => {
  const editField = readFileSync(new URL("../app/dashboard/appointment-edit-datetime-field.tsx", import.meta.url), "utf8");
  assert.match(editField, /@media \(max-width: 560px\)/);
  assert.match(editField, /\.edit-datetime-fields \{ grid-template-columns: 1fr; \}/);
});
