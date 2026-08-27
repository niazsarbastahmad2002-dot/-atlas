export type AtlasAiRecordAppointment = {
  appointment_at: string;
  status: string;
  doctor_id: string | null;
  doctor_name: string | null;
  patient_name: string;
  patient_phone: string;
  contact_relationship: string | null;
  reminder_status: string | null;
  reminder_language: string | null;
  arrival_signal: string | null;
};

export type AtlasAiConversationItem = {
  role: "user" | "assistant";
  content: string;
};

export type AtlasAuthorizedAppointment = {
  patientName: string;
  patientPhone?: string;
  contactRelationship: string | null;
  doctorName: string;
  appointmentAt: string;
  status: string;
  reminderStatus: string | null;
  reminderLanguage: string | null;
  arrivalSignal: string | null;
};

export type AtlasAuthorizedRecordContext = {
  kind: "authorized_appointment_records";
  privacy: string;
  phoneNumbersIncluded: boolean;
  matchedCount: number;
  appointments: AtlasAuthorizedAppointment[];
};

const baghdadDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Baghdad",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const detailWords = [
  "detail", "details", "patient", "patients", "who", "name", "names", "phone", "mobile", "contact", "their number",
  "نەخۆش", "ناو", "ناوی", "ژمارەی", "مۆبایل", "موبایل", "وردەکاری", "زانیاری", "کێ", "کەی",
  "ناڤ", "ژمارا", "موبایلێ", "مريض", "المرضى", "اسم", "أسماء", "رقم الهاتف", "رقم الموبايل", "هاتف", "تلفون", "تفاصيل", "منو", "مين",
];

const phoneWords = [
  "phone", "mobile", "contact", "their number", "phone number",
  "ژمارەی مۆبایل", "ژمارەی تەلەفۆن", "مۆبایل", "موبایل", "ژمارا موبایلێ", "موبایلێ",
  "رقم الهاتف", "رقم الموبايل", "هاتف", "تلفون", "موبايل",
];

const honorifics = new Set(["dr", "doctor", "دکتۆر", "دكتور", "دكتورە", "دكتورة"]);

function normalizeDigits(value: string) {
  const source = "٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹";
  const target = "01234567890123456789";
  return value.replace(/[٠-٩۰-۹]/g, (digit) => target[source.indexOf(digit)] ?? digit);
}

function normalizeText(value: string) {
  return normalizeDigits(value)
    .toLocaleLowerCase("en-US")
    .replace(/[يى]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/[^\p{L}\p{N}+]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 2 && !honorifics.has(token));
}

function entityMentioned(text: string, entity: string | null) {
  if (!entity?.trim()) return false;
  const query = normalizeText(text);
  const entityText = normalizeText(entity);
  if (entityText.length >= 3 && query.includes(entityText)) return true;
  const parts = tokens(entity);
  if (!parts.length) return false;
  const hits = parts.filter((part) => query.includes(part)).length;
  return hits === parts.length || (parts.length >= 2 && hits >= 2);
}

function hasAny(text: string, words: string[]) {
  const normalized = normalizeText(text);
  return words.some((word) => normalized.includes(normalizeText(word)));
}

