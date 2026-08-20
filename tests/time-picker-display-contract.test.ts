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
