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

test("Sorani uses مەوعید instead of وادە for appointment wording", () => {
  assert.equal(applyClinicTerminology("وادەی نوێ", "ku"), "مەوعیدی نوێ");
  assert.equal(applyClinicTerminology("وادەکانی ئەمڕۆ", "ku"), "مەوعیدەکانی ئەمڕۆ");
  assert.equal(applyClinicTerminology("هێشتا هیچ وادەیەک نییە.", "ku"), "هێشتا هیچ مەوعیدێک نییە.");
  assert.equal(applyClinicTerminology("لە وادە کۆنەکان بگەڕێ", "ku"), "لە مەوعیدە کۆنەکان بگەڕێ");
});

test("Badini uses مەوعید instead of وادە for appointment wording", () => {
  assert.equal(applyClinicTerminology("وادەیا تە", "bd"), "مەوعیدێ تە");
  assert.equal(applyClinicTerminology("وادەیێن نوو", "bd"), "مەوعیدێن نوو");
  assert.equal(applyClinicTerminology("خشتەیا وادەیان", "bd"), "خشتەیا مەوعیدان");
  assert.equal(applyClinicTerminology("بەری وادەیێ", "bd"), "بەری مەوعیدێ");
});

test("English and Arabic terminology is unchanged", () => {
  assert.equal(applyClinicTerminology("Reception", "en"), "Reception");
  assert.equal(applyClinicTerminology("Appointment", "en"), "Appointment");
  assert.equal(applyClinicTerminology("الاستقبال", "ar"), "الاستقبال");
  assert.equal(applyClinicTerminology("المواعيد", "ar"), "المواعيد");
});
