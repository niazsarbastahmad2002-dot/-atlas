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
