import assert from "node:assert/strict";
import test from "node:test";
import { appointmentDestination } from "../lib/dashboard-booking-navigation.ts";

test("new appointments return to their actual Baghdad schedule day", () => {
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
});

test("duplicate booking feedback also stays on the attempted appointment day", () => {
  const destination = appointmentDestination({
    clinicId: "11111111-1111-4111-8111-111111111111",
    doctorId: "22222222-2222-4222-8222-222222222222",
    appointmentAt: new Date("2026-08-22T07:00:00.000Z"),
    notice: "appointment_duplicate",
  });

  const url = new URL(destination, "https://atlas.example");
  assert.equal(url.searchParams.get("notice"), "appointment_duplicate");
  assert.equal(url.searchParams.get("day"), "2026-08-22");
});
