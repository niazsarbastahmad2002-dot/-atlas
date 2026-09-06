import type { AtlasResponseLocale } from "./atlas-ai-response-quality.ts";

export const ATLAS_AI_MULTILINGUAL_MODEL = "@cf/zai-org/glm-4.7-flash";

export function atlasCloudflareModelOrder(locale: AtlasResponseLocale, configuredDefault: string) {
  const preferred = locale === "ku" || locale === "bd" || locale === "ar"
    ? [ATLAS_AI_MULTILINGUAL_MODEL, configuredDefault]
    : [configuredDefault, ATLAS_AI_MULTILINGUAL_MODEL];
  return Array.from(new Set(preferred.filter(Boolean)));
}

function hasArabicScript(text: string) {
  return /[\u0600-\u06ff]/u.test(text);
}

function inventsAtlasUi(text: string) {
  return /\bAtlas UI\b/i.test(text)
    || /[“"']Appointments[”"']/i.test(text)
    || /\bAppointments\s+(?:page|tab|screen|menu)\b/i.test(text);
}

const allowedLatinTerms = new Set([
  "atlas", "ai", "whatsapp", "online", "local", "schedule", "smart", "fill", "no", "show", "am", "pm",
]);

function excessiveLatinProse(text: string) {
  const words = text.toLowerCase().match(/[a-z]{3,}/g) ?? [];
  return words.filter((word) => !allowedLatinTerms.has(word)).length >= 3;
}

export function atlasAnswerNeedsKurdishRefinement(answer: string, locale: AtlasResponseLocale) {
  if (locale !== "ku" && locale !== "bd") return false;
  const clean = answer.trim();
  if (!clean) return false;
  if (!hasArabicScript(clean)) return true;

  if (excessiveLatinProse(clean)) return true;
  if (/\b(?:پزیشک|وادە)\b/u.test(clean)) return true;

  if (locale === "ku") {
    return /(?:ئەڤرۆ|پێدڤی|دکار|دبێ|\bژ\s|\bل\sسەر)/u.test(clean);
  }

  return /(?:ئەمڕۆ|پێویستە|دەتوان|\bلە\s|\bبۆ\s)/u.test(clean);
}

export function isAcceptableAtlasModelAnswer(answer: string, locale: AtlasResponseLocale) {
  const clean = answer.trim();
  if (clean.length < 2 || clean.length > 8000) return false;
  if (/```/.test(clean)) return false;
  if ((locale === "ku" || locale === "bd" || locale === "ar") && !hasArabicScript(clean)) return false;
  if (inventsAtlasUi(clean)) return false;
  return true;
}
