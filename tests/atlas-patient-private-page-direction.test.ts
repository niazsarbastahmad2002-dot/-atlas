import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const account = source("app/patient-account/page.tsx");
const appointment = source("app/patient/[token]/page.tsx");

test("private Atlas Patient account declares the resolved language and direction at the page boundary", () => {
  assert.match(account, /const meta = localeMeta\(locale\)/);
  assert.match(account, /<main className="patient-account-page" lang=\{meta\.lang\} dir=\{meta\.dir\}>/);
});

test("private appointment and unavailable shells declare the resolved language and direction", () => {
  const matches = appointment.match(/<main className="patient-page" lang=\{text\.lang\} dir=\{text\.dir\}>/g) ?? [];
  assert.equal(matches.length, 2);
  const unavailable = appointment.slice(appointment.indexOf("function Unavailable"));
  assert.match(unavailable, /<main className="patient-page" lang=\{text\.lang\} dir=\{text\.dir\}>/);
});

test("private Patient direction change keeps phone and clock values direction-safe", () => {
  assert.match(appointment, /dir="ltr">\{receptionPhone\}/);
  assert.match(appointment, /<bdi dir="ltr">\{time\.clock\}<\/bdi>/);
});

test("private Patient direction change is presentation-only", () => {
  assert.doesNotMatch(account, /update_patient|clinic_members|grant|revoke/i);
  assert.doesNotMatch(appointment, /grant|revoke|service_role/i);
});
