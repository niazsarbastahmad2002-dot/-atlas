import assert from "node:assert/strict";
import test from "node:test";
import { bookingRetryMatches, interpretBookingResponse } from "../lib/patient-booking-outcome.ts";

const patientPath = `/patient/${"a".repeat(64)}?lang=ku`;

test("only a positive server reply with a private destination is classified as saved", () => {
  assert.equal(interpretBookingResponse(200, { status: "ok", patientPath }), "saved");
  assert.equal(interpretBookingResponse(200, { status: "ok" }), "uncertain");
  assert.equal(interpretBookingResponse(202, { status: "pending" }), "failed");
  assert.equal(interpretBookingResponse(400, { status: "ok", patientPath }), "uncertain");
});

test("verified exact retry opens the patient portal instead of an unused private token", () => {
  assert.equal(interpretBookingResponse(200, { status: "duplicate", accountPath: "/patient-account?lang=en" }), "existing");
  assert.equal(interpretBookingResponse(200, { status: "duplicate" }), "uncertain");
  assert.equal(interpretBookingResponse(503, { status: "duplicate", accountPath: "/patient-account?lang=en" }), "uncertain");
  assert.equal(interpretBookingResponse(200, { status: "ok", accountPath: "/patient-account?lang=en" }), "uncertain");
});

test("changed availability and conflicting retries are never classified as success", () => {
  assert.equal(interpretBookingResponse(409, { status: "slot_taken" }), "slot_taken");
  assert.equal(interpretBookingResponse(400, { status: "unavailable" }), "unavailable");
  assert.equal(interpretBookingResponse(400, { status: "idempotency_mismatch" }), "idempotency_mismatch");
  assert.equal(interpretBookingResponse(401, { status: "verification_required" }), "verification_required");
  assert.equal(interpretBookingResponse(429, { status: "rate_limited" }), "rate_limited");
});

test("a lost, broken or server-error response is uncertain rather than a definite failure", () => {
  for (const payload of [null, undefined, {}, "invalid", { status: "ok" }]) {
    assert.equal(interpretBookingResponse(200, payload), "uncertain");
  }
  assert.equal(interpretBookingResponse(500, { status: "failed" }), "uncertain");
  assert.equal(interpretBookingResponse(503, { status: "not_ready" }), "uncertain");
  assert.equal(interpretBookingResponse(400, { status: "invalid" }), "failed");
});

test("duplicate submissions can retry only the exact original booking payload", () => {
  const original = JSON.stringify({ clinicSlug: "qa-clinic", doctorSlug: "qa-doctor", slotAt: "2026-11-03T09:00:00Z", patientName: "Synthetic Patient", reminderConsent: false, idempotencyKey: "a7d7ea4a-f922-41f4-8ff7-6f8120c03a35" });
  assert.equal(bookingRetryMatches(null, original), true);
  assert.equal(bookingRetryMatches(original, original), true);
  assert.equal(bookingRetryMatches(original, original.replace("09:00", "10:00")), false);
  assert.equal(bookingRetryMatches(original, original.replace("false", "true")), false);
  assert.equal(bookingRetryMatches(original, original.replace("Synthetic Patient", "Another Synthetic Patient")), false);
});
