import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("editable clinic settings stay fixed while their server action is pending", () => {
  const button = source("app/components/submit-button.tsx");
  const settings = source("app/dashboard/settings/page.tsx");

  assert.match(button, /lockForm\?: boolean/);
  assert.match(button, /const buttonRef = useRef<HTMLButtonElement>\(null\)/);
  assert.match(button, /form\.setAttribute\("aria-busy", "true"\)/);
  assert.match(button, /if \(canReadOnly\) input\.readOnly = true/);
  assert.match(button, /else input\.disabled = true/);
  assert.match(button, /textarea\.readOnly = true/);
  assert.match(button, /select\.disabled = true/);
  assert.match(button, /input\.readOnly = readOnly/);
  assert.match(button, /input\.disabled = wasDisabled/);
  assert.match(button, /select\.disabled = wasDisabled/);
  assert.ok((settings.match(/lockForm/g) ?? []).length >= 3);
});
