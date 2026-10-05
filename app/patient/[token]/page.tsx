import type { Metadata } from "next";
import { formatIraqiMobile } from "@/lib/appointments";
import { localizeDigits } from "@/lib/i18n/format";
import { hashPatientToken, isPatientToken } from "@/lib/patient-links";
import { verifyPatientAccountContinuityMarker } from "@/lib/patient-account-continuity";
import { baghdadDateKey, patientDayFlowDelay } from "@/lib/patient-day-flow";
import { getPatientEarlierSlotPreference } from "@/lib/smart-fill/patient-preference";
import { createAdminClient } from "@/lib/supabase/admin";
import { reschedulePatientAppointment, updateEarlierSlotPreference, updatePatientAppointment } from "./actions";
import { PatientSubmitButton } from "./patient-submit-button";
import { AtlasPatientNav } from "@/app/care/patient-nav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Appointment — Atlas",
  robots: { index: false, follow: false },
};

type PatientPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ view?: string; lang?: string; error?: string; notice?: string; account?: string }>;
};

type PatientAppointment = {
  clinic_name: string;
  doctor_name: string;
  doctor_specialty: string | null;
  receptionist_phone: string | null;
  appointment_at: string;
  appointment_status: string;
  reminder_language: string;
  token_expires_at: string;
  queue_position: number | null;
  appointments_ahead: number | null;
};

type PatientLocale = "ku" | "bd" | "ar" | "en";

