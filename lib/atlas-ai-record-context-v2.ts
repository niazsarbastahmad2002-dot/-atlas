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
  "detail", "details", "everything", "all details", "full details", "all of them", "each one", "show me", "tell me", "list", "who are", "which patients", "patient name", "doctor name", "status", "time", "reminder", "note", "notes", "schedule",
  "وردەکاری", "وردەکارییەکان", "هەموو وردەکاری", "هەموو زانیاری", "هەموو", "هەمووی", "هەر یەک", "ئەوانە", "ئەوەکان", "پێم بڵێ", "بۆم بڵێ", "بڵێ", "پیشان", "پیشان بدە", "ناوی نەخۆش", "ناوی دکتۆر", "ناوەکان", "کێن", "کات", "دۆخ", "بیرخستنەوە", "تێبینی", "خشتە",
  "هەمی", "هەمیان", "هەر ئێک", "وان", "بێژە", "نیشان", "ناڤێ نەخۆشی", "ناڤێ دکتۆری", "ناڤان", "کێنە", "دەم", "بار", "بیرخستنەوە", "خشتە",
  "التفاصيل", "تفاصيل", "كل التفاصيل", "كل المعلومات", "كلهم", "كل واحد", "واحد واحد", "وريني", "كلي", "احچيلي", "منو", "اسم المريض", "اسم الدكتور", "الأسماء", "الاسماء", "الوقت", "الحالة", "التذكير", "ملاحظة", "ملاحظات", "جدول",
];

const fullDetailWords = [
  "everything", "all details", "full details", "all information", "complete details",
  "هەموو وردەکاری", "هەموو زانیاری", "وردەکاریی تەواو", "هەمووی",
  "هەمی وردەکاری", "هەمی زانیاری",
  "كل التفاصيل", "كل المعلومات", "التفاصيل كاملة",
];

const tableWords = [
  "table", "table format", "in a table", "as a table",
  "خشتە", "خشتەی", "بە خشتە", "لە خشتەدا",
  "جدول", "بجدول", "على شكل جدول",
];

const appointmentWords = ["appointment", "appointments", "schedule", "مەوعید", "مەوعیدە", "مەوعیدەکان", "مەوعیدان", "وادە", "وادەکان", "موعد", "مواعيد"];
const countWords = ["how many", "count", "total", "چەند", "کۆی", "چەند دانە", "كم", "عدد", "المجموع"];
const phoneWords = [
  "phone", "mobile", "phone number", "contact number", "number",
  "ژمارەی مۆبایل", "ژمارەی تەلەفۆن", "مۆبایل", "موبایل", "ژمارا موبایلێ", "موبایلێ",
  "رقم الهاتف", "رقم الموبايل", "رقم تلفون", "تلفون", "موبايل",
];
const patientWords = ["patient", "patient name", "نەخۆش", "ناوی نەخۆش", "نەخۆشەکان", "نەخۆشان", "مريض", "المريض", "المرضى"];
const doctorWords = ["doctor", "doctor name", "دکتۆر", "ناوی دکتۆر", "پزیشک", "ناوی پزیشک", "دكتور", "الدكتور", "اسم الدكتور"];
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
  if (["tomorrow", "سبەی", "سبەینێ", "سبەهێ", "غدا", "باچر"].some((word) => q.includes(normalizeText(word)))) days.add(shift(1));
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
  const wantsTable = hasAny(latestQuestion, tableWords);
  const wantsDetail = hasAny(latestQuestion, detailWords) || hasAny(latestQuestion, fullDetailWords);
  const countOnly = hasAny(latestQuestion, countWords) && !wantsDetail && !wantsTable && !wantsPhone;
  if (countOnly) return "none";
  if (wantsPhone) return "phone";
  if (wantsDetail || wantsTable) return "details";
  if (hasSelector && hasAny(latestQuestion, appointmentWords)) return "details";
  return "none";
}

function phoneLikeInput(text: string) {
  return /(?:\+?\d[\s().-]*){7,}/.test(normalizeDigits(text));
}

function statusLabel(locale: AtlasRecordLocale, status: string) {
  const labels: Record<string, Record<AtlasRecordLocale, string>> = {
    pending: { en: "pending", ku: "چاوەڕێ", bd: "چاوەڕێ", ar: "قيد الانتظار" },
    confirmed: { en: "confirmed", ku: "پشتڕاستکراو", bd: "پشتڕاستکری", ar: "مؤكد" },
    completed: { en: "completed", ku: "تەواوبوو", bd: "تەمام بوو", ar: "مكتمل" },
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
    skipped: { en: "skipped", ku: "تێپەڕێنراوە", bd: "هاتە تێپەڕاندن", ar: "متجاوز" },
  };
  return labels[status]?.[locale] ?? status;
}

