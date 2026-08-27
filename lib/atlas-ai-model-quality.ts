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

export function atlasAnswerNeedsKurdishRefinement(answer: string, locale: AtlasResponseLocale) {
  if (locale !== "ku" && locale !== "bd") return false;
  const clean = answer.trim();
  if (!hasArabicScript(clean)) return true;
  if (inventsAtlasUi(clean) || /\bworkflow guidance\b/i.test(clean)) return true;
  if (/```/.test(clean)) return true;
  return false;
}

export function isAcceptableAtlasModelAnswer(answer: string, locale: AtlasResponseLocale) {
  const clean = answer.trim();
  if (clean.length < 2 || clean.length > 8000) return false;
  if (/```/.test(clean)) return false;
  if ((locale === "ku" || locale === "bd" || locale === "ar") && !hasArabicScript(clean)) return false;
  if (inventsAtlasUi(clean)) return false;
  return true;
}
