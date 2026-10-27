import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/dashboard-client-polish.tsx", import.meta.url), "utf8");

test("phone input mutations wait for user interaction instead of running during hydration", () => {
  const start = source.indexOf("const preparePhoneInput =");
  const end = source.indexOf("const prepareAppointmentForm =", start);
  assert.ok(start >= 0 && end > start);
  const part = source.slice(start, end);
  const activate = part.indexOf("const activate = () =>");
  const remove = part.indexOf('input.removeAttribute("pattern")');
  const placeholder = part.indexOf("input.placeholder = localizeDigits(");
  const focus = part.indexOf('input.addEventListener("focus", activate)');
  assert.ok(activate >= 0 && remove > activate && placeholder > activate && focus > placeholder);
  assert.ok(!part.slice(0, activate).includes('input.removeAttribute("pattern")'));
  assert.ok(!part.slice(0, activate).includes("input.placeholder ="));
  assert.ok(part.includes('input.addEventListener("input", update)'));
  assert.ok(part.includes('input.removeEventListener("focus", activate)'));
  assert.ok(part.includes('input.addEventListener("beforeinput", rememberBackwardDelete)'));
  assert.ok(part.includes('input.removeEventListener("input", update)'));
});
