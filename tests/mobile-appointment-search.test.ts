import assert from "node:assert/strict";
import test from "node:test";
import {
  MIN_PHONE_SEARCH_DIGITS,
  nameMatchScore,
  normalizeName,
  normalizePhone,
  searchMode,
} from "../lib/mobile-appointment-search.ts";

test("single-letter name searches prefer word starts instead of matching the middle of unrelated names", () => {
  assert.equal(nameMatchScore("GS", "s"), 0);
  assert.equal(nameMatchScore("Su", "s"), 2);
  assert.equal(nameMatchScore("Sara Ahmed", "a"), 2);
});

test("longer name searches still allow useful partial matches when there is no better prefix", () => {
  assert.equal(nameMatchScore("Ali Hassan", "ali"), 2);
  assert.equal(nameMatchScore("Ali Hassan", "li"), 1);
  assert.equal(nameMatchScore("Ali Hassan", "Ali Hassan"), 3);
});

test("Kurdish and Arabic name variants normalize consistently", () => {
  assert.equal(normalizeName("ياسین"), normalizeName("یاسین"));
  assert.equal(normalizeName("كريم"), normalizeName("کریم"));
  assert.equal(normalizeName("ژینە"), "ژینە");
});

test("phone search accepts Iraqi keyboard digits but requires a meaningful prefix length in the UI", () => {
  assert.equal(normalizePhone("0750 ١٢٣ ۴۵۶۷"), "07501234567");
  assert.equal(MIN_PHONE_SEARCH_DIGITS, 3);
  assert.equal(searchMode("٢"), "phone");
  assert.equal(searchMode("Sara"), "name");
  assert.equal(searchMode("  "), "idle");
});
