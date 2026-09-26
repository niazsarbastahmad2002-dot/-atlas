import assert from "node:assert/strict";
import test from "node:test";
import {
  allowedAppointmentTransitions,
  appointmentCreatePayloadMatches,
  canTransitionAppointment,
  classifyAppointmentCreateError,
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

test("accepts appointment idempotency only when the saved payload is the same", () => {
  const existing = {
    patient_name: "Ari Hassan",
    patient_phone: "+9647501234567",
    contact_relationship: "patient",
    doctor_id: "11111111-1111-4111-8111-111111111111",
    appointment_at: "2026-09-27T07:30:00.000Z",
    reminder_consent: true,
    reminder_language: "ku",
    voided_at: null,
  };
  const expected = {
    patientName: "Ari Hassan",
    patientPhone: "+9647501234567",
    contactRelationship: "patient" as const,
    doctorId: "11111111-1111-4111-8111-111111111111",
    appointmentAt: "2026-09-27T10:30:00+03:00",
    reminderConsent: true,
    reminderLanguage: "ku",
  };

  assert.equal(appointmentCreatePayloadMatches(existing, expected), true);
  assert.equal(appointmentCreatePayloadMatches({ ...existing, patient_name: "Different Patient" }, expected), false);
  assert.equal(appointmentCreatePayloadMatches({ ...existing, appointment_at: "2026-09-27T08:00:00.000Z" }, expected), false);
  assert.equal(appointmentCreatePayloadMatches({ ...existing, doctor_id: "22222222-2222-4222-8222-222222222222" }, expected), false);
  assert.equal(appointmentCreatePayloadMatches({ ...existing, contact_relationship: "parent_guardian" }, expected), false);
  assert.equal(appointmentCreatePayloadMatches({ ...existing, reminder_language: "bd" }, expected), false);
  assert.equal(appointmentCreatePayloadMatches({ ...existing, voided_at: "2026-09-27T07:00:00.000Z" }, expected), false);
});

test("distinguishes duplicate submissions from occupied doctor slots", () => {
  assert.equal(
    classifyAppointmentCreateError(
      "23505",
      'duplicate key value violates unique constraint "appointments_clinic_idempotency_idx"',
    ),
    "duplicate",
  );
  assert.equal(
    classifyAppointmentCreateError(
      "23505",
      'duplicate key value violates unique constraint "appointments_active_doctor_slot_idx"',
    ),
    "slot_taken",
  );
  assert.equal(classifyAppointmentCreateError("23505", "unknown unique conflict"), "failed");
  assert.equal(classifyAppointmentCreateError("23514", "check constraint failed"), "failed");
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
