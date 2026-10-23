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

test("reception time picker explains the actual earliest available Baghdad-local slot in all four languages", () => {
  const source = readFileSync(new URL("../app/dashboard/appointment-time-field-v2.tsx", import.meta.url), "utf8");
  assert.match(source, /tooSoon: "Too soon\. Earliest: \{date\}, \{time\} \(Erbil time\)\."/);
  assert.match(source, /tooSoon: "کاتەکە زۆر نزیکە/);
  assert.match(source, /tooSoon: "دەمێ هەلبژارتی زۆر نێزیکە/);
  assert.match(source, /tooSoon: "الوقت قريب جداً/);
  assert.match(source, /const tooSoon = value < effectiveMin/);
  assert.match(source, /formatLocalDateValue\(effectiveMin\.slice\(0, 10\), locale\)/);
  assert.match(source, /formatTimeValue\(effectiveMin\.slice\(11\), locale\)/);
  assert.match(source, /exactBooked \? text\.booked : tooSoon \? earliestNotice : text\.invalid/);
  assert.match(source, /name="appointment_at" value=\{usable \? value : ""\}/);
  assert.match(source, /const fiveMinutesFromNow = addLocalMinutes/);
});
