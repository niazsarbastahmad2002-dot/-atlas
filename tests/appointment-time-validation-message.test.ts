import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("appointment time field distinguishes missing doctor from invalid time", () => {
  const source = readFileSync(
    new URL("../app/dashboard/appointment-time-field-v2.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /!doctorId \? text\.doctor : exactBooked \? text\.booked : text\.invalid/);
  assert.match(source, /invalid: "Choose a valid future time"/);
  assert.match(source, /invalid: "کاتێکی دروستی داهاتوو هەڵبژێرە"/);
  assert.match(source, /invalid: "اختر وقتاً مستقبلياً صالحاً"/);
});

test("a time that expires during form entry has a clear one-tap recovery, without auto-submitting", () => {
  const source = readFileSync(new URL("../app/dashboard/appointment-time-field-v2.tsx", import.meta.url), "utf8");
  assert.match(source, /const tooSoon = Boolean\(doctorId\) && value < effectiveMin/);
  assert.match(source, /tooSoon \? text\.tooSoon : text\.invalid/);
  assert.match(source, /tooSoon && nextDefault \? <button/);
  assert.match(source, /type="button" onClick=\{\(\) => \{ chooseParts\(nextDefault\); setCustom\(false\); setTouched\(true\); setSavedAdvance\(false\); \}\}/);
  assert.match(source, /name="appointment_at" value=\{usable \? value : ""\}/);
  for (const translation of [
    "That time is now too close",
    "ئەو کاتە ئێستا زۆر نزیکە",
    "ئەڤ دەمە نوکە زۆر نێزیکە",
    "هذا الوقت صار قريب كلش",
  ]) assert.ok(source.includes(translation), translation);
});
