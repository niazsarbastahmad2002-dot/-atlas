import assert from "node:assert/strict";
import test from "node:test";
import {
  allowedAppointmentTransitions,
  canTransitionAppointment,
  classifyAppointmentMutationError,
  cleanDisplayName,
  formatIraqiMobile,
  isUuid,
  isValidDisplayName,
  normalizeIraqiMobile,
  parseBaghdadDateTime,
  toBaghdadInputValue,
} from "../lib/appointments.ts";

test("normalizes common Iraqi mobile formats", () => {
  assert.equal(normalizeIraqiMobile("0750 123 4567"), "+9647501234567");
  assert.equal(normalizeIraqiMobile("+964 750 123 4567"), "+9647501234567");
  assert.equal(normalizeIraqiMobile("00964-750-123-4567"), "+9647501234567");
  assert.equal(normalizeIraqiMobile("9647501234567"), "+9647501234567");
});

test("accepts Kurdish and Arabic-script digits for Iraqi mobiles", () => {
  assert.equal(normalizeIraqiMobile("٠٧٥٠ ١٢٣ ٤٥٦٧"), "+9647501234567");
  assert.equal(normalizeIraqiMobile("۰۷۵۰ ۱۲۳ ۴۵۶۷"), "+9647501234567");
});

test("rejects invalid Iraqi mobile numbers", () => {
  assert.equal(normalizeIraqiMobile("12345"), null);
  assert.equal(normalizeIraqiMobile("+9646501234567"), null);
  assert.equal(normalizeIraqiMobile("0750123456"), null);
});

test("formats stored Iraqi mobile numbers for receptionist display", () => {
  assert.equal(formatIraqiMobile("+9647501234567"), "0750 123 4567");
  assert.equal(formatIraqiMobile("07501234567"), "0750 123 4567");
  assert.equal(formatIraqiMobile("not-a-phone"), "not-a-phone");
});

test("cleans and validates display names", () => {
  assert.equal(cleanDisplayName("  Dr.   Alan  "), "Dr. Alan");
  assert.equal(isValidDisplayName("Dr. Alan"), true);
  assert.equal(isValidDisplayName("A"), false);
  assert.equal(isValidDisplayName("Bad\u0000Name"), false);
});

test("validates UUIDs", () => {
  assert.equal(isUuid("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(isUuid("not-a-uuid"), false);
});

test("enforces receptionist-friendly appointment status transitions", () => {
  assert.deepEqual(allowedAppointmentTransitions("pending"), ["confirmed", "cancelled", "completed", "no_show"]);
  assert.equal(canTransitionAppointment("pending", "confirmed"), true);
  assert.equal(canTransitionAppointment("pending", "completed"), true);
  assert.equal(canTransitionAppointment("pending", "no_show"), true);
  assert.equal(canTransitionAppointment("confirmed", "no_show"), true);
  assert.equal(canTransitionAppointment("completed", "completed"), true);
});

test("maps appointment constraint failures without weakening database invariants", () => {
  assert.equal(
    classifyAppointmentMutationError("23514", "appointment outcome cannot be recorded before its scheduled time"),
    "too_early",
  );
  assert.equal(
    classifyAppointmentMutationError("23514", "past cancelled appointment cannot be reopened"),
    "past_cancelled",
  );
  assert.equal(classifyAppointmentMutationError("23514", "invalid appointment status transition"), "invalid");
  assert.equal(classifyAppointmentMutationError("23505", "duplicate key value"), "slot_taken");
  assert.equal(classifyAppointmentMutationError("55P03", "could not obtain lock"), "busy");
  assert.equal(classifyAppointmentMutationError("42501", "authenticated actor required"), "invalid");
});

test("parses and formats Baghdad-local appointment times", () => {
  const now = new Date("2026-08-15T00:00:00Z");
  const parsed = parseBaghdadDateTime("2026-08-15T12:30", now);
  assert.ok(parsed);
  assert.equal(parsed.toISOString(), "2026-08-15T09:30:00.000Z");
  assert.equal(toBaghdadInputValue(parsed), "2026-08-15T12:30");
});

test("parses localized digits in Baghdad appointment times", () => {
  const now = new Date("2026-08-15T00:00:00Z");
  const parsed = parseBaghdadDateTime("٢٠٢٦-٠٨-١٥T١٢:٣٠", now);
  assert.ok(parsed);
  assert.equal(parsed.toISOString(), "2026-08-15T09:30:00.000Z");
});

test("rejects malformed, past, and excessively distant appointment times", () => {
  const now = new Date("2026-08-15T00:00:00Z");
  assert.equal(parseBaghdadDateTime("2026-02-30T12:30", now), null);
  assert.equal(parseBaghdadDateTime("2026-08-14T23:30", now), null);
  assert.equal(parseBaghdadDateTime("2026-08-14T01:00", now), null);
  assert.equal(parseBaghdadDateTime("2030-08-15T12:30", now), null);
});
