export type SearchMode = "idle" | "name" | "phone";
export type NameMatchScore = 0 | 1 | 2 | 3;

export const MIN_PHONE_SEARCH_DIGITS = 3;

const arabicIndicDigits = "٠١٢٣٤٥٦٧٨٩";
const easternArabicDigits = "۰۱۲۳۴۵۶۷۸۹";

function toAsciiDigit(char: string) {
  const arabicIndex = arabicIndicDigits.indexOf(char);
  if (arabicIndex >= 0) return String(arabicIndex);
  const easternIndex = easternArabicDigits.indexOf(char);
  if (easternIndex >= 0) return String(easternIndex);
  return char;
}

export function normalizeName(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[ىي]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ە")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function normalizePhone(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, toAsciiDigit).replace(/\D/g, "");
}

export function searchMode(value: string): SearchMode {
  const trimmed = value.trim();
  if (!trimmed) return "idle";
  if (/\p{L}/u.test(trimmed)) return "name";
  return normalizePhone(trimmed) ? "phone" : "name";
}

export function nameMatchScore(name: string, query: string): NameMatchScore {
  const searchableName = normalizeName(name);
  const searchableQuery = normalizeName(query);
  if (!searchableName || !searchableQuery) return 0;
  if (searchableName === searchableQuery) return 3;

  const nameTokens = searchableName.split(/\s+/).filter(Boolean);
  const queryTokens = searchableQuery.split(/\s+/).filter(Boolean);
  if (!queryTokens.length) return 0;

  const everyTokenStartsAWord = queryTokens.every((queryToken) =>
    nameTokens.some((nameToken) => nameToken.startsWith(queryToken)),
  );
  if (everyTokenStartsAWord) return 2;

  const everyTokenAppearsInsideAWord = queryTokens.every((queryToken) =>
    queryToken.length >= 2 && nameTokens.some((nameToken) => nameToken.includes(queryToken)),
  );
  return everyTokenAppearsInsideAWord ? 1 : 0;
}
