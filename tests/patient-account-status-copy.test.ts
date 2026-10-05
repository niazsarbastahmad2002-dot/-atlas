import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/patient-account/page.tsx", import.meta.url), "utf8");

test("My Appointments uses patient-facing language for statuses that need interpretation", () => {
  assert.match(page, /pending: "Needs confirmation"/);
  assert.match(page, /no_show: "Appointment ended"/);
  assert.doesNotMatch(page, /pending: "Pending"|no_show: "No-show"/);
});

test("patient-friendly pending and ended wording is localized across Atlas languages", () => {
  assert.match(page, /pending: "پشتڕاستکردنەوە پێویستە"/);
  assert.match(page, /no_show: "مەوعیدەکە تێپەڕی"/);
  assert.match(page, /pending: "پشتڕاستکرن پێدڤییە"/);
  assert.match(page, /no_show: "وادە دەرباز بوو"/);
  assert.match(page, /pending: "يحتاج تأكيد"/);
  assert.match(page, /no_show: "انتهى الموعد"/);
});

test("status copy change keeps the underlying appointment statuses and private RPC unchanged", () => {
  assert.match(page, /appointment\.appointment_status === "pending"/);
  assert.match(page, /appointment\.appointment_status === "confirmed"/);
  assert.match(page, /admin\.rpc\("list_patient_account_appointments_service"/);
  assert.doesNotMatch(page, /update\(|insert\(|delete\(/);
});