const patientCopy = {
  en: {
    lang: "en",
    dir: "ltr" as const,
    dateLocale: "en-IQ",
    eyebrow: "Your appointment",
    language: "Language",
    doctor: "Doctor",
    specialty: "Specialty",
    contact: "Reception contact",
    location: "Clinic location",
    directions: "Open directions",
    dateTime: "Date & time",
    calendar: "Add to calendar",
    am: "AM",
    pm: "PM",
    order: "Your order today",
    first: "You’re first for this doctor.",
    ahead: "patient ahead of you",
    aheadMany: "patients ahead of you",
    timingTitle: "Clinic timing",
    timingOnTime: "Running on time",
    timingLate: "About {minutes} min late",
    timingEarly: "About {minutes} min early",
    timingHelp: "Updated by reception. This is an estimate, not an exact wait time.",
    confirmTitle: "Confirm your appointment",
    confirmInitial: "Confirm appointment",
    cancelSmall: "Need to cancel?",
    cancelConfirm: "Cancel this appointment?",
    question: "Will you come?",
    responseActions: "Appointment response options",
    confirm: "Yes, I’m coming",
    cancel: "No, cancel it",
    confirmed: "Confirmed. We’ll be expecting you.",
    cancelled: "This appointment is cancelled.",
    completed: "This appointment is complete.",
    noShow: "This appointment has ended.",
    changeMind: "I can’t come",
    earlierTitle: "Want an earlier appointment?",
    earlierHelp: "Join the earlier-slot list. If a suitable cancellation opens, reception can offer it to you.",
    earlierJoin: "Yes, offer me an earlier time",
    earlierJoined: "You’re on the earlier-slot list.",
    earlierLeave: "Leave earlier-slot list",
    rescheduleTitle: "Change your appointment time",
    rescheduleHelp: "Choose another live opening for the same doctor. Atlas checks the slot again before changing your appointment.",
    rescheduleConfirm: "Change your appointment to {slot}?",
    rescheduled: "Your appointment time was changed.",
    slotTaken: "That time was just taken. Choose another open time.",
    rescheduleUnavailable: "That time is no longer available. Choose another open time.",
    updating: "Updating…",
    actionFailed: "Could not save your change. Try again.",
    myAppointments: "My appointments",
    findCare: "Find care",
    privacy: "This page is private to this appointment.",
    unavailableEyebrow: "Private appointment link",
    unavailableTitle: "This link is unavailable.",
    unavailableHelp: "It may be invalid, expired, replaced, or temporarily rate-limited. Contact the clinic for a new link.",
  },
  ku: {
    lang: "ckb",
    dir: "rtl" as const,
    dateLocale: "ckb-IQ",
    eyebrow: "کاتەکەت",
    language: "زمان",
    doctor: "پزیشک",
    specialty: "پسپۆڕی",
    contact: "ژمارەی ڕیسێپشن",
    location: "شوێنی کلینیک",
    directions: "ڕێگاکە بکەرەوە",
    dateTime: "ڕێکەوت و کات",
    calendar: "زیادی بکە بۆ ڕۆژژمێر",
    am: "پێش نیوەڕۆ",
    pm: "دوای نیوەڕۆ",
    order: "ڕیزت بۆ ئەمڕۆ",
    first: "تۆ یەکەم نەخۆشیت بۆ ئەم پزیشکە.",
    ahead: "نەخۆش لە پێشتە",
    aheadMany: "نەخۆش لە پێشتە",
    timingTitle: "دۆخی کاتی کلینیک",
    timingOnTime: "کلینیکەکە بە کاتە.",
    timingLate: "نزیکەی {minutes} خولەک دواخراوە.",
    timingEarly: "نزیکەی {minutes} خولەک زووترە.",
    timingHelp: "ڕیسێپشن نوێی دەکاتەوە. ئەمە خەمڵاندنێکە، نە کاتی چاوەڕوانیی ورد.",
    confirmTitle: "کاتەکەت پشتڕاست بکەرەوە",
    confirmInitial: "پشتڕاستکردنەوەی کات",
    cancelSmall: "دەتەوێت هەڵیوەشێنیتەوە؟",
    cancelConfirm: "دڵنیایت دەتەوێت ئەم مەوعیدە هەڵوەشێنیتەوە؟",
    question: "دێیت؟",
    responseActions: "هەڵبژاردەکانی وەڵامدانەوەی مەوعید",
    confirm: "بەڵێ، دێم",
    cancel: "نەخێر، هەڵیوەشێنەوە",
    confirmed: "پشتڕاست کرا. چاوەڕێت دەکەین.",
    cancelled: "کاتەکەت هەڵوەشێنرایەوە.",
    completed: "کاتەکەت تەواو بوو.",
    noShow: "کاتەکەت تێپەڕی.",
    changeMind: "ناتوانم بێم",
    earlierTitle: "مەوعیدی زووتر دەوێت؟",
    earlierHelp: "لە لیستی مەوعیدی زووتر دابنێ. ئەگەر مەوعیدێکی گونجاو بەتاڵ بوو، ڕیسێپشن دەتوانێت پێشنیارت پێ بکات.",
    earlierJoin: "بەڵێ، مەوعیدی زووترم پێشنیار بکە",
    earlierJoined: "تۆ لە لیستی مەوعیدی زووتریت.",
    earlierLeave: "لە لیستی زووتر دەرچم",
    rescheduleTitle: "کاتی مەوعیدەکەت بگۆڕە",
    rescheduleHelp: "کاتێکی بەردەستی تری هەمان پزیشک هەڵبژێرە. Atlas پێش گۆڕینەکە کاتەکە دووبارە دەپشکنێت.",
    rescheduleConfirm: "مەوعیدەکەت بگۆڕدرێت بۆ {slot}؟",
    rescheduled: "کاتی مەوعیدەکەت گۆڕدرا.",
    slotTaken: "ئەم کاتە تازە گیرا. کاتێکی بەردەستی تر هەڵبژێرە.",
    rescheduleUnavailable: "ئەم کاتە چیتر بەردەست نییە. کاتێکی تر هەڵبژێرە.",
    updating: "نوێ دەکرێتەوە…",
    actionFailed: "گۆڕانکارییەکە پاشەکەوت نەکرا. دووبارە هەوڵ بدە.",
    myAppointments: "مەوعیدەکانم",
    findCare: "چارەسەر بدۆزەرەوە",
    privacy: "ئەم پەڕەیە تەنها بۆ ئەم کاتەیە.",
    unavailableEyebrow: "بەستەری تایبەتی مەوعید",
    unavailableTitle: "ئەم بەستەرە بەردەست نییە.",
    unavailableHelp: "لەوانەیە بەستەرەکە نادروست، بەسەرچوو یان گۆڕدرابێت، یان کاتێک سنووردار کرابێت. بۆ بەستەرێکی نوێ پەیوەندی بە کلینیکەوە بکە.",
  },
  bd: {
    lang: "ku",
    dir: "rtl" as const,
    dateLocale: "ckb-IQ",
    eyebrow: "وادەیا تە",
    language: "زمان",
    doctor: "دکتۆر",
    specialty: "تایبەتمەندی",
    contact: "ژمارا ڕیسێپشنێ",
    location: "جهێ کلینیکێ",
    directions: "ڕێکێ بکەڤە",
    dateTime: "ڕێکەفت و کات",
    calendar: "زێدە بکە بۆ ڕۆژژمێر",
    am: "بەری نیڤرۆ",
    pm: "پشتی نیڤرۆ",
    order: "ڕێزا تە یا ئەڤرۆ",
    first: "تو یێ ئێکێ ی بۆ ڤی دکتۆری.",
    ahead: "نەخۆش بەری تەیە",
    aheadMany: "نەخۆش بەری تە نە",
    timingTitle: "دەمێ کلینیکێ",
    timingOnTime: "کلینیک ل سەر دەمی خۆیە.",
    timingLate: "نێزیکی {minutes} خولەک پاشکەفتییە.",
    timingEarly: "نێزیکی {minutes} خولەک زووترە.",
    timingHelp: "ڕیسێپشن نوێ دکەتەوە. ئەڤە هەلسەنگاندنە، نە دەمێ چاوەڕوانییێ یێ ورد.",
    confirmTitle: "وادەیا خۆ پشتڕاست بکە",
    confirmInitial: "وادەیێ پشتڕاست بکە",
    cancelSmall: "دخوازیت هەلوەشێنیت؟",
    cancelConfirm: "تو پشتڕاستی کو دخوازیت ئەڤ وادەیێ هەلوەشێنی؟",
    question: "تو دێی؟",
    responseActions: "هەلبژاردەیێن بەرسڤدانا وادەیێ",
    confirm: "بەلێ، دێم",
    cancel: "نەخێر، هەلوەشێنە",
    confirmed: "پشتڕاست بوو. چاڤەڕێیا تە دکەین.",
    cancelled: "وادەیا تە هاتە هەلوەشاندن.",
    completed: "وادەیا تە تەمام بوو.",
    noShow: "دەمێ وادەیا تە دەرباز بوو.",
    changeMind: "نەشێم بهێم",
    earlierTitle: "مەوعیدەکا زووتر دخوازیت؟",
    earlierHelp: "خۆ بخە لیستا مەوعیدێن زووتر. ئەگەر مەوعیدەکا گونجای هاتە هەلوەشاندن، ڕیسێپشن دشێت پێشنیارا وێ بۆ تە بکەت.",
    earlierJoin: "بەلێ، مەوعیدەکا زووتر بۆ من پێشنیار بکە",
    earlierJoined: "تو د لیستا مەوعیدێن زووتر دای.",
    earlierLeave: "ژ لیستا زووتر دەربکەڤم",
    rescheduleTitle: "دەمێ وادەیا خۆ بگوهۆڕە",
    rescheduleHelp: "دەمەکێ دی یێ بەردەست بۆ هەمان دکتۆری هەلبژێرە. Atlas بەری گوهۆڕینێ دەم جارەکا دی دپشکنیت.",
    rescheduleConfirm: "وادەیا تە بگوهۆڕدرێت بۆ {slot}؟",
    rescheduled: "دەمێ وادەیا تە هاتە گوهۆڕین.",
    slotTaken: "ئەڤ دەمە نوو هاتە گرتن. دەمەکێ دی یێ بەردەست هەلبژێرە.",
    rescheduleUnavailable: "ئەڤ دەمە ئێدی بەردەست نینە. دەمەکێ دی هەلبژێرە.",
    updating: "دهێتە نوێکرن…",
    actionFailed: "گۆڕین نەهاتە پاراستن. دووبارە هەول بدە.",
    myAppointments: "وادەیێن من",
    findCare: "دکتۆر بدیتەوە",
    privacy: "ئەڤ پەرە تەنێ بۆ ڤێ وادەیێیە.",
    unavailableEyebrow: "لینکێ تایبەت یێ وادەیێ",
    unavailableTitle: "ئەڤ لینکە بەردەست نینە.",
    unavailableHelp: "دبیت لینک نەدروست بیت، دەمێ وێ دەرباز بووبیت یان هاتبیتە گوهۆڕین، یان بۆ ماوەیەک سنووردار بووبیت. بۆ لینکەکا نوو پەیوەندی ب کلینیکێ بکە.",
  },
  ar: {
    lang: "ar-IQ",
    dir: "rtl" as const,
    dateLocale: "ar-IQ",
    eyebrow: "موعدك",
    language: "اللغة",
    doctor: "الدكتور",
    specialty: "الاختصاص",
    contact: "رقم السكرتير",
    location: "موقع العيادة",
    directions: "فتح الاتجاهات",
    dateTime: "التاريخ والوقت",
    calendar: "أضف إلى التقويم",
    am: "صباحاً",
    pm: "مساءً",
    order: "ترتيبك اليوم",
    first: "إنت أول واحد عند هذا الدكتور.",
    ahead: "مريض قبلك",
    aheadMany: "مرضى قبلك",
    timingTitle: "وقت العيادة",
    timingOnTime: "العيادة ماشية بالوقت.",
    timingLate: "العيادة متأخرة تقريباً {minutes} دقيقة.",
    timingEarly: "العيادة متقدمة تقريباً {minutes} دقيقة.",
    timingHelp: "الاستقبال يحدّثها. هذا تقدير، مو وقت انتظار دقيق.",
    confirmTitle: "أكد موعدك",
    confirmInitial: "أكد الموعد",
    cancelSmall: "تريد تلغي الموعد؟",
    cancelConfirm: "متأكد تريد تلغي هذا الموعد؟",
    question: "راح تجي؟",
    responseActions: "خيارات الرد على الموعد",
    confirm: "إي، راح أجي",
    cancel: "لا، ألغي الموعد",
    confirmed: "تم التأكيد. ننتظرك.",
    cancelled: "هذا الموعد ملغي.",
    completed: "هذا الموعد خلص.",
    noShow: "وقت هذا الموعد انتهى.",
    changeMind: "ما أگدر أجي",
    earlierTitle: "تريد موعد أبكر؟",
    earlierHelp: "انضم لقائمة المواعيد الأبكر. إذا انلغى موعد مناسب، السكرتير يگدر يعرضه عليك.",
    earlierJoin: "إي، عرضوا عليّ موعد أبكر",
    earlierJoined: "إنت بقائمة المواعيد الأبكر.",
    earlierLeave: "شيلوني من قائمة الأبكر",
    rescheduleTitle: "غيّر وقت موعدك",
    rescheduleHelp: "اختر وقتاً حقيقياً متاحاً عند نفس الطبيب. Atlas يفحص الوقت مرة ثانية قبل تغيير موعدك.",
    rescheduleConfirm: "تغيير موعدك إلى {slot}؟",
    rescheduled: "تم تغيير وقت موعدك.",
    slotTaken: "هذا الوقت انحجز للتو. اختر وقتاً متاحاً آخر.",
    rescheduleUnavailable: "هذا الوقت لم يعد متاحاً. اختر وقتاً آخر.",
    updating: "جارٍ التحديث…",
    actionFailed: "ما انحفظ التغيير. حاول مرة ثانية.",
    myAppointments: "مواعيدي",
    findCare: "ابحث عن رعاية",
    privacy: "هاي الصفحة خاصة بهذا الموعد بس.",
    unavailableEyebrow: "رابط موعد خاص",
    unavailableTitle: "هذا الرابط غير متاح.",
    unavailableHelp: "ممكن الرابط غير صالح، منتهي، متبدل، أو محدود مؤقتاً. تواصل ويا العيادة حتى تحصل على رابط جديد.",
  },
} as const;

