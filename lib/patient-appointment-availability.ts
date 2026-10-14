import { formatLocalDateValue, formatTimeValue } from "./i18n/format.ts";
import type { UiLocale } from "./i18n/ui.ts";

export type PublicAppointmentDay = {
  dateKey: string;
  dateLabel: string;
  slots: Array<{ label: string; slotAt: string }>;
};

/**
 * Display only future times supplied by the public availability RPC.
 * Never infer that a missing day is booked, closed, or unpublished.
 * These results are for display; they do not reserve an appointment.
 */
export function groupPublicAppointmentTimes(
  rows: ReadonlyArray<{ slot_at: string }>,
  locale: UiLocale,
  now = Date.now(),
): PublicAppointmentDay[] {
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const days = new Map<string, PublicAppointmentDay>();
  const seenInstants = new Set<number>();
  for (const row of rows) {
    if (typeof row?.slot_at !== "string") continue;
    const instant = Date.parse(row.slot_at);
    if (!Number.isFinite(instant) || instant <= now || seenInstants.has(instant)) continue;

    const date = new Date(instant);
    const dayParts = Object.fromEntries(dateFormatter.formatToParts(date).map((part) => [part.type, part.value]));
    const timeParts = Object.fromEntries(timeFormatter.formatToParts(date).map((part) => [part.type, part.value]));
    const dateKey = `${dayParts.year}-${dayParts.month}-${dayParts.day}`;
    const time = `${timeParts.hour}:${timeParts.minute}`;

    let day = days.get(dateKey);
    if (!day) {
      day = { dateKey, dateLabel: formatLocalDateValue(dateKey, locale), slots: [] };
      days.set(dateKey, day);
    }
    day.slots.push({ label: formatTimeValue(time, locale), slotAt: row.slot_at });
    seenInstants.add(instant);
  }

  return [...days.values()]
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .map((day) => ({
      ...day,
      slots: day.slots.sort((a, b) => Date.parse(a.slotAt) - Date.parse(b.slotAt)),
    }));
}