function explicitDayHints(text: string, now: Date) {
  const normalized = normalizeDigits(text);
  const days = new Set<string>();

  for (const match of normalized.matchAll(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)) {
    const [, year, month, day] = match;
    days.add(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
  }
  for (const match of normalized.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/g)) {
    const [, day, month, year] = match;
    days.add(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
  }

  const q = normalizeText(text);
  const today = baghdadDay.format(now);
  const shift = (amount: number) => {
    const date = new Date(`${today}T12:00:00+03:00`);
    date.setUTCDate(date.getUTCDate() + amount);
    return baghdadDay.format(date);
  };

  if (["today", "ئەمڕۆ", "ئەڤرۆ", "اليوم"].some((word) => q.includes(normalizeText(word)))) days.add(today);
  if (["tomorrow", "سبەی", "سبەینێ", "غدا", "باچر"].some((word) => q.includes(normalizeText(word)))) days.add(shift(1));
  if (["yesterday", "دوێنێ", "دووهی", "امس", "أمس"].some((word) => q.includes(normalizeText(word)))) days.add(shift(-1));

  return days;
}

function phoneDigits(value: string) {
  return normalizeDigits(value).replace(/\D/g, "");
}

function phoneMentioned(text: string, phone: string) {
  const queryDigits = phoneDigits(text);
  const target = phoneDigits(phone);
  if (queryDigits.length < 7 || target.length < 7) return false;
  return queryDigits.includes(target.slice(-7)) || target.includes(queryDigits.slice(-7));
}

function combinedUserText(conversation: AtlasAiConversationItem[]) {
  return conversation
    .filter((message) => message.role === "user")
    .slice(-3)
    .map((message) => message.content)
    .join(" \n ");
}

export function buildAtlasAuthorizedRecordContext(
  rows: AtlasAiRecordAppointment[],
  conversation: AtlasAiConversationItem[],
  options?: { now?: Date; maxAppointments?: number },
): AtlasAuthorizedRecordContext | null {
  const latestQuestion = [...conversation].reverse().find((message) => message.role === "user")?.content.trim() ?? "";
  if (!latestQuestion || !hasAny(latestQuestion, detailWords)) return null;

  const userText = combinedUserText(conversation);
  const dayHints = explicitDayHints(userText, options?.now ?? new Date());
  const mentionedDoctors = new Set(rows.filter((row) => entityMentioned(userText, row.doctor_name)).map((row) => row.doctor_name ?? ""));
  const mentionedPatients = new Set(rows.filter((row) => entityMentioned(userText, row.patient_name)).map((row) => row.patient_name));
  const hasPhoneSelector = rows.some((row) => phoneMentioned(userText, row.patient_phone));

  if (!dayHints.size && !mentionedDoctors.size && !mentionedPatients.size && !hasPhoneSelector) return null;

  const filtered = rows.filter((row) => {
    const rowDay = baghdadDay.format(new Date(row.appointment_at));
    if (dayHints.size && !dayHints.has(rowDay)) return false;
    if (mentionedDoctors.size && !mentionedDoctors.has(row.doctor_name ?? "")) return false;
    if (mentionedPatients.size && !mentionedPatients.has(row.patient_name)) return false;
    if (hasPhoneSelector && !phoneMentioned(userText, row.patient_phone)) return false;
    return true;
  });

  if (!filtered.length) return null;

  const includePhones = hasAny(latestQuestion, phoneWords);
  const maxAppointments = Math.max(1, Math.min(options?.maxAppointments ?? 20, 40));
  const appointments = filtered
    .slice()
    .sort((left, right) => left.appointment_at.localeCompare(right.appointment_at))
    .slice(0, maxAppointments)
    .map<AtlasAuthorizedAppointment>((row) => ({
      patientName: row.patient_name,
      ...(includePhones ? { patientPhone: row.patient_phone } : {}),
      contactRelationship: row.contact_relationship,
      doctorName: row.doctor_name?.trim() || "Unassigned",
      appointmentAt: row.appointment_at,
      status: row.status,
      reminderStatus: row.reminder_status,
      reminderLanguage: row.reminder_language,
      arrivalSignal: row.arrival_signal,
    }));

  return {
    kind: "authorized_appointment_records",
    privacy: "These records were selected server-side from the caller's already-authorized Atlas appointment scope. Only records relevant to the user's question are included. Phone numbers are included only when the latest question asks for phone/contact information.",
    phoneNumbersIncluded: includePhones,
    matchedCount: filtered.length,
    appointments,
  };
}

function baghdadTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Baghdad",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

export function buildAtlasRecordFallbackAnswer(
  context: AtlasAuthorizedRecordContext,
  locale: "en" | "ku" | "bd" | "ar",
) {
  const shown = context.appointments.slice(0, 10);
  if (!shown.length) return null;

  const line = (item: AtlasAuthorizedAppointment) => {
    const phone = item.patientPhone ? ` — ${item.patientPhone}` : "";
    return `${baghdadTime(item.appointmentAt)} — ${item.patientName} — ${item.doctorName} — ${item.status}${phone}`;
  };
  const lines = shown.map((item) => `• ${line(item)}`).join("\n");
  const more = context.matchedCount > shown.length ? context.matchedCount - shown.length : 0;

  if (locale === "ku") return `${context.matchedCount} مەوعیدی پەیوەندیدارم دۆزییەوە:\n${lines}${more ? `\n• ${more} مەوعیدی تر هەیە.` : ""}`;
  if (locale === "bd") return `${context.matchedCount} مەوعیدێن پەیوەندیدار هاتنە دیتن:\n${lines}${more ? `\n• ${more} مەوعیدێن دی هەنە.` : ""}`;
  if (locale === "ar") return `لكيت ${context.matchedCount} مواعيد مرتبطة بسؤالك:\n${lines}${more ? `\n• أكو ${more} مواعيد إضافية.` : ""}`;
  return `I found ${context.matchedCount} matching appointments:\n${lines}${more ? `\n• ${more} more appointments.` : ""}`;
}
