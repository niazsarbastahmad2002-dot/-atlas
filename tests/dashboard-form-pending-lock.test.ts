import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("dashboard server-action forms can lock all controls while pending", () => {
  const button = source("app/components/submit-button.tsx");
  const settings = source("app/dashboard/settings/page.tsx");
  const staff = source("app/dashboard/staff/page.tsx");

  assert.match(button, /lockForm\?: boolean/);
  assert.match(button, /const buttonRef = useRef<HTMLButtonElement>\(null\)/);
  assert.match(button, /const wasInert = form\.inert/);
  assert.match(button, /form\.inert = true/);
  assert.match(button, /if \(form\.isConnected\) form\.inert = wasInert/);
  assert.ok((settings.match(/lockForm/g) ?? []).length >= 3);
  assert.ok((staff.match(/lockForm/g) ?? []).length >= 2);
});
