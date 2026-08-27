export type AtlasAiRecordAppointmentV2 = {
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

export type AtlasAiConversationItemV2 = {
  role: "user" | "assistant";
  content: string;
};

export type AtlasRecordLocale = "en" | "ku" | "bd" | "ar";

type RecordIntent = "none" | "details" | "phone";

type SelectedAppointment = {
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

export type AtlasRecordResolution = {
  localOnly: boolean;
  answer: string | null;
  matchedCount: number;
  appointments: SelectedAppointment[];
};

const baghdadDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Baghdad",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const detailWords = [
  "detail", "details", "everything", "all of them", "each one", "show me", "tell me", "list", "who are", "which patients", "patient name", "status", "time", "reminder", "note", "notes",
  "وردەکاری", "هەموو", "هەمووی", "هەر یەک", "ئەوانە", "ئەوەکان", "پێم بڵێ", "بۆم بڵێ", "بڵێ", "پیشان", "ناوی نەخۆش", "ناوەکان", "کێن", "کات", "دۆخ", "بیرخستنەوە", "تێبینی",
  "هەمی", "هەمیان", "هەر ئێک", "وان", "بێژە", "نیشان", "ناڤێ نەخۆشی", "ناڤان", "کێنە", "دەم", "بار", "بیرخستنەوە",
  "التفاصيل", "تفاصيل", "كلهم", "كل واحد", "واحد واحد", "وريني", "كلي", "احچيلي", "منو", "اسم المريض", "الأسماء", "الاسماء", "الوقت", "الحالة", "التذكير", "ملاحظة", "ملاحظات",
];

const appointmentWords = ["appointment", "appointments", "مەوعید", "مەوعیدە", "مەوعیدان", "موعد", "مواعيد"];
const countWords = ["how many", "count", "total", "چەند", "کۆی", "چەند دانە", "كم", "عدد", "المجموع"];
const phoneWords = [
  "phone", "mobile", "phone number", "contact number", "number",
  "ژمارەی مۆبایل", "ژمارەی تەلەفۆن", "مۆبایل", "موبایل", "ژمارا موبایلێ", "موبایلێ",
  "رقم الهاتف", "رقم الموبايل", "رقم تلفون", "تلفون", "موبايل",
];
const patientWords = ["patient", "patient name", "نەخۆش", "ناوی نەخۆش", "نەخۆشەکان", "نەخۆشان", "مريض", "المريض", "المرضى"];
const noteWords = ["note", "notes", "تێبینی", "ملاحظة", "ملاحظات"];
const honorifics = new Set(["dr", "doctor", "دکتۆر", "دكتور", "دكتورة"]);

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

function hasAny(value: string, words: string[]) {
  const normalized = normalizeText(value);
  return words.some((word) => normalized.includes(normalizeText(word)));
}

function tokens(value: string) {
  return normalizeText(value).split(" ").filter((token) => token.length >= 2 && !honorifics.has(token));
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

function explicitDays(text: string, now: Date) {
  const normalizedDigits = normalizeDigits(text);
  const days = new Set<string>();
  for (const match of normalizedDigits.matchAll(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)) {
    const [, year, month, day] = match;
    days.add(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
  }
  for (const match of normalizedDigits.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/g)) {
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

function nearestEntitySet(
  rows: AtlasAiRecordAppointmentV2[],
  conversation: AtlasAiConversationItemV2[],
  field: "doctor_name" | "patient_name",
) {
  for (const message of [...conversation].reverse().slice(0, 8)) {
    const found = new Set(rows.filter((row) => entityMentioned(message.content, row[field])).map((row) => row[field] ?? ""));
    if (found.size) return found;
  }
  return new Set<string>();
}

function nearestDaySet(conversation: AtlasAiConversationItemV2[], now: Date) {
  for (const message of [...conversation].reverse().slice(0, 8)) {
    const days = explicitDays(message.content, now);
    if (days.size) return days;
  }
  return new Set<string>();
}

function digits(value: string) {
  return normalizeDigits(value).replace(/\D/g, "");
}

function phoneMentioned(text: string, phone: string) {
  const query = digits(text);
  const target = digits(phone);
  if (query.length < 7 || target.length < 7) return false;
  return query.includes(target.slice(-7)) || target.includes(query.slice(-7));
}

function nearestPhoneSelector(rows: AtlasAiRecordAppointmentV2[], conversation: AtlasAiConversationItemV2[]) {
  for (const message of [...conversation].reverse().slice(0, 6)) {
    if (rows.some((row) => phoneMentioned(message.content, row.patient_phone))) return message.content;
  }
  return "";
}

function recordIntent(latestQuestion: string, hasSelector: boolean): RecordIntent {
  const wantsPhone = hasAny(latestQuestion, phoneWords);
  if (wantsPhone) return "phone";
  const wantsDetail = hasAny(latestQuestion, detailWords);
  const countOnly = hasAny(latestQuestion, countWords) && !wantsDetail;
  if (countOnly) return "none";
  if (wantsDetail) return "details";
  if (hasSelector && hasAny(latestQuestion, appointmentWords) && hasAny(latestQuestion, ["show", "tell", "give", "list", "بڵێ", "بێژە", "پیشان", "وريني", "احچيلي"])) return "details";
  return "none";
}

function phoneLikeInput(text: string) {
  return /(?:\+?\d[\s().-]*){7,}/.test(normalizeDigits(text));
}

function statusLabel(locale: AtlasRecordLocale, status: string) {
  const labels: Record<string, Record<AtlasRecordLocale, string>> = {
    pending: { en: "pending", ku: "چاوەڕێ", bd: "چاوەڕێ", ar: "قيد الانتظار" },
    confirmed: { en: "confirmed", ku: "پشتڕاستکراو", bd: "پشتڕاستکری", ar: "مؤكد" },
    completed: { en: "completed", ku: "تەواوبوو", bd: "دوماهیک هاتی", ar: "مكتمل" },
    cancelled: { en: "cancelled", ku: "هەڵوەشاوەتەوە", bd: "هەلوەشیا", ar: "ملغي" },
    no_show: { en: "no-show", ku: "نەهاتوو", bd: "نەهات", ar: "عدم حضور" },
  };
  return labels[status]?.[locale] ?? status;
}

function reminderLabel(locale: AtlasRecordLocale, status: string | null) {
  if (!status) return null;
  const labels: Record<string, Record<AtlasRecordLocale, string>> = {
    pending: { en: "pending", ku: "چاوەڕێ", bd: "چاوەڕێ", ar: "قيد الانتظار" },
    sent: { en: "sent", ku: "نێردراوە", bd: "هاتە فرێدان", ar: "انرسل" },
    failed: { en: "failed", ku: "سەرنەکەوتوو", bd: "سەرنەکەفتی", ar: "فشل" },
    skipped: { en: "skipped", ku: "تێپەڕێنراو", bd: "هاتە تێپەڕاندن", ar: "متجاوز" },
  };
  return labels[status]?.[locale] ?? status;
}

function relationshipLabel(locale: AtlasRecordLocale, relationship: string | null) {
  if (!relationship || relationship === "patient") return null;
  const labels: Record<string, Record<AtlasRecordLocale, string>> = {
    parent: { en: "parent", ku: "دایک/باوک", bd: "دایک/باب", ar: "الأب/الأم" },
    spouse: { en: "spouse", ku: "هاوسەر", bd: "هەڤژین", ar: "الزوج/الزوجة" },
    child: { en: "adult child", ku: "منداڵی گەورە", bd: "زارۆکێ مەزن", ar: "الابن/البنت" },
    caregiver: { en: "caregiver", ku: "چاودێر", bd: "چاودێر", ar: "مرافق/مقدم رعاية" },
    other: { en: "other contact", ku: "کەسێکی تر", bd: "کەسەکێ دی", ar: "شخص آخر" },
  };
  return labels[relationship]?.[locale] ?? relationship;
}

function arrivalLabel(locale: AtlasRecordLocale, signal: string | null) {
  if (!signal) return null;
  const labels: Record<string, Record<AtlasRecordLocale, string>> = {
    on_my_way: { en: "on the way", ku: "لە ڕێگایە", bd: "د ڕێکێ دایە", ar: "بالطريق" },
    arrived: { en: "arrived", ku: "گەیشتووە", bd: "گەهشتییە", ar: "وصل" },
  };
  return labels[signal]?.[locale] ?? signal;
}

function stamp(value: string) {
  const date = new Date(value);
  const day = baghdadDay.format(date);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Baghdad", hour: "numeric", minute: "2-digit", hour12: true }).format(date);
  return { day, time };
}

function clarification(locale: AtlasRecordLocale) {
  if (locale === "ku") return "دەتوانم وردەکاری مەوعیدەکان لە Atlas بدۆزمەوە. تکایە دکتۆر، ڕۆژ، یان ناوی نەخۆش دیاری بکە تا تەنها ئەو تۆمارانە ببینم کە ڕێگەت پێیان هەیە.";
  if (locale === "bd") return "دکارم وردەکاریێن مەوعیدان ل Atlas بدۆزمەوە. تکایە دکتۆر، ڕۆژ یان ناڤێ نەخۆشی دیار بکە دا تەنێ ئەو تۆماران ببینم یێن تو مافێ دیتنا وان هەی.";
  if (locale === "ar") return "أكدر أطلع تفاصيل المواعيد من Atlas. حدد الدكتور أو اليوم أو اسم المريض حتى أبحث فقط بالسجلات اللي عندك صلاحية تشوفها.";
  return "I can look up appointment details in Atlas. Give me the doctor, day, or patient name so I can search only the records you are allowed to see.";
}

function buildAnswer(appointments: SelectedAppointment[], matchedCount: number, locale: AtlasRecordLocale, latestQuestion: string) {
  const shown = appointments.slice(0, 12);
  const asksNotes = hasAny(latestQuestion, noteWords);
  const uniqueDays = Array.from(new Set(shown.map((item) => stamp(item.appointmentAt).day)));
  const uniqueDoctors = Array.from(new Set(shown.map((item) => item.doctorName)));
  const heading = locale === "ku"
    ? `بەڵێ — ${matchedCount} مەوعیدی پەیوەندیدار لە Atlas دۆزییەوە${uniqueDoctors.length === 1 ? ` بۆ ${uniqueDoctors[0]}` : ""}${uniqueDays.length === 1 ? ` لە ${uniqueDays[0]}` : ""}:`
    : locale === "bd"
      ? `بەلێ — ${matchedCount} مەوعیدێن پەیوەندیدار ل Atlas هاتنە دیتن${uniqueDoctors.length === 1 ? ` بۆ ${uniqueDoctors[0]}` : ""}${uniqueDays.length === 1 ? ` ل ${uniqueDays[0]}` : ""}:`
      : locale === "ar"
        ? `إي — لكيت ${matchedCount} مواعيد مرتبطة بسؤالك داخل Atlas${uniqueDoctors.length === 1 ? ` للدكتور ${uniqueDoctors[0]}` : ""}${uniqueDays.length === 1 ? ` بتاريخ ${uniqueDays[0]}` : ""}:`
        : `Yes — I found ${matchedCount} matching appointments in Atlas${uniqueDoctors.length === 1 ? ` for ${uniqueDoctors[0]}` : ""}${uniqueDays.length === 1 ? ` on ${uniqueDays[0]}` : ""}:`;

  const lines = shown.map((item) => {
    const { day, time } = stamp(item.appointmentAt);
    const status = statusLabel(locale, item.status);
    const reminder = reminderLabel(locale, item.reminderStatus);
    const relationship = relationshipLabel(locale, item.contactRelationship);
    const arrival = arrivalLabel(locale, item.arrivalSignal);
    const bits = locale === "ar"
      ? [`${uniqueDays.length > 1 ? `${day} — ` : ""}${time}`, item.patientName, `الحالة: ${status}`]
      : locale === "en"
        ? [`${uniqueDays.length > 1 ? `${day} — ` : ""}${time}`, item.patientName, `status: ${status}`]
        : [`${uniqueDays.length > 1 ? `${day} — ` : ""}${time}`, item.patientName, `دۆخ: ${status}`];
    if (reminder) bits.push(locale === "ar" ? `التذكير: ${reminder}` : locale === "en" ? `reminder: ${reminder}` : `بیرخستنەوە: ${reminder}`);
    if (relationship) bits.push(locale === "ar" ? `صاحب الرقم: ${relationship}` : locale === "en" ? `phone belongs to: ${relationship}` : locale === "bd" ? `خودانێ ژمارێ: ${relationship}` : `خاوەنی ژمارە: ${relationship}`);
    if (arrival) bits.push(locale === "ar" ? `الوصول: ${arrival}` : locale === "en" ? `arrival: ${arrival}` : `گەیشتن: ${arrival}`);
    if (item.patientPhone) bits.push(item.patientPhone);
    return `• ${bits.join(" — ")}`;
  });

  const more = matchedCount > shown.length ? matchedCount - shown.length : 0;
  if (more) lines.push(locale === "ku" ? `• ${more} مەوعیدی تریش هەیە.` : locale === "bd" ? `• ${more} مەوعیدێن دی ژی هەنە.` : locale === "ar" ? `• أكو ${more} مواعيد إضافية.` : `• ${more} more appointments.`);
  if (asksNotes) {
    lines.push(locale === "ku"
      ? "تێبینی: Atlas تێبینی پزیشکی/کلینیکیی نەخۆش هەڵناگرێت؛ بۆیە تێبینی پزیشکی لێرە نییە."
      : locale === "bd"
        ? "تێبینی: Atlas تێبینیێن پزیشکی یێن نەخۆشی هەڵناگریت؛ لەورا تێبینییا پزیشکی ل ڤێرێ نینە."
        : locale === "ar"
          ? "ملاحظة: Atlas ما يخزن ملاحظات طبية عن المريض، لذلك ماكو ملاحظة طبية أعرضها هنا."
          : "Note: Atlas does not store patient clinical notes, so there is no clinical note to show here.");
  }
  return [heading, ...lines].join("\n");
}

export function resolveAtlasRecordRequest(
  rows: AtlasAiRecordAppointmentV2[],
  conversation: AtlasAiConversationItemV2[],
  locale: AtlasRecordLocale,
  options?: { now?: Date; maxAppointments?: number },
): AtlasRecordResolution | null {
  const latestQuestion = [...conversation].reverse().find((message) => message.role === "user")?.content.trim() ?? "";
  if (!latestQuestion) return null;
  const now = options?.now ?? new Date();
  const doctors = nearestEntitySet(rows, conversation, "doctor_name");
  const patients = nearestEntitySet(rows, conversation, "patient_name");
  const days = nearestDaySet(conversation, now);
  const phoneSelectorText = nearestPhoneSelector(rows, conversation);
  const hasSelector = Boolean(doctors.size || patients.size || days.size || phoneSelectorText);
  const intent = recordIntent(latestQuestion, hasSelector);
  const knownPatientInLatest = rows.some((row) => entityMentioned(latestQuestion, row.patient_name));
  const patientSpecificLanguage = hasAny(latestQuestion, patientWords) || knownPatientInLatest || phoneLikeInput(latestQuestion);
  const localOnly = intent !== "none" || patientSpecificLanguage;

  if (intent === "none") {
    return localOnly ? { localOnly: true, answer: clarification(locale), matchedCount: 0, appointments: [] } : null;
  }
  if (!hasSelector) return { localOnly: true, answer: clarification(locale), matchedCount: 0, appointments: [] };

  const filtered = rows.filter((row) => {
    const rowDay = baghdadDay.format(new Date(row.appointment_at));
    if (days.size && !days.has(rowDay)) return false;
    if (doctors.size && !doctors.has(row.doctor_name ?? "")) return false;
    if (patients.size && !patients.has(row.patient_name)) return false;
    if (phoneSelectorText && !phoneMentioned(phoneSelectorText, row.patient_phone)) return false;
    return true;
  });

  if (!filtered.length) {
    const answer = locale === "ku"
      ? "هیچ مەوعیدێکی هاوتا لەو بەشەی Atlas کە ڕێگەت پێی هەیە نەدۆزرایەوە. دکتۆر/ڕۆژ/ناوی نەخۆش بپشکنەوە."
      : locale === "bd"
        ? "هیچ مەوعیدەکا هاوتا ل وێ بەشا Atlas یا تو مافێ دیتنێ هەی نەهاتە دیتن. دکتۆر/ڕۆژ/ناڤێ نەخۆشی بپشکنەوە."
        : locale === "ar"
          ? "ما لكيت موعد مطابق ضمن جزء Atlas اللي عندك صلاحية تشوفه. راجع الدكتور/اليوم/اسم المريض."
          : "I couldn't find a matching appointment in the part of Atlas you are allowed to see. Check the doctor/day/patient name.";
    return { localOnly: true, answer, matchedCount: 0, appointments: [] };
  }

  const includePhone = intent === "phone";
  const max = Math.max(1, Math.min(options?.maxAppointments ?? 20, 40));
  const appointments = filtered
    .slice()
    .sort((a, b) => a.appointment_at.localeCompare(b.appointment_at))
    .slice(0, max)
    .map<SelectedAppointment>((row) => ({
      patientName: row.patient_name,
      ...(includePhone ? { patientPhone: row.patient_phone } : {}),
      contactRelationship: row.contact_relationship,
      doctorName: row.doctor_name?.trim() || "Unassigned",
      appointmentAt: row.appointment_at,
      status: row.status,
      reminderStatus: row.reminder_status,
      reminderLanguage: row.reminder_language,
      arrivalSignal: row.arrival_signal,
    }));

  return {
    localOnly: true,
    answer: buildAnswer(appointments, filtered.length, locale, latestQuestion),
    matchedCount: filtered.length,
    appointments,
  };
}
