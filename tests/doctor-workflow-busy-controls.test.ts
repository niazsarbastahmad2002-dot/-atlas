import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/doctor-workflow-card.tsx", import.meta.url), "utf8");

test("doctor workflow controls stay fixed while a load or save is pending", () => {
  assert.match(source, /const controlsBusy = state === "saving" \|\| state === "loading"/);
  assert.ok((source.match(/disabled=\{controlsBusy\}/g) ?? []).length >= 7);
  assert.match(source, /disabled=\{workflow\.role !== "admin" \|\| controlsBusy\}/);
});