function isPatientLocale(value: string | undefined): value is PatientLocale {
  return value === "ku" || value === "bd" || value === "ar" || value === "en";
}

function patientLocale(value: string): PatientLocale {
  return isPatientLocale(value) ? value : "en";
}

const patientLanguageOptions = [
  { locale: "ku", label: "سۆرانی", lang: "ckb", dir: "rtl" as const },
  { locale: "bd", label: "بادینی", lang: "ku", dir: "rtl" as const },
  { locale: "ar", label: "العربية", lang: "ar", dir: "rtl" as const },
  { locale: "en", label: "English", lang: "en", dir: "ltr" as const },
] satisfies ReadonlyArray<{ locale: PatientLocale; label: string; lang: string; dir: "ltr" | "rtl" }>;

function patientLanguageHref(
  token: string,
  locale: PatientLocale,
  reminderView: boolean,
  accountMarker: string,
) {
  const params = new URLSearchParams({ lang: locale });
  if (reminderView) params.set("view", "reminder");
  if (accountMarker) params.set("account", accountMarker);
  return `/patient/${token}?${params.toString()}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function baghdadClock(date: Date, locale: PatientLocale) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour24 = Number(values.hour ?? 0);
  const minute = Number(values.minute ?? 0);
  const hour12 = hour24 % 12 || 12;
  return {
    clock: `${localizeDigits(hour12, locale)}:${localizeDigits(pad(minute), locale)}`,
    period: hour24 >= 12 ? patientCopy[locale].pm : patientCopy[locale].am,
  };
}

function patientTimingText(delayMinutes: number, locale: PatientLocale) {
  const text = patientCopy[locale];
  if (delayMinutes === 0) return text.timingOnTime;
  const minutes = localizeDigits(Math.abs(delayMinutes), locale);
  return (delayMinutes > 0 ? text.timingLate : text.timingEarly).replace("{minutes}", minutes);
}

function rescheduleSlotLabel(value: string, locale: PatientLocale) {
  const date = new Date(value);
  const text = patientCopy[locale];
  const dateLabel = new Intl.DateTimeFormat(text.dateLocale, {
    timeZone: "Asia/Baghdad",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
  const time = baghdadClock(date, locale);
  return `${dateLabel} · ${time.clock} ${time.period}`;
}

export default async function PatientAppointmentPage({ params, searchParams }: PatientPageProps) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const fallbackLocale = patientLocale(query.lang ?? "en");
  if (!isPatientToken(token)) return <Unavailable locale={fallbackLocale} />;

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return <Unavailable locale={fallbackLocale} />;
  }

  const tokenHash = hashPatientToken(token);
  const bucketHash = hashPatientToken(`patient-view:${token}`);
  const { data: allowed, error: limitError } = await admin.rpc(
    "consume_patient_link_rate_limit",
    { p_bucket_hash: bucketHash },
  );
  if (limitError || allowed !== true) return <Unavailable locale={fallbackLocale} />;

  const [
    { data, error },
    { data: locationData, error: locationError },
  ] = await Promise.all([
    admin.rpc("get_patient_appointment", {
      p_token_hash: tokenHash,
    }),
    admin.rpc("patient_get_clinic_location", {
      p_token_hash: tokenHash,
    }),
  ]);
  const appointment = Array.isArray(data) ? data[0] as PatientAppointment | undefined : undefined;
  if (error || !appointment) return <Unavailable locale={fallbackLocale} />;
  const clinicLocation = !locationError && Array.isArray(locationData) ? locationData[0] : undefined;

  const locale = isPatientLocale(query.lang)
    ? query.lang
    : patientLocale(appointment.reminder_language);
  const text = patientCopy[locale];
  const appointmentDate = new Date(appointment.appointment_at);
  const dateText = new Intl.DateTimeFormat(text.dateLocale, {
    timeZone: "Asia/Baghdad",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(appointmentDate);
  const time = baghdadClock(appointmentDate, locale);
  const status = appointment.appointment_status;
  const isPending = status === "pending";
  const isConfirmed = status === "confirmed";
  const isActive = isPending || isConfirmed;
  const reminderView = query.view === "reminder";
  const accountMarker = verifyPatientAccountContinuityMarker(token, query.account)
    ? query.account ?? ""
    : "";
  const accountOwned = Boolean(accountMarker);
  const patientNavLabel = accountOwned ? text.myAppointments : text.findCare;
  const patientNavHref = accountOwned
    ? `/patient-account?lang=${locale}`
    : `/api/ui-language?locale=${locale}`;
  const actionFailed = query.error === "update_failed";
  const rescheduled = query.notice === "rescheduled";
  const rescheduleError = query.error === "slot_taken"
    ? text.slotTaken
    : query.error === "reschedule_unavailable"
      ? text.rescheduleUnavailable
      : null;
  const ahead = appointment.appointments_ahead ?? 0;
  const queuePosition = appointment.queue_position ? localizeDigits(appointment.queue_position, locale) : null;
  const aheadCount = localizeDigits(ahead, locale);
  const receptionPhone = appointment.receptionist_phone ? formatIraqiMobile(appointment.receptionist_phone) : null;
  const clinicLocationText = clinicLocation?.address_text
    ? [clinicLocation.address_text, clinicLocation.area, clinicLocation.city].filter(Boolean).join(" · ")
    : "";
  const clinicDirectionsUrl = clinicLocationText
    ? `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: clinicLocationText }).toString()}`
    : null;
  let wantsEarlierSlot = false;
  let clinicDelayMinutes: number | null = null;
  let rescheduleSlots: Array<{ slot_at: string; appointment_interval_minutes: number }> = [];
  if (isActive) {
    const isAppointmentToday = baghdadDateKey(appointmentDate) === baghdadDateKey(new Date());
    const earlierSlotPromise = getPatientEarlierSlotPreference(admin, tokenHash);
    const reschedulePromise = admin.rpc("patient_list_reschedule_slots", {
      p_token_hash: tokenHash,
      p_days: 7,
    });
    const timingPromise = isAppointmentToday
      ? admin.rpc("patient_get_day_flow", { p_token_hash: tokenHash })
      : null;

    const [{ enabled }, rescheduleResult] = await Promise.all([
      earlierSlotPromise,
      reschedulePromise,
    ]);
    wantsEarlierSlot = enabled;
    if (!rescheduleResult.error && Array.isArray(rescheduleResult.data)) {
      rescheduleSlots = rescheduleResult.data.slice(0, 8);
    }

    if (timingPromise) {
      const { data: timingData, error: timingError } = await timingPromise;
      const timing = Array.isArray(timingData) ? timingData[0] : undefined;
      if (!timingError && timing) clinicDelayMinutes = patientDayFlowDelay(timing.delay_minutes);
    }
  }
  const statusMessage = isConfirmed
    ? text.confirmed
    : status === "cancelled"
      ? text.cancelled
      : status === "completed"
        ? text.completed
        : status === "no_show"
          ? text.noShow
          : null;

  return (
    <main className="patient-page">
      <AtlasPatientNav
        locale={locale}
        actionLabel={patientNavLabel}
        actionHref={patientNavHref}
      />
      <div className="center-page patient-page-center">
      <section className="auth-card patient-card" lang={text.lang} dir={text.dir}>
        <nav className="patient-language-switcher" aria-label={text.language}>
          {patientLanguageOptions.map((option) => (
            <a
              key={option.locale}
              href={patientLanguageHref(token, option.locale, reminderView, accountMarker)}
              lang={option.lang}
              dir={option.dir}
              aria-current={locale === option.locale ? "page" : undefined}
            >
              {option.label}
            </a>
          ))}
        </nav>
        <div className="eyebrow patient-eyebrow">{text.eyebrow}</div>
        <h1 className="patient-clinic-name">{appointment.clinic_name}</h1>

        <div className="patient-time-card">
          <span className="patient-time-label">{text.dateTime}</span>
          <strong className="patient-date-value">{dateText}</strong>
          <div className="patient-time-value">
            <bdi dir="ltr">{time.clock}</bdi>
            <span>{time.period}</span>
          </div>
          {isActive ? (
            <a className="button button-ghost patient-calendar-link" href={`/patient/${token}/calendar.ics`}>
              {text.calendar}
            </a>
          ) : null}
        </div>

        <section className="patient-doctor-card" aria-label={text.doctor}>
          <div className="patient-detail-block">
            <span>{text.doctor}</span>
            <strong>{appointment.doctor_name}</strong>
          </div>
          {appointment.doctor_specialty ? (
            <div className="patient-detail-block">
              <span>{text.specialty}</span>
              <strong className="patient-detail-secondary">{appointment.doctor_specialty}</strong>
            </div>
          ) : null}
          {receptionPhone ? (
            <div className="patient-detail-block patient-contact-block">
              <span>{text.contact}</span>
              <a href={`tel:${appointment.receptionist_phone}`} dir="ltr">{receptionPhone}</a>
            </div>
          ) : null}
          {clinicDirectionsUrl ? (
            <div className="patient-detail-block patient-location-block">
              <span>{text.location}</span>
              <strong className="patient-detail-secondary">{clinicLocationText}</strong>
              <a
                className="button button-ghost patient-directions-link"
                href={clinicDirectionsUrl}
                target="_blank"
                rel="noreferrer"
              >
                {text.directions}
              </a>
            </div>
          ) : null}
        </section>

        {actionFailed ? <p className="notice notice-error patient-action-error" role="alert">{text.actionFailed}</p> : null}
        {rescheduled ? <p className="notice notice-success patient-action-error" role="status">{text.rescheduled}</p> : null}
        {rescheduleError ? <p className="notice notice-error patient-action-error" role="alert">{rescheduleError}</p> : null}

        {isActive && clinicDelayMinutes !== null ? (
          <section className="patient-timing-card" aria-label={text.timingTitle} role="status" aria-live="polite" aria-atomic="true">
            <span>{text.timingTitle}</span>
            <strong>{patientTimingText(clinicDelayMinutes, locale)}</strong>
            <p>{text.timingHelp}</p>
          </section>
        ) : null}

        {isActive && queuePosition ? (
          <div className="patient-order-card" aria-label={`${text.order} ${queuePosition}`}>
            <div><span>{text.order}</span><strong>#{queuePosition}</strong></div>
            <p>{ahead === 0 ? text.first : `${aheadCount} ${ahead === 1 ? text.ahead : text.aheadMany}.`}</p>
          </div>
        ) : null}

        {isActive && rescheduleSlots.length ? (
          <section className="patient-reschedule-card" aria-label={text.rescheduleTitle}>
            <strong>{text.rescheduleTitle}</strong>
            <p>{text.rescheduleHelp}</p>
            <div className="patient-reschedule-slots">
              {rescheduleSlots.map((slot) => (
                <form key={slot.slot_at}>
                  <input type="hidden" name="return_view" value={reminderView ? "reminder" : ""} />
                  <input type="hidden" name="return_lang" value={locale} />
              <input type="hidden" name="return_account" value={accountMarker} />
                  <PatientSubmitButton
                    formAction={reschedulePatientAppointment.bind(null, token, slot.slot_at)}
                    pendingLabel={text.updating}
                    className="button button-ghost patient-reschedule-slot"
                    confirmMessage={text.rescheduleConfirm.replace("{slot}", rescheduleSlotLabel(slot.slot_at, locale))}
                  >
                    {rescheduleSlotLabel(slot.slot_at, locale)}
                  </PatientSubmitButton>
                </form>
              ))}
            </div>
          </section>
        ) : null}

        {isActive ? (
          <section className={`patient-earlier-card ${wantsEarlierSlot ? "is-active" : ""}`}>
            <strong>{text.earlierTitle}</strong>
            <p>{wantsEarlierSlot ? text.earlierJoined : text.earlierHelp}</p>
            <form>
              <input type="hidden" name="return_view" value={reminderView ? "reminder" : ""} />
              <input type="hidden" name="return_lang" value={locale} />
              <input type="hidden" name="return_account" value={accountMarker} />
              <PatientSubmitButton
                formAction={updateEarlierSlotPreference.bind(null, token, !wantsEarlierSlot)}
                pendingLabel={text.updating}
                className={wantsEarlierSlot ? "patient-earlier-leave" : "button button-ghost patient-earlier-join"}
              >
                {wantsEarlierSlot ? text.earlierLeave : text.earlierJoin}
              </PatientSubmitButton>
            </form>
          </section>
        ) : null}

        {isPending && !reminderView ? (
          <div className="patient-initial-response">
            <h2>{text.confirmTitle}</h2>
            <form>
              <input type="hidden" name="return_view" value={reminderView ? "reminder" : ""} />
              <input type="hidden" name="return_lang" value={locale} />
              <input type="hidden" name="return_account" value={accountMarker} />
              <PatientSubmitButton
                formAction={updatePatientAppointment.bind(null, token, "confirmed")}
                pendingLabel={text.updating}
                className="button patient-confirm-primary"
              >
                {text.confirmInitial}
              </PatientSubmitButton>
              <PatientSubmitButton
                formAction={updatePatientAppointment.bind(null, token, "cancelled")}
                pendingLabel={text.updating}
                confirmMessage={text.cancelConfirm}
                className="patient-cancel-small"
              >
                {text.cancelSmall}
              </PatientSubmitButton>
            </form>
          </div>
        ) : null}

        {isPending && reminderView ? (
          <div className="patient-response-block">
            <h2>{text.question}</h2>
            <form className="patient-actions" role="group" aria-label={text.responseActions}>
              <input type="hidden" name="return_view" value="reminder" />
              <input type="hidden" name="return_lang" value={locale} />
              <input type="hidden" name="return_account" value={accountMarker} />
              <PatientSubmitButton
                formAction={updatePatientAppointment.bind(null, token, "confirmed")}
                pendingLabel={text.updating}
                className="button"
              >
                {text.confirm}
              </PatientSubmitButton>
              <PatientSubmitButton
                formAction={updatePatientAppointment.bind(null, token, "cancelled")}
                pendingLabel={text.updating}
                confirmMessage={text.cancelConfirm}
                className="button button-ghost"
              >
                {text.cancel}
              </PatientSubmitButton>
            </form>
          </div>
        ) : null}

        {statusMessage ? (
          <div className={`patient-status-message ${isConfirmed ? "is-confirmed" : ""}`} role="status">
            <strong>{statusMessage}</strong>
            {isConfirmed ? (
              <form>
                <input type="hidden" name="return_view" value={reminderView ? "reminder" : ""} />
              <input type="hidden" name="return_lang" value={locale} />
              <input type="hidden" name="return_account" value={accountMarker} />
                <PatientSubmitButton
                  formAction={updatePatientAppointment.bind(null, token, "cancelled")}
                  pendingLabel={text.updating}
                  confirmMessage={text.cancelConfirm}
                  className="patient-change-mind"
                >
                  {text.changeMind}
                </PatientSubmitButton>
              </form>
            ) : null}
          </div>
        ) : null}

        <p className="quiet patient-privacy">{text.privacy}</p>

        <style>{`
          .patient-page { min-height: 100dvh; }
          .patient-page-center { min-height: calc(100dvh - 72px); padding-top: 20px; padding-bottom: 40px; }
          .patient-card { width: min(100%, 610px); padding: clamp(24px,5vw,38px); }
          .patient-language-switcher { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 6px; margin-top: 20px; }
          .patient-language-switcher a { min-width: 0; border: 1px solid var(--line); border-radius: 999px; padding: 8px 7px; background: #fff; color: var(--muted); font-size: 11px; font-weight: 780; text-align: center; text-decoration: none; }
          .patient-language-switcher a[aria-current="page"] { border-color: #b9dfd1; background: #effaf6; color: var(--accent); }
          .patient-eyebrow { margin-top: 20px; }
          .patient-clinic-name { margin: 8px 0 24px; font-size: clamp(30px,7vw,42px); line-height: 1.08; }
          .patient-time-card { margin: 0 0 22px; border: 1px solid #cfe7dd; border-radius: 20px; padding: clamp(20px,4vw,28px); background: linear-gradient(145deg,#f5fcf9,#edf8f3); }
          .patient-time-label { display: block; margin-bottom: 13px; color: var(--muted); font-size: 11px; font-weight: 820; letter-spacing: .08em; text-transform: uppercase; }
          .patient-date-value { display: block; max-width: 100%; color: var(--ink); font-size: clamp(21px,5vw,29px); line-height: 1.5; text-wrap: balance; }
          .patient-time-value { display: flex; align-items: baseline; gap: 11px; flex-wrap: wrap; margin-top: 18px; color: var(--accent); }
          .patient-time-value bdi { direction: ltr; font-size: clamp(34px,8vw,48px); font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: .01em; }
          .patient-time-value span { font-size: clamp(16px,4vw,21px); font-weight: 820; }
          .patient-calendar-link { width: 100%; min-height: 48px; margin-top: 20px; align-items: center; justify-content: center; color: var(--accent); text-decoration: none; }
          .patient-doctor-card { display: grid; gap: 0; margin: 0 0 22px; border: 1px solid var(--line); border-radius: 18px; overflow: hidden; background: #fff; }
          .patient-detail-block { display: grid; gap: 7px; padding: 17px 19px; }
          .patient-detail-block + .patient-detail-block { border-top: 1px solid var(--line); }
          .patient-detail-block > span { color: var(--muted); font-size: 10px; font-weight: 820; letter-spacing: .06em; text-transform: uppercase; }
          .patient-detail-block > strong { color: var(--ink); font-size: clamp(24px,6vw,32px); line-height: 1.25; }
          .patient-detail-block > .patient-detail-secondary { font-size: clamp(17px,4vw,21px); font-weight: 790; }
          .patient-contact-block a { width: fit-content; color: var(--accent); font-size: clamp(19px,4.5vw,24px); font-weight: 850; text-decoration: none; }
          .patient-directions-link { width: 100%; min-height: 48px; margin-top: 4px; align-items: center; justify-content: center; color: var(--accent); text-decoration: none; }
          .patient-action-error { margin: 0 0 18px; }
          .patient-timing-card { margin: 0 0 22px; border: 1px solid #cfe7dd; border-radius: 17px; padding: 17px 19px; background: #f5fcf9; }
          .patient-timing-card > span { display: block; color: var(--muted); font-size: 11px; font-weight: 820; letter-spacing: .06em; text-transform: uppercase; }
          .patient-timing-card > strong { display: block; margin-top: 7px; color: var(--accent); font-size: clamp(19px,4.5vw,24px); line-height: 1.35; }
          .patient-timing-card > p { margin: 8px 0 0; color: var(--ink-soft); font-size: 12px; line-height: 1.55; }
          .patient-order-card { margin: 0 0 22px; border: 1px solid #cfe7dd; border-radius: 17px; padding: 17px 19px; background: #effaf6; }
          .patient-order-card > div { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
          .patient-order-card span { color: var(--muted); font-size: 12px; font-weight: 780; }
          .patient-order-card strong { color: var(--accent); font-size: 30px; line-height: 1; }
          .patient-order-card p { margin: 10px 0 0; color: var(--ink-soft); font-size: 14px; line-height: 1.55; }
          .patient-reschedule-card { margin: 0 0 22px; border: 1px solid var(--line); border-radius: 17px; padding: 17px 19px; background: var(--surface); }
          .patient-reschedule-card > strong { display: block; color: var(--ink); font-size: 16px; }
          .patient-reschedule-card > p { margin: 8px 0 14px; color: var(--ink-soft); font-size: 13px; line-height: 1.55; }
          .patient-reschedule-slots { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; }
          .patient-reschedule-slots form { min-width: 0; }
          .patient-reschedule-slot { width: 100%; min-height: 44px; padding-inline: 10px; font-size: 11px; line-height: 1.35; white-space: normal; }
          .patient-earlier-card { margin: 0 0 22px; border: 1px solid var(--line); border-radius: 17px; padding: 17px 19px; background: #fff; }
          .patient-earlier-card.is-active { border-color: #b9dfd1; background: #f3fbf8; }
          .patient-earlier-card > strong { display: block; color: var(--ink); font-size: 16px; }
          .patient-earlier-card > p { margin: 8px 0 14px; color: var(--ink-soft); font-size: 13px; line-height: 1.55; }
          .patient-earlier-join { width: 100%; min-height: 48px; }
          .patient-earlier-leave { border: 0; padding: 5px 0; background: transparent; color: var(--muted); font-size: 12px; font-weight: 720; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
          .patient-initial-response, .patient-response-block { margin-top: 12px; }
          .patient-initial-response h2, .patient-response-block h2 { margin: 0 0 14px; font-size: clamp(22px,5vw,28px); letter-spacing: -.02em; }
          .patient-confirm-primary { width: 100%; min-height: 54px; font-size: 16px; }
          .patient-actions .button { min-height: 54px; }
          .patient-cancel-small { float: inline-end; margin-top: 12px; border: 0; padding: 7px 2px; background: transparent; color: var(--muted); font-size: 12px; font-weight: 720; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
          .patient-status-message { clear: both; margin-top: 22px; border-radius: 16px; padding: 18px; background: var(--surface-soft); color: var(--ink-soft); font-size: 15px; line-height: 1.55; }
          .patient-status-message.is-confirmed { background: var(--success-bg); color: var(--success); }
          .patient-change-mind { margin-top: 12px; border: 0; padding: 5px 0; background: transparent; color: var(--muted); font: inherit; font-size: 12px; font-weight: 720; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
          .patient-privacy { clear: both; padding-top: 14px; }
          .patient-card button, .patient-card a { -webkit-tap-highlight-color: rgba(8,119,90,.15); }
          .patient-card button { transition: transform .1s ease, box-shadow .12s ease, filter .12s ease; }
          .patient-card button:active { transform: scale(.985); filter: brightness(.97); }
          .patient-card button:focus-visible, .patient-card a:focus-visible { outline: 3px solid rgba(8,119,90,.28); outline-offset: 3px; }
          @media(max-width:520px){.patient-reschedule-slots{grid-template-columns:1fr}}
        `}</style>
      </section>
      </div>
    </main>
  );
}

function Unavailable({ locale }: { locale: PatientLocale }) {
  const text = patientCopy[locale];
  return (
    <main className="patient-page">
      <AtlasPatientNav
        locale={locale}
        actionLabel={text.findCare}
        actionHref={`/api/ui-language?locale=${locale}`}
      />
      <div className="center-page patient-page-center">
        <section className="auth-card" lang={text.lang} dir={text.dir}>
          <div className="eyebrow">{text.unavailableEyebrow}</div>
          <h1>{text.unavailableTitle}</h1>
          <p className="quiet">{text.unavailableHelp}</p>
        </section>
      </div>
    </main>
  );
}
