import { uiLocaleMeta, type UiLocale } from "@/lib/i18n/ui";

const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

export type DayPeriod = "am" | "pm";

export function toAsciiDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabicIndex = arabicDigits.indexOf(digit);
    if (arabicIndex >= 0) return String(arabicIndex);
    const persianIndex = persianDigits.indexOf(digit);
    return persianIndex >= 0 ? String(persianIndex) : digit;
  });
}

export function localizeDigits(value: string | number, locale: UiLocale) {
  const text = String(value);
  if (locale === "en") return text;
  return text.replace(/\d/g, (digit) => arabicDigits[Number(digit)]);
}

export function formatMinutes(minutes: number, locale: UiLocale) {
  const value = localizeDigits(minutes, locale);
  if (locale === "ku") return `${value} خولەک`;
  if (locale === "ar") return `${value} دقيقة`;
  return `${value} min`;
}

export function formatLeadTime(minutes: number, locale: UiLocale) {
  if (minutes < 60) return formatMinutes(minutes, locale);
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    const value = localizeDigits(days, locale);
    if (locale === "ku") return `${value} ڕۆژ`;
    if (locale === "ar") return `${value} يوم`;
    return `${value} ${days === 1 ? "day" : "days"}`;
  }
  const hours = minutes / 60;
  const value = localizeDigits(hours, locale);
  if (locale === "ku") return `${value} کاتژمێر`;
  if (locale === "ar") return `${value} ساعة`;
  return `${value} ${hours === 1 ? "hour" : "hours"}`;
}

function dateLocale(locale: UiLocale) {
  const base = uiLocaleMeta[locale].dateLocale;
  return locale === "en" ? `${base}-u-ca-gregory-nu-latn` : `${base}-u-ca-gregory-nu-arab`;
}

export function formatLocalDateValue(value: string, locale: UiLocale) {
  const date = new Date(`${value}T12:00:00+03:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(dateLocale(locale), {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatMonthYear(date: Date, locale: UiLocale) {
  return new Intl.DateTimeFormat(dateLocale(locale), {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
  }).format(date);
}

export function formatWeekday(date: Date, locale: UiLocale) {
  return new Intl.DateTimeFormat(dateLocale(locale), {
    timeZone: "UTC",
    weekday: "short",
  }).format(date);
}

export function formatDayPeriod(period: DayPeriod, locale: UiLocale) {
  if (locale === "ku") return period === "am" ? "پ.ن" : "د.ن";
  if (locale === "ar") return period === "am" ? "ص" : "م";
  return period === "am" ? "AM" : "PM";
}

export function formatTimeValue(value: string, locale: UiLocale) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(toAsciiDigits(value));
  if (!match) return localizeDigits(value, locale);

  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  if (hour24 > 23 || minute > 59) return localizeDigits(value, locale);

  const period: DayPeriod = hour24 >= 12 ? "pm" : "am";
  const hour12 = hour24 % 12 || 12;
  const clock = `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return `${localizeDigits(clock, locale)} ${formatDayPeriod(period, locale)}`;
}