function reminderLanguageLabel(locale: AtlasRecordLocale, language: string | null) {
  if (!language) return null;
  const labels: Record<string, Record<AtlasRecordLocale, string>> = {
    en: { en: "English", ku: "ئینگلیزی", bd: "ئینگلیزی", ar: "إنكليزي" },
    ku: { en: "Sorani Kurdish", ku: "کوردی (سۆرانی)", bd: "کوردی (سۆرانی)", ar: "كردي سوراني" },
    bd: { en: "Badini Kurdish", ku: "کوردی (بادینی)", bd: "کوردی (بادینی)", ar: "كردي باديني" },
    ar: { en: "Arabic", ku: "عەرەبی", bd: "عەرەبی", ar: "عربي" },
  };
  return labels[language]?.[locale] ?? language;
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
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return { day, time };
}

function clarification(locale: AtlasRecordLocale) {
  if (locale === "ku") return "دەتوانم وردەکاری مەوعیدەکان پیشان بدەم. تکایە ڕۆژ، دکتۆر، یان ناوی نەخۆش دیاری بکە.";
  if (locale === "bd") return "دکارم وردەکاریێن مەوعیدان نیشان بدەم. تکایە ڕۆژ، دکتۆر یان ناڤێ نەخۆشی دیار بکە.";
  if (locale === "ar") return "أكدر أعرض تفاصيل المواعيد. حدد اليوم أو الدكتور أو اسم المريض.";
  return "I can show appointment details. Give me the day, doctor, or patient name.";
}

function safeCell(value: string | null | undefined) {
  return (value?.trim() || "—").replace(/\|/g, "/").replace(/\s+/g, " ");
}

function tableLabels(locale: AtlasRecordLocale) {
  if (locale === "ku") return { day: "ڕۆژ", time: "کات", patient: "نەخۆش", doctor: "دکتۆر", status: "دۆخ", reminder: "بیرخستنەوە", reminderLanguage: "زمانی بیرخستنەوە", arrival: "گەیشتن", phone: "مۆبایل", relationship: "خاوەنی ژمارە" };
  if (locale === "bd") return { day: "ڕۆژ", time: "دەم", patient: "نەخۆش", doctor: "دکتۆر", status: "بار", reminder: "بیرخستنەوە", reminderLanguage: "زمانێ بیرخستنەوە", arrival: "گەهشتن", phone: "موبایل", relationship: "خودانێ ژمارێ" };
  if (locale === "ar") return { day: "اليوم", time: "الوقت", patient: "المريض", doctor: "الدكتور", status: "الحالة", reminder: "التذكير", reminderLanguage: "لغة التذكير", arrival: "الوصول", phone: "الموبايل", relationship: "صاحب الرقم" };
  return { day: "Date", time: "Time", patient: "Patient", doctor: "Doctor", status: "Status", reminder: "Reminder", reminderLanguage: "Reminder language", arrival: "Arrival", phone: "Phone", relationship: "Phone belongs to" };
}

function answerHeading(locale: AtlasRecordLocale, matchedCount: number, uniqueDoctors: string[], uniqueDays: string[], table: boolean) {
  if (locale === "ku") {
    const scope = `${uniqueDoctors.length === 1 ? ` بۆ ${uniqueDoctors[0]}` : ""}${uniqueDays.length === 1 ? ` لە ${uniqueDays[0]}` : ""}`;
    return `${matchedCount} مەوعید دۆزرایەوە${scope}.${table ? " خشتەکە:" : " وردەکارییەکان:"}`;
  }
  if (locale === "bd") {
    const scope = `${uniqueDoctors.length === 1 ? ` بۆ ${uniqueDoctors[0]}` : ""}${uniqueDays.length === 1 ? ` ل ${uniqueDays[0]}` : ""}`;
    return `${matchedCount} مەوعید هاتنە دیتن${scope}.${table ? " خشتە:" : " وردەکاری:"}`;
  }
  if (locale === "ar") {
    const scope = `${uniqueDoctors.length === 1 ? ` للدكتور ${uniqueDoctors[0]}` : ""}${uniqueDays.length === 1 ? ` بتاريخ ${uniqueDays[0]}` : ""}`;
    return `لكيت ${matchedCount} موعد${matchedCount === 1 ? "" : ""}${scope}.${table ? " الجدول:" : " التفاصيل:"}`;
  }
  const scope = `${uniqueDoctors.length === 1 ? ` for ${uniqueDoctors[0]}` : ""}${uniqueDays.length === 1 ? ` on ${uniqueDays[0]}` : ""}`;
  return `I found ${matchedCount} matching appointment${matchedCount === 1 ? "" : "s"}${scope}.${table ? " Here is the table:" : " Details:"}`;
}

