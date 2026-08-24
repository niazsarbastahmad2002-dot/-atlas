import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("current App Review notes match the phone-first native iOS build", async () => {
  const notes = await read("docs/app-review-notes-current.md");

  assert.match(notes, /Try native sample clinic/);
  assert.match(notes, /Today/);
  assert.match(notes, /Workspace/);
  assert.match(notes, /phone-first/i);
  assert.match(notes, /Continuity Mode/);
  assert.match(notes, /Universal Links/);
  assert.doesNotMatch(notes, /Continue with Apple/);
  assert.doesNotMatch(notes, /tap \*\*Continue with Apple\*\*/i);
});
