export const appointmentStatuses = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
] as const;

export type AppointmentStatus = (typeof appointmentStatuses)[number];
export type AppointmentMutationFailure = "invalid" | "too_early" | "past_cancelled" | "slot_taken" | "busy" | "failed";
export type AppointmentCreateFailure = "duplicate" | "slot_taken" | "failed";

const statusTransitions: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled", "completed", "no_show"],
  confirmed: ["pending", "cancelled", "completed", "no_show"],
  cancelled: ["pending"],
  completed: ["confirmed"],
  no_show: ["confirmed"],
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const dateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const unsafeNameCharacters = /[\p{Cc}\p{Cf}]/u;
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

function asciiDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabicIndex = arabicDigits.indexOf(digit);
    if (arabicIndex >= 0) return String(arabicIndex);
    const persianIndex = persianDigits.indexOf(digit);
    return persianIndex >= 0 ? String(persianIndex) : digit;
  });
}

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
  let phone = asciiDigits(value).trim().replace(/[\s().-]/g, "");
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
  const normalizedValue = asciiDigits(value);
  const match = dateTimePattern.exec(normalizedValue);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const date = new Date(`${normalizedValue}:00+03:00`);
  if (Number.isNaN(date.getTime())) return null;

  const parts = baghdadParts(date);
  if (
    parts.year !== year
    || parts.month !== month
    || parts.day !== day
    || parts.hour !== hour
    || parts.minute !== minute
  ) return null;

  // Creation and detail editing are forward-looking schedule operations.
  // Allow only a tiny clock-skew/submission grace period, never yesterday or
  // an already-passed clinic slot.
  const min = new Date(now.getTime() - 60 * 1000);
  const max = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
  if (date < min || date > max) return null;
  return date;
}

export function toBaghdadInputValue(value: Date) {
  const parts = baghdadParts(value);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function isAppointmentStatus(value: string): value is AppointmentStatus {
  return appointmentStatuses.includes(value as AppointmentStatus);
}

export function canTransitionAppointment(from: AppointmentStatus, to: AppointmentStatus) {
  return from === to || statusTransitions[from].includes(to);
}

export function allowedAppointmentTransitions(from: AppointmentStatus) {
  return [...statusTransitions[from]];
}

export function classifyAppointmentCreateError(code: string | undefined, message: string | undefined): AppointmentCreateFailure {
  if (code !== "23505") return "failed";
  const text = (message ?? "").toLowerCase();
  if (text.includes("appointments_active_doctor_slot_idx")) return "slot_taken";
  if (text.includes("appointments_clinic_idempotency_idx")) return "duplicate";
  return "failed";
}

export function classifyAppointmentMutationError(code: string | undefined, message: string | undefined): AppointmentMutationFailure {
  const text = `${code ?? ""} ${message ?? ""}`.toLowerCase();
  if (text.includes("appointment outcome cannot be recorded before")) return "too_early";
  if (text.includes("past cancelled appointment cannot be reopened")) return "past_cancelled";
  if (text.includes("appointment reminder is currently being delivered") || code === "55P03") return "busy";
  if (code === "23505" || text.includes("appointments_one_active_doctor_slot") || text.includes("duplicate key")) return "slot_taken";
  if (code === "23514" || code === "42501" || text.includes("invalid appointment status transition")) return "invalid";
  return "failed";
}
