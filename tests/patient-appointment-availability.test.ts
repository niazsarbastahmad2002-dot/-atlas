import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { groupPublicAppointmentTimes } from "../lib/patient-appointment-availability.ts";

const now = Date.parse("2026-10-14T00:00:00.000Z");

test("groups and sorts public slot times in Baghdad time, including UTC midnight crossings", () => {
  const groups = groupPublicAppointmentTimes([
    { slot_at: "2026-10-14T21:30:00.000Z" }, // 15 Oct, 12:30 AM Baghdad
    { slot_at: "2026-10-14T11:15:00.000Z" }, // 14 Oct, 2:15 PM Baghdad
    { slot_at: "2026-10-14T06:00:00.000Z" }, // 14 Oct, 9:00 AM Baghdad
  ], "en", now);
  assert.deepEqual(groups.map((group) => group.dateKey), ["2026-10-14", "2026-10-15"]);
  assert.deepEqual(groups[0].slots.map((slot) => slot.label), ["09:00 AM", "02:15 PM"]);
  assert.equal(groups[1].slots[0].label, "12:30 AM");
});

test("never invents days, and omits expired, duplicate, and malformed slots", () => {
  const groups = groupPublicAppointmentTimes([
    { slot_at: "2026-10-13T15:00:00.000Z" }, // expired
    { slot_at: "bad-input" },
    { slot_at: "2026-10-14T08:00:00.000Z" },
    { slot_at: "2026-10-14T11:00:00+03:00" }, // same instant
  ], "en", now);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].slots.length, 1);
  assert.deepEqual(groupPublicAppointmentTimes([], "en", now), []);
  assert.deepEqual(groupPublicAppointmentTimes([{ slot_at: "2026-10-13T15:00:00Z" }], "en", now), []);
});

test("supports English, Sorani, Badini and Arabic clock labels", () => {
  const slots = [{ slot_at: "2026-10-14T15:15:00.000Z" }];
  assert.equal(groupPublicAppointmentTimes(slots, "en", now)[0].slots[0].label, "06:15 PM");
  assert.equal(groupPublicAppointmentTimes(slots, "ku", now)[0].slots[0].label, "٠٦:١٥ د.ن");
  assert.equal(groupPublicAppointmentTimes(slots, "bd", now)[0].slots[0].label, "٠٦:١٥ پشتی نیڤرۆ");
  assert.equal(groupPublicAppointmentTimes(slots, "ar", now)[0].slots[0].label, "٠٦:١٥ م");
});

test("availability page retains read-only public RPC with explicit error and empty states", () => {
  const page = readFileSync(new URL("../app/care/[clinicSlug]/[doctorSlug]/times/page.tsx", import.meta.url), "utf8");
  assert.match(page, /get_public_doctor_profile/);
  assert.match(page, /list_public_doctor_slots_page/);
  assert.match(page, /p_days: 14/);
  assert.match(page, /slotLoadFailed/);
  assert.match(page, /firstSlotPage\.error/);
  assert.match(page, /title=\{t\.loadErrorTitle\}/);
  assert.match(page, /groupPublicAppointmentTimes\(slotData, locale\)/);
  assert.match(page, /<details[^>]*name="atlas-times-day" open=\{index === 0\}/);
  assert.match(page, /atlas-time-option is-readonly/);
  assert.match(page, /t\.noTimesHelp/);
  assert.match(page, /t\.unreserved/);
  assert.match(page, /tel:/);
  assert.doesNotMatch(page, /ATLAS_PUBLIC_PATIENT_BOOKING_ENABLED|\/book\b|PatientBookingForm|getAtlasAuthReadiness/);
});
