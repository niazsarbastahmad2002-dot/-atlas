import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const editor = readFileSync(new URL("../app/dashboard/appointment-editor.tsx", import.meta.url), "utf8");
const dateTime = readFileSync(new URL("../app/dashboard/appointment-edit-datetime-field.tsx", import.meta.url), "utf8");

test("inline appointment controls cannot drift after a save starts", () => {
  assert.ok((editor.match(/disabled=\{pending\}/g) ?? []).length >= 7);
  assert.match(editor, /<AppointmentEditDateTimeField[\s\S]*disabled=\{pending\}/);
  assert.match(dateTime, /disabled\?: boolean/);
  assert.match(dateTime, /disabled=\{disabled \|\| cell\.disabled\}/);
  assert.match(dateTime, /disabled=\{disabled \|\| !valid\}/);
});
