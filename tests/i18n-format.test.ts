import assert from "node:assert/strict";
import test from "node:test";
import { formatAppointmentDateValue, formatTimeValue, localizeDigits, toAsciiDigits } from "../lib/i18n/format.ts";

test("formats receptionist times as a simple 12-hour clock", () => {
  assert.equal(formatTimeValue("14:00", "en"), "02:00 PM");
  assert.equal(formatTimeValue("18:15", "en"), "06:15 PM");
  assert.equal(formatTimeValue("00:30", "en"), "12:30 AM");
  assert.equal(formatTimeValue("12:00", "en"), "12:00 PM");
});

test("localizes 12-hour clock digits and day periods", () => {
  assert.equal(formatTimeValue("18:00", "ku"), "٠٦:٠٠ د.ن");
  assert.equal(formatTimeValue("09:30", "ku"), "٠٩:٣٠ پ.ن");
  assert.equal(formatTimeValue("18:00", "ar"), "٠٦:٠٠ م");
});

test("round-trips Kurdish and Arabic digits safely", () => {
  assert.equal(localizeDigits("0750 123 4567", "ku"), "٠٧٥٠ ١٢٣ ٤٥٦٧");
  assert.equal(toAsciiDigits("٠٧٥٠ ١٢٣ ٤٥٦٧"), "0750 123 4567");
  assert.equal(toAsciiDigits("۰۷۵۰ ۱۲۳ ۴۵۶۷"), "0750 123 4567");
});


test("formats appointment dates as strict DD/MM/YYYY ASCII digits", () => {
  assert.equal(formatAppointmentDateValue("2026-09-07"), "07/09/2026");
  assert.equal(formatAppointmentDateValue("٢٠٢٦-٠٩-٠٧"), "07/09/2026");
});
