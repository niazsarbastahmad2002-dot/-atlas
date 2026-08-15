export const appointmentStatuses = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
] as const;

export type AppointmentStatus = (typeof appointmentStatuses)[number];
export type AppointmentMutationFailure = "invalid" | "too_early" | "past_cancelled" | "slot_taken" | "busy" | "failed";

const statusTransitions: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["pending", "cancelled", "completed", "no_show"],
  cancelled: ["pending"],
  completed: ["confirmed"],
  no_show: ["confirmed"],
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const dateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const unsafeNameCharacters = /[\p{Cc}\p{Cf}]/u;

export function isUuid(value: string) {
  return uuidPattern.test(value);
}

export function cleanDisplayName(value: string) {
  return value.trim().replace(/\p{Z}+/gu, " ");
}

export function isValidDisplayName(value: string) {
  if (unsafeNameCharacters.test(value)) return false;
  const cleaned = cleanDisplayName(value);
  return cleaned.length >= 2 && cleaned.length <= 120;
}

export function normalizeIraqiMobile(value: string) {
  let phone = value.trim().replace(/[\s().-]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (phone.startsWith("0")) phone = `+964${phone.slice(1)}`;
  if (phone.startsWith("964")) phone = `+${phone}`;
  return /^\+9647\d{9}$/.test(phone) ? phone : null;
}

export function formatIraqiMobile(value: string) {
  const normalized = normalizeIraqiMobile(value);
  if (!normalized) return value;
  const local = `0${normalized.slice(4)}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

function baghdadParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function parseBaghdadDateTime(value: string, now = new Date()) {
  const match = dateTimePattern.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const date = new Date(`${value}:00+03:00`);
  if (Number.isNaN(date.getTime())) return null;

  const parts = baghdadParts(date);
  if (
    parts.year !== year
    || parts.month !== month
    || parts.day !== day
    || parts.hour !== hour
    || parts.minute !== minute
  ) return null;

  const earliest = now.getTime() - 5 * 60 * 1000;
  const latest = now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000;
  return date.getTime() >= earliest && date.getTime() <= latest ? date : null;
}

export function toBaghdadInputValue(date: Date) {
  const parts = baghdadParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function isAppointmentStatus(value: string): value is AppointmentStatus {
  return appointmentStatuses.includes(value as AppointmentStatus);
}

export function allowedAppointmentTransitions(status: AppointmentStatus) {
  return statusTransitions[status];
}

export function canTransitionAppointment(from: AppointmentStatus, to: AppointmentStatus) {
  return from === to || statusTransitions[from].includes(to);
}

/**
 * Database triggers/indexes remain the source of truth for appointment invariants.
 * This converts known Postgres failures into receptionist-friendly categories
 * without weakening the underlying constraints.
 */
export function classifyAppointmentMutationError(code: string | undefined, message = ""): AppointmentMutationFailure {
  if (code === "55P03") return "busy";
  if (code === "23505") return "slot_taken";
  if (code === "23514") {
    const text = message.toLowerCase();
    if (text.includes("outcome cannot be recorded before")) return "too_early";
    if (text.includes("past cancelled appointment cannot be reopened")) return "past_cancelled";
    return "invalid";
  }
  if (code === "42501") return "invalid";
  return "failed";
}