function buildTable(appointments: SelectedAppointment[], locale: AtlasRecordLocale, includePhone: boolean) {
  const labels = tableLabels(locale);
  const uniqueDays = new Set(appointments.map((item) => stamp(item.appointmentAt).day));
  const includeDay = uniqueDays.size > 1;
  const includeReminderLanguage = appointments.some((item) => Boolean(item.reminderLanguage));
  const includeArrival = appointments.some((item) => Boolean(item.arrivalSignal));
  const includeRelationship = appointments.some((item) => Boolean(item.contactRelationship && item.contactRelationship !== "patient"));

  const headers = [
    ...(includeDay ? [labels.day] : []),
    labels.time,
    labels.patient,
    labels.doctor,
    labels.status,
    labels.reminder,
    ...(includeReminderLanguage ? [labels.reminderLanguage] : []),
    ...(includeArrival ? [labels.arrival] : []),
    ...(includePhone ? [labels.phone] : []),
    ...(includeRelationship ? [labels.relationship] : []),
  ];

  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
  ];

  for (const item of appointments) {
    const { day, time } = stamp(item.appointmentAt);
    const cells = [
      ...(includeDay ? [day] : []),
      time,
      safeCell(item.patientName),
      safeCell(item.doctorName),
      safeCell(statusLabel(locale, item.status)),
      safeCell(reminderLabel(locale, item.reminderStatus)),
      ...(includeReminderLanguage ? [safeCell(reminderLanguageLabel(locale, item.reminderLanguage))] : []),
      ...(includeArrival ? [safeCell(arrivalLabel(locale, item.arrivalSignal))] : []),
      ...(includePhone ? [safeCell(item.patientPhone)] : []),
      ...(includeRelationship ? [safeCell(relationshipLabel(locale, item.contactRelationship))] : []),
    ];
    lines.push(`| ${cells.join(" | ")} |`);
  }

  return lines.join("\n");
}

