import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("settings name draft is preserved when keyboard focus moves to submit", () => {
  const reset = source("app/dashboard/settings-draft-reset.tsx");

  assert.match(reset, /function submitControlForm/);
  assert.match(reset, /button\[type="submit"\], input\[type="submit"\]/);
  assert.match(reset, /submitControlForm\(event\.relatedTarget\)/);
  assert.match(reset, /input\.form === keyboardSubmitForm/);
  assert.match(reset, /input\.form === confirmingForm/);
});
