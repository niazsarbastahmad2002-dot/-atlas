import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/dashboard/settings/public-profile/availability/page.tsx", import.meta.url), "utf8");
const form = readFileSync(new URL("../app/dashboard/settings/public-profile/availability/public-booking-week-form.tsx", import.meta.url), "utf8");

test("weekly public-hour editor labels enabled and inactive days without changing scheduling", () => {
  assert.match(page, /<PublicBookingWeekForm action={saveDoctorPublicBookingHours}/);
  assert.match(page, /public-booking-day-status/);
  assert.match(page, /:has\(input\[type=checkbox\]:not\(:checked\)\)/);
  assert.match(page, /After saving, days switched off are not offered online/);
  assert.match(page, /Their saved hours are kept for later/);
  assert.match(page, /Reception can still schedule outside these hours/);
  assert.doesNotMatch(form, /disabled=|type="hidden"/);
});

test("client validation matches server requirement for all seven saved time ranges", () => {
  assert.match(form, /new FormData\(form\)/);
  assert.match(form, /weekday < 7/);
  assert.match(form, /start && end && start >= end/);
  assert.match(form, /event\.preventDefault\(\)/);
  assert.match(form, /role="alert"/);
  assert.match(form, /onChange=\{\(\) => setInvalidDay\(null\)\}/);
});

test("doctor availability editor keeps local time and multilingual labels clear on phones", () => {
  for (const languageCopy of [
    "Times use Erbil / Baghdad local time.",
    "کاتەکان بە کاتی هەولێر / بەغدا دیاری دەکرێن.",
    "دەم ب دەمژمێرا هەولێر / بەغدا دێتە دیارکرن.",
    "تُعرض الأوقات بالتوقيت المحلي لأربيل / بغداد.",
  ]) assert.ok(page.includes(languageCopy));
  assert.match(page, /dir="ltr"/);
  assert.match(page, /@media\(max-width:680px\)/);
  assert.match(page, /grid-column:1\/-1/);
  assert.match(page, /name="booking_date" min=\{today\}/);
});
