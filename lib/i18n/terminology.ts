import type { UiLocale } from "./ui.ts";

const soraniReplacements: ReadonlyArray<readonly [string, string]> = [
  ["ستافی ڕیسێپشن", "سکرتێر"],
  ["ڕیسێپشن", "سکرتێر"],
  ["پێشخانە", "سکرتێر"],
];

const badiniReplacements: ReadonlyArray<readonly [string, string]> = [
  ["ستافێ ڕیسێپشنێ", "سکرتێر"],
  ["ستافێ ریسپشنێ", "سکرتێر"],
  ["ڕیسێپشنێ", "سکرتێرێ"],
  ["ریسپشنێ", "سکرتێرێ"],
  ["ڕیسێپشن", "سکرتێر"],
  ["ریسپشن", "سکرتێر"],
  ["پێشخانە", "سکرتێر"],
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
