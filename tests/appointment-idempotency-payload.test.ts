import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("normal appointment retries verify the existing idempotency payload before claiming success", () => {
  const actions = read("app/dashboard/actions.ts");

  assert.match(actions, /conflict === "duplicate"[\s\S]*idempotency_key[\s\S]*appointmentCreatePayloadMatches/);
  assert.match(actions, /contactRelationship: "patient"/);
  assert.match(actions, /if \(matches\)[\s\S]*notice: "appointment_duplicate"/);
  assert.match(actions, /idempotency payload mismatch[\s\S]*appointment_create_failed/);
});

test("fast appointment retries verify patient/contact/time details before claiming success", () => {
  const action = read("app/dashboard/instant-actions.ts");

  assert.match(action, /createFailure === "duplicate"[\s\S]*idempotency_key[\s\S]*appointmentCreatePayloadMatches/);
  assert.match(action, /contactRelationship: relationship/);
  assert.match(action, /if \(matches\)[\s\S]*duplicate: true/);
  assert.match(action, /fast appointment idempotency payload mismatch[\s\S]*reason: "failed"/);
});
