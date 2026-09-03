import assert from "node:assert/strict";
import test from "node:test";
import {
  appointmentDestination,
  appointmentFormDestination,
} from "../lib/dashboard-booking-navigation.ts";

test("new appointments return to their actual Baghdad schedule day and saved slot", () => {
  const destination = appointmentDestination({
    clinicId: "11111111-1111-4111-8111-111111111111",
    doctorId: "22222222-2222-4222-8222-222222222222",
    appointmentAt: new Date("2026-08-20T21:30:00.000Z"),
  });

  const url = new URL(destination, "https://atlas.example");
  assert.equal(url.pathname, "/dashboard");
  assert.equal(url.searchParams.get("notice"), "appointment_created");
  assert.equal(url.searchParams.get("clinic"), "11111111-1111-4111-8111-111111111111");
  assert.equal(url.searchParams.get("doctor"), "22222222-2222-4222-8222-222222222222");
  assert.equal(url.searchParams.get("day"), "2026-08-21");
  assert.equal(url.searchParams.get("after"), "2026-08-21T00:30");
});

test("fast-save follows the selected date and carries the saved slot for the next default", () => {
  const destination = appointmentFormDestination({
    clinicId: "11111111-1111-4111-8111-111111111111",
    doctorId: "22222222-2222-4222-8222-222222222222",
    appointmentAt: "2026-08-22T09:15",
  });

  assert.ok(destination);
  const url = new URL(destination, "https://atlas.example");
  assert.equal(url.searchParams.get("day"), "2026-08-22");
  assert.equal(url.searchParams.get("doctor"), "22222222-2222-4222-8222-222222222222");
  assert.equal(url.searchParams.get("notice"), "appointment_created");
  assert.equal(url.searchParams.get("after"), "2026-08-22T09:15");
});

test("fast-save navigation rejects malformed appointment values", () => {
  assert.equal(appointmentFormDestination({
    clinicId: "11111111-1111-4111-8111-111111111111",
    doctorId: "22222222-2222-4222-8222-222222222222",
    appointmentAt: "tomorrow",
  }), null);
});

test("duplicate booking feedback also stays on the attempted appointment day and slot", () => {
  const destination = appointmentDestination({
    clinicId: "11111111-1111-4111-8111-111111111111",
    doctorId: "22222222-2222-4222-8222-222222222222",
    appointmentAt: new Date("2026-08-22T07:00:00.000Z"),
    notice: "appointment_duplicate",
  });

  const url = new URL(destination, "https://atlas.example");
  assert.equal(url.searchParams.get("notice"), "appointment_duplicate");
  assert.equal(url.searchParams.get("day"), "2026-08-22");
  assert.equal(url.searchParams.get("after"), "2026-08-22T10:00");
});