function buildAnswer(appointments: SelectedAppointment[], matchedCount: number, locale: AtlasRecordLocale, latestQuestion: string) {
  const asksNotes = hasAny(latestQuestion, noteWords);
  const wantsTable = hasAny(latestQuestion, tableWords);
  const wantsFull = hasAny(latestQuestion, fullDetailWords);
  const uniqueDays = Array.from(new Set(appointments.map((item) => stamp(item.appointmentAt).day)));
  const uniqueDoctors = Array.from(new Set(appointments.map((item) => item.doctorName));
  const includePhone = appointments.some((item) => Boolean(item.patientPhone));
  const heading = answerHeading(locale, matchedCount, uniqueDoctors, uniqueDays, wantsTable);

  if (wantsTable) {
    const table = buildTable(appointments, locale, includePhone);
    const note = asksNotes
      ? locale === "ku"
        ? "تێبینی: Atlas تێبینی پزیشکیی نەخۆش هەڵناگرێت، بۆیە تێبینی پزیشکی لێرە نییە."
        : locale === "bd"
          ? "تێبینی: Atlas تێبینیێن پزیشکی یێن نەخۆشی هەڵناگریت، لەورا تێبینییا پزیشکی ل ڤێرێ نینە."
          : locale === "ar"
            ? "ملاحظة: Atlas ما يخزن ملاحظات طبية عن المريض، لذلك ماكو ملاحظة طبية أعرضها هنا."
            : "Note: Atlas does not store patient clinical notes, so there is no clinical note to show here."
      : null;
    return [heading, table, note].filter(Boolean).join("\n\n");
  }

  const lines = appointments.map((item) => {
    const { day, time } = stamp(item.appointmentAt);
    const status = statusLabel(locale, item.status);
    const reminder = reminderLabel(locale, item.reminderStatus);
    const reminderLanguage = reminderLanguageLabel(locale, item.reminderLanguage);
    const relationship = relationshipLabel(locale, item.contactRelationship);
    const arrival = arrivalLabel(locale, item.arrivalSignal);
    const dayPrefix = uniqueDays.length > 1 ? `${day} — ` : "";

    if (locale === "ku") {
      const bits = [`${dayPrefix}${time}`, `نەخۆش: ${item.patientName}`, `دکتۆر: ${item.doctorName}`, `دۆخ: ${status}`];
      if (reminder) bits.push(`بیرخستنەوە: ${reminder}`);
      if (reminderLanguage && wantsFull) bits.push(`زمانی بیرخستنەوە: ${reminderLanguage}`);
      if (arrival) bits.push(`گەیشتن: ${arrival}`);
      if (item.patientPhone) bits.push(`مۆبایل: ${item.patientPhone}`);
      if (relationship) bits.push(`خاوەنی ژمارە: ${relationship}`);
      return `• ${bits.join(" — ")}`;
    }
    if (locale === "bd") {
      const bits = [`${dayPrefix}${time}`, `نەخۆش: ${item.patientName}`, `دکتۆر: ${item.doctorName}`, `بار: ${status}`];
      if (reminder) bits.push(`بیرخستنەوە: ${reminder}`);
      if (reminderLanguage && wantsFull) bits.push(`زمانێ بیرخستنەوە: ${reminderLanguage}`);
      if (arrival) bits.push(`گەهشتن: ${arrival}`);
      if (item.patientPhone) bits.push(`موبایل: ${item.patientPhone}`);
      if (relationship) bits.push(`خودانێ ژمارێ: ${relationship}`);
      return `• ${bits.join(" — ")}`;
    }
    if (locale === "ar") {
      const bits = [`${dayPrefix}${time}`, `المريض: ${item.patientName}`, `الدكتور: ${item.doctorName}`, `الحالة: ${status}`];
      if (reminder) bits.push(`التذكير: ${reminder}`);
      if (reminderLanguage && wantsFull) bits.push(`لغة التذكير: ${reminderLanguage}`);
      if (arrival) bits.push(`الوصول: ${arrival}`);
      if (item.patientPhone) bits.push(`الموبايل: ${item.patientPhone}`);
      if (relationship) bits.push(`صاحب الرقم: ${relationship}`);
      return `• ${bits.join(" — ")}`;
    }
    const bits = [`${dayPrefix}${time}`, `patient: ${item.patientName}`, `doctor: ${item.doctorName}`, `status: ${status}`];
    if (reminder) bits.push(`reminder: ${reminder}`);
    if (reminderLanguage && wantsFull) bits.push(`reminder language: ${reminderLanguage}`);
    if (arrival) bits.push(`arrival: ${arrival}`);
    if (item.patientPhone) bits.push(`phone: ${item.patientPhone}`);
    if (relationship) bits.push(`phone belongs to: ${relationship}`);
    return `• ${bits.join(" — ")}`;
  });

  if (asksNotes) {
    lines.push(locale === "ku"
      ? "تێبینی: Atlas تێبینی پزیشکیی نەخۆش هەڵناگرێت، بۆیە تێبینی پزیشکی لێرە نییە."
      : locale === "bd"
        ? "تێبینی: Atlas تێبینیێن پزیشکی یێن نەخۆشی هەڵناگریت، لەورا تێبینییا پزیشکی ل ڤێرێ نینە."
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
  const knownDoctorInLatest = rows.some((row) => entityMentioned(latestQuestion, row.doctor_name));
  const patientSpecificLanguage = hasAny(latestQuestion, patientWords) || knownPatientInLatest || phoneLikeInput(latestQuestion);
  const appointmentSpecificLanguage = hasAny(latestQuestion, appointmentWords) || hasAny(latestQuestion, doctorWords) || knownDoctorInLatest;
  const localOnly = intent !== "none" || patientSpecificLanguage || (hasSelector && appointmentSpecificLanguage);

  if (intent === "none") {
    return localOnly && !hasAny(latestQuestion, countWords)
      ? { localOnly: true, answer: clarification(locale), matchedCount: 0, appointments: [] }
      : null;
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
      ? "هیچ مەوعیدێکی هاوتا نەدۆزرایەوە. ڕۆژ، دکتۆر، یان ناوی نەخۆش بپشکنەوە."
      : locale === "bd"
        ? "هیچ مەوعیدەکا هاوتا نەهاتە دیتن. ڕۆژ، دکتۆر یان ناڤێ نەخۆشی بپشکنەوە."
        : locale === "ar"
          ? "ما لكيت موعد مطابق. راجع اليوم أو الدكتور أو اسم المريض."
          : "I couldn't find a matching appointment. Check the day, doctor, or patient name.";
    return { localOnly: true, answer, matchedCount: 0, appointments: [] };
  }

  const includePhone = intent === "phone" || hasAny(latestQuestion, fullDetailWords);
  const max = Math.max(1, Math.min(options?.maxAppointments ?? 40, 80));
  const appointments = filtered
    .slice()
    .sort((a, b) => a.appointment_at.localeCompare(b.appointment_at))
    .slice(0, max)
    .map<SelectedAppointment>((row) => ({
      patientName: row.patient_name,
      ...(includePhone ? { patientPhone: row.patient_phone } : {}),
      contactRelationship: row.contact_relationship,
      doctorName: row.doctor_name?.trim() || (locale === "ar" ? "غير محدد" : locale === "en" ? "Unassigned" : "دیاری نەکراوە"),
      appointmentAt: row.appointment_at,
      status: row.status,
      reminderStatus: row.reminder_status,
      reminderLanguage: row.reminder_language,
      arrivalSignal: row.arrival_signal,
    }));

  const answer = buildAnswer(appointments, filtered.length, locale, latestQuestion);
  return { localOnly: true, answer, matchedCount: filtered.length, appointments };
}
