import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/dashboard-client-polish.tsx", import.meta.url), "utf8");
const start = source.indexOf("const polish = () =>");
const end = source.indexOf("const schedulePolish =", start);
const body = source.slice(start, end);

test("hydrated schedule and staff pages never have React-owned text rewritten", () => {
  assert.ok(start !== -1 && end > start);
  const guard = body.indexOf('if (pathname === "/dashboard" || pathname === "/dashboard/staff") return;');
  const walker = body.indexOf("document.createTreeWalker(");
  assert.ok(guard >= 0 && walker > guard, "localized React text must be skipped before the DOM text walker");
  assert.match(body, /if \(locale === "en"\) return;/);
});

test("schedule text guard leaves existing phone formatting and fast-save binding intact", () => {
  const guard = source.indexOf('if (pathname === "/dashboard" || pathname === "/dashboard/staff") return;');
  assert.ok(source.indexOf("preparePhoneInput") < guard);
  assert.ok(source.indexOf("prepareAppointmentForm") < guard);
  assert.match(source, /createAppointmentInline/);
  assert.match(source, /localizeVisibleText\(node\.data, locale\)/, "legacy settings translations stay available");
});
