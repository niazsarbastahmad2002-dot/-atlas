import type { UiLocale } from "./ui.ts";

const soraniReplacements: ReadonlyArray<readonly [string, string]> = [
  ["ستافی ڕیسێپشن", "سکرتێر"],
  ["ڕیسێپشن", "سکرتێر"],
  ["پێشخانە", "سکرتێر"],
  ["وادەدانان", "دانانی مەوعید"],
  ["وادە لابراوەکان", "مەوعیدە لابراوەکان"],
  ["وادە کۆنەکان", "مەوعیدە کۆنەکان"],
  ["وادە نوێکان", "مەوعیدە نوێکان"],
  ["وادەکانی", "مەوعیدەکانی"],
  ["وادەکان", "مەوعیدەکان"],
  ["وادەکەت", "مەوعیدەکەت"],
  ["وادەکەی", "مەوعیدەکەی"],
  ["وادەکە", "مەوعیدەکە"],
  ["وادەیەک", "مەوعیدێک"],
  ["وادەی", "مەوعیدی"],
  ["وادە", "مەوعید"],
];

const badiniReplacements: ReadonlyArray<readonly [string, string]> = [
  ["ستافێ ڕیسێپشنێ", "سکرتێر"],
  ["ستافێ ریسپشنێ", "سکرتێر"],
  ["ڕیسێپشنێ", "سکرتێرێ"],
  ["ریسپشنێ", "سکرتێرێ"],
  ["ڕیسێپشن", "سکرتێر"],
  ["ریسپشن", "سکرتێر"],
  ["پێشخانە", "سکرتێر"],
  ["وادەیێن", "مەوعیدێن"],
  ["وادەیان", "مەوعیدان"],
  ["وادەیا", "مەوعیدێ"],
  ["وادەیێ", "مەوعیدێ"],
  ["وادەی", "مەوعیدێ"],
  ["وادە", "مەوعید"],
];

export function applyClinicTerminology(value: string, locale: UiLocale) {
  const replacements = locale === "ku"
    ? soraniReplacements
    : locale === "bd"
      ? badiniReplacements
      : [];

  return replacements.reduce(
    (text, [from, to]) => text.includes(from) ? text.replaceAll(from, to) : text,
    value,
  );
}
