import assert from "node:assert/strict";
import test from "node:test";
import { applyClinicTerminology } from "../lib/i18n/terminology.ts";

test("Sorani uses the common secretary wording across Atlas UI copy", () => {
  assert.equal(applyClinicTerminology("ژمارەی ڕیسێپشن", "ku"), "ژمارەی سکرتێر");
  assert.equal(applyClinicTerminology("ستافی ڕیسێپشن زیاد بکە", "ku"), "سکرتێر زیاد بکە");
  assert.equal(applyClinicTerminology("پێشخانە", "ku"), "سکرتێر");
});

test("Badini uses secretary wording and keeps the common genitive form", () => {
  assert.equal(applyClinicTerminology("ژمارا ڕیسێپشنێ", "bd"), "ژمارا سکرتێرێ");
  assert.equal(applyClinicTerminology("ستافێ ڕیسێپشنێ زێدە بکە", "bd"), "سکرتێر زێدە بکە");
  assert.equal(applyClinicTerminology("کارێ ریسپشنێ", "bd"), "کارێ سکرتێرێ");
});

test("English and Arabic terminology is unchanged", () => {
  assert.equal(applyClinicTerminology("Reception", "en"), "Reception");
  assert.equal(applyClinicTerminology("الاستقبال", "ar"), "الاستقبال");
});
