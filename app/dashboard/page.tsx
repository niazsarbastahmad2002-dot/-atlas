import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import {
  formatIraqiMobile,
  isAppointmentStatus,
  isUuid,
  toBaghdadInputValue,
} from "@/lib/appointments";
import { baghdadDate } from "@/lib/i18n/config";
import { formatLeadTime, formatTimeValue, localizeDigits } from "@/lib/i18n/format";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { formatBaghdadDateTime, formatBaghdadDay, uiLocaleMeta, uiText, type UiLocale } from "@/lib/i18n/ui";
import { getDashboardMessage } from "@/lib/messages";
import { ClinicArrivalDisclosure } from "./clinic-arrival-disclosure";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/app/components/submit-button";
import { ClinicPriorityBoard } from "./clinic-priority-board";
import { ClinicFirstWorkspace } from "./clinic-first-workspace";
import { createAppointment } from "./actions";
import { AppointmentActions } from "./appointment-actions";
import { ClinicArrivalQuickAction } from "./clinic-arrival-quick-action";
import { AppointmentEditor } from "./appointment-editor";
import { AppointmentTimeField } from "./appointment-time-field";
import { LiveClinicClock } from "./live-clinic-clock";
import { LiveClinicFlow } from "./live-clinic-flow";
import { DashboardDayRollover } from "./dashboard-day-rollover";

export const dynamic = "force-dynamic";

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const DAILY_SCHEDULE_VIEW_LIMIT = 500;
const OCCUPIED_SLOT_PAGE_SIZE = 500;
const OCCUPIED_SLOT_VIEW_LIMIT = 5000;

type DashboardPageProps = {
  searchParams: Promise<{ clinic?: string; day?: string; doctor?: string; focus?: string; error?: string; notice?: string }>;
};

const dayCopy: Record<UiLocale, {
  previous: string; today: string; yesterday: string; tomorrow: string; next: string; nextUp: string;
  appointments: string; empty: string; emptyHelp: string; add: string; reminders: string; order: string; quickDates: string; doctorSchedules: string; limited: string; availabilityLimited: string;
}> = {
  en: { previous: "Previous", today: "Today", yesterday: "Yesterday", tomorrow: "Tomorrow", next: "Next", nextUp: "Next appointment", appointments: "Appointments", empty: "No appointments on this day.", emptyHelp: "Add an appointment when the first patient calls or walks in.", add: "Add appointment", reminders: "Patient reminders", order: "Appointment order", quickDates: "Quick schedule dates", doctorSchedules: "Doctor schedules", limited: "This clinic day has more than {count} appointments. Atlas is showing the first {count}; schedule counts may be incomplete.", availabilityLimited: "Future availability is partially loaded because this clinic has more than {count} active upcoming appointments. Atlas will still prevent double-booking when you save." },
  ku: { previous: "پێشوو", today: "ئەمڕۆ", yesterday: "دوێنێ", tomorrow: "سبەی", next: "داهاتوو", nextUp: "وادەی داهاتوو", appointments: "وادەکان", empty: "لەم ڕۆژە هیچ وادەیەک نییە.", emptyHelp: "کاتێک یەکەم نەخۆش پەیوەندی کرد یان هات، وادەکە زیاد بکە.", add: "وادە زیاد بکە", reminders: "بیرخستنەوەی نەخۆش", order: "ڕیزی وادە", quickDates: "ڕۆژە خێراکان", doctorSchedules: "خشتەی پزیشکەکان", limited: "ئەم ڕۆژەی کلینیک زیاتر لە {count} وادەی هەیە. Atlas تەنها یەکەم {count} وادە پیشان دەدات؛ ژمارەکانی خشتەکە لەوانەیە تەواو نەبن.", availabilityLimited: "بەردەستبوونی کاتە داهاتووەکان بەشێکی بارکراوە، چونکە کلینیکەکە زیاتر لە {count} وادەی چالاکی داهاتووی هەیە. Atlas لە کاتی پاشەکەوتکردن هەرگیز ڕێگە بە دوو وادە لە یەک کاتدا نادات." },
  bd: { previous: "بەرێ", today: "ئەڤرۆ", yesterday: "دووهی", tomorrow: "سبەهێ", next: "پاش", nextUp: "وادەیا پاش", appointments: "وادە", empty: "ل ڤێ ڕۆژێ چ وادە نینن.", emptyHelp: "دەمێ نەخۆشێ ئێکێ پەیوەندی دکەت یان دهێت، وادەیێ زێدە بکە.", add: "وادە زێدە بکە", reminders: "بیرخستنەوەیێن نەخۆشی", order: "ڕێزا وادەیان", quickDates: "ڕۆژێن خێرا", doctorSchedules: "خشتەیێن دکتۆران", limited: "ڤێ ڕۆژا کلینیکێ پتر ژ {count} وادە هەنە. Atlas تەنێ {count} وادەیێن ئێکێ نیشان ددەت؛ ژمارێن خشتەیێ دکارن ناتەمام بن.", availabilityLimited: "بەردەستبوونا دەمێن پاشێ بەشەک هاتیە بارکرن، چونکی کلینیک پتر ژ {count} وادەیێن چالاک یێن پاشێ هەنە. Atlas دەمێ پاراستنێ هەر دێ دوو وادە ل ئێک دەمی ڕێ نەدەت." },
  ar: { previous: "السابق", today: "اليوم", yesterday: "أمس", tomorrow: "باچر", next: "التالي", nextUp: "الموعد التالي", appointments: "المواعيد", empty: "ماكو مواعيد بهذا اليوم.", emptyHelp: "ضيف موعد من يتصل أول مريض أو يوصل للعيادة.", add: "إضافة موعد", reminders: "تذكيرات المرضى", order: "ترتيب الموعد", quickDates: "أيام سريعة", doctorSchedules: "جداول الأطباء", limited: "هذا اليوم في العيادة يحتوي على أكثر من {count} موعد. يعرض Atlas أول {count} فقط، لذلك قد تكون أعداد الجدول غير مكتملة.", availabilityLimited: "توفر الأوقات المستقبلية محمّل جزئياً لأن العيادة عندها أكثر من {count} موعد فعال قادم. Atlas سيظل يمنع الحجز المزدوج عند الحفظ." },
};

const contactRelationshipCopy: Record<UiLocale, {
  label: string;
  choose: string;
  patient: string;
  guardian: string;
  caregiver: string;
}> = {
  en: { label: "Whose phone is this?", choose: "Choose phone owner", patient: "Patient", guardian: "Parent / guardian", caregiver: "Relative / caregiver" },
  ku: { label: "ئەم ژمارەیە هی کێیە؟", choose: "خاوەنی ژمارەکە هەڵبژێرە", patient: "نەخۆش", guardian: "دایک، باوک / سەرپەرشت", caregiver: "خزم / چاودێر" },
  bd: { label: "ئەڤ ژمارە یا کێیە؟", choose: "خودانێ ژمارەیێ هەلبژێرە", patient: "نەخۆش", guardian: "دایک، باب / سەرپەرشت", caregiver: "خزم / چاڤدێر" },
  ar: { label: "رقم من هذا؟", choose: "اختَر صاحب الرقم", patient: "المريض", guardian: "الأب / الأم / ولي الأمر", caregiver: "قريب / مقدم رعاية" },
};

const dashboardErrorCopy: Record<UiLocale, { title: string; help: string }> = {
  en: {
    title: "Atlas could not load this clinic.",
    help: "Refresh once. If it continues, check the clinic connection before entering any patient details.",
  },
  ku: {
    title: "Atlas نەیتوانی ئەم کلینیکە بار بکات.",
    help: "جارێک پەڕەکە نوێ بکەرەوە. ئەگەر بەردەوام بوو، پێش نووسینی زانیاری نەخۆش پەیوەندی کلینیکەکە بپشکنە.",
  },
  bd: {
    title: "Atlas نەشیا ڤێ کلینیکێ بار بکەت.",
    help: "جارەکێ پەڕێ نوو بکە. ئەگەر بەردەوام بوو، بەری داخلكرنا زانیاریێن نەخۆشی پەیوەندیا کلینیکێ بپشکنە.",
  },
  ar: {
    title: "تعذر على Atlas تحميل هذه العيادة.",
    help: "حدّث الصفحة مرة واحدة. إذا استمرت المشكلة، تحقق من اتصال العيادة قبل إدخال أي بيانات للمريض.",
  },
};

const summaryCopy: Record<UiLocale, {
  all: string;
  notConfirmed: string;
  confirmed: string;
  completed: string;
  noShow: string;
  cancelled: string;
}> = {
  en: { all: "All appointments", notConfirmed: "Attendance not confirmed", confirmed: "Attendance confirmed", completed: "Visit completed", noShow: "Did not attend", cancelled: "Cancelled" },
  ku: { all: "هەموو مەوعیدەکان", notConfirmed: "هاتن پشتڕاست نەکراوە", confirmed: "هاتن پشتڕاستکراوە", completed: "سەردان تەواوبوو", noShow: "نەهات", cancelled: "هەڵوەشاوە" },
  bd: { all: "هەمی مەوعید", notConfirmed: "هاتن نەهاتیە پشتڕاستکرن", confirmed: "هاتن پشتڕاستکریە", completed: "سەردان تەمام بوو", noShow: "نەهات", cancelled: "هەلوەشیا" },
  ar: { all: "كل المواعيد", notConfirmed: "الحضور غير مؤكد", confirmed: "الحضور مؤكد", completed: "انتهت الزيارة", noShow: "لم يحضر", cancelled: "ملغي" },
};

const workbenchCopy: Record<UiLocale, {
  eyebrow: string; title: string; description: string; active: string; book: string;
  next: string; review: string; find: string; filters: string; filteredEmpty: string; all: string;
}> = {
  en: { eyebrow: "Clinic operations", title: "Your clinic, at a glance", description: "See what needs attention and move straight to the next task.", active: "Active appointments", book: "Book an appointment", next: "Next scheduled", review: "Review unconfirmed", find: "Find a patient", filters: "Focus the schedule", filteredEmpty: "No appointments match this view.", all: "Show all appointments" },
  ku: { eyebrow: "کاروباری کلینیک", title: "دۆخی کلینیک بە یەک نیگا", description: "بزانە چی پێویستی بە سەرنجە و ڕاستەوخۆ دەست بە کاری داهاتوو بکە.", active: "وادە چالاکەکان", book: "وادە تۆمار بکە", next: "وادەی داهاتوو", review: "پشکنینی وادە پشتڕاستنەکراوەکان", find: "دۆزینەوەی نەخۆش", filters: "خشتەکە ڕێک بخە", filteredEmpty: "هیچ وادەیەک لەم بەشەدا نییە.", all: "هەموو وادەکان پیشان بدە" },
  bd: { eyebrow: "کارێن کلینیکێ", title: "بارودۆخێ کلینیکێ ب ئێک نێرین", description: "بزانە چ پێدڤی ب سەرنجێ هەیە و دەست ب کارێ پاشێ بکە.", active: "وادەیێن چالاک", book: "وادەیەک تۆمار بکە", next: "وادەیا پاشێ", review: "پشکنینا وادەیێن نەهاتینە پشتڕاستکرن", find: "دیتنا نەخۆشی", filters: "خشتەیێ ڕێک بخە", filteredEmpty: "چ وادە ل ڤێ بەشێ نینن.", all: "هەمی وادەیان نیشان بدە" },
  ar: { eyebrow: "إدارة العيادة", title: "عيادتك بنظرة واحدة", description: "شوف شنو يحتاج متابعة وانتقل مباشرة للخطوة الجاية.", active: "المواعيد النشطة", book: "حجز موعد", next: "الموعد القادم", review: "مراجعة غير المؤكد", find: "البحث عن مريض", filters: "تصفية الجدول", filteredEmpty: "ماكو مواعيد تطابق هذا العرض.", all: "عرض كل المواعيد" },
};

const arrivalBoardCopy: Record<UiLocale, {
  title: string; subtitle: string; needsConfirmation: string; attendanceConfirmed: string;
  viewAll: string; open: string; noPending: string; noConfirmed: string; showFullQueue: string;
}> = {
  en: { title: "Front-desk action queue", subtitle: "Open an appointment to update its status or details.", needsConfirmation: "Attendance not confirmed", attendanceConfirmed: "Attendance confirmed", viewAll: "View all", open: "Open appointment", noPending: "No appointments need confirmation.", noConfirmed: "No confirmed attendance yet.", showFullQueue: "All active patients" },
  ku: { title: "ڕیزی کاری ڕیسێپشن", subtitle: "وادەیەک بکەرەوە بۆ نوێکردنەوەی دۆخ یان زانیارییەکانی.", needsConfirmation: "هاتن پشتڕاست نەکراوە", attendanceConfirmed: "هاتن پشتڕاستکراوە", viewAll: "هەمووی ببینە", open: "وادەکە بکەرەوە", noPending: "هیچ وادەیەک چاوەڕێی پشتڕاستکردنەوە نییە.", noConfirmed: "هێشتا هیچ هاتنێک پشتڕاست نەکراوە.", showFullQueue: "هەموو نەخۆشە چالاکەکان" },
  bd: { title: "ڕێزا کارێن ڕیسێپشنێ", subtitle: "وادەیەک ڤەکە بۆ نووکرنا بار یان زانیارییان.", needsConfirmation: "هاتن نەهاتیە پشتڕاستکرن", attendanceConfirmed: "هاتن پشتڕاستکریە", viewAll: "هەمی ببینە", open: "وادەیێ ڤەکە", noPending: "چ وادە چاوەڕێی پشتڕاستکرنێ نینن.", noConfirmed: "هێشتا چ هاتن نەهاتینە پشتڕاستکرن.", showFullQueue: "هەمی نەخۆشێن چالاک" },
  ar: { title: "قائمة عمل الاستقبال", subtitle: "افتح الموعد لتحديث حالته أو تفاصيله.", needsConfirmation: "الحضور غير مؤكد", attendanceConfirmed: "الحضور مؤكد", viewAll: "عرض الكل", open: "فتح الموعد", noPending: "ماكو مواعيد تحتاج تأكيد حضور.", noConfirmed: "ماكو حضور مؤكد لحد الآن.", showFullQueue: "كل المرضى النشطين" },
};

function validBaghdadDay(value: string | undefined, fallback: string) {
  if (!value || !dayPattern.test(value)) return fallback;
  const date = new Date(`${value}T12:00:00+03:00`);
  if (Number.isNaN(date.getTime()) || baghdadDate.format(date) !== value) return fallback;
  return value;
}

function shiftBaghdadDay(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00+03:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return baghdadDate.format(date);
}

function scheduleHref(clinicId: string, day: string, doctorId?: string | null, focus?: string) {
  const params = new URLSearchParams({ clinic: clinicId, day });
  if (doctorId) params.set("doctor", doctorId);
  if (focus && focus !== "all") params.set("focus", focus);
  return `/dashboard?${params}`;
}

function formatShortcutDay(day: string, locale: UiLocale) {
  if (locale === "bd") {
    const [, month, date] = day.split("-");
    return localizeDigits(`${date}/${month}`, locale);
  }
  return new Intl.DateTimeFormat(uiLocaleMeta[locale].dateLocale, {
    timeZone: "Asia/Baghdad",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${day}T12:00:00+03:00`));
}

function reminderPlanLabel(first: number, second: number | null, locale: UiLocale) {
  const firstLabel = formatLeadTime(first, locale);
  if (!second) return firstLabel;
  const secondLabel = formatLeadTime(second, locale);
  if (locale === "ku") return `${firstLabel} + ${secondLabel} پێش وادە`;
  if (locale === "bd") return `${firstLabel} + ${secondLabel} بەری وادەیێ`;
  if (locale === "ar") return `${firstLabel} + ${secondLabel} قبل الموعد`;
  return `${firstLabel} + ${secondLabel} before appointment`;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const locale = await getUiLocale();
  const t = uiText(locale);
  const days = dayCopy[locale];
  const summary = summaryCopy[locale];
  const workbench = workbenchCopy[locale];
  const contactRelationship = contactRelationshipCopy[locale];
  const messageError = getDashboardMessage(params.error);
  const notice = getDashboardMessage(params.notice);
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: clinics, error: clinicsError } = await supabase.from("clinics").select("id, name, owner_id, appointment_interval_minutes").order("created_at", { ascending: true });
  if (clinicsError) return <DashboardError locale={locale} />;
  if (!clinics?.length) {
    return <ClinicFirstWorkspace locale={locale} error={messageError} />;
  }

  const requestedClinic = params.clinic && isUuid(params.clinic) ? params.clinic : null;
  const clinic = clinics.find((item) => item.id === requestedClinic) ?? clinics[0];
  const selectionError = params.clinic && requestedClinic !== clinic.id ? getDashboardMessage("clinic_unavailable") : null;
  const now = Date.now();
  const today = baghdadDate.format(new Date(now));
  const selectedDay = validBaghdadDay(params.day, today);
  const yesterday = shiftBaghdadDay(today, -1);
  const tomorrow = shiftBaghdadDay(today, 1);
  const selectedDate = new Date(`${selectedDay}T12:00:00+03:00`);
  const relativeDay = selectedDay === today ? days.today : selectedDay === yesterday ? days.yesterday : selectedDay === tomorrow ? days.tomorrow : null;
  const dayStart = new Date(`${selectedDay}T00:00:00+03:00`).toISOString();
  const dayEnd = new Date(`${shiftBaghdadDay(selectedDay, 1)}T00:00:00+03:00`).toISOString();
  const bookingHorizonEnd = new Date(now + 2 * 365 * 24 * 60 * 60 * 1000);

  const loadOccupiedAppointments = async () => {
    const loaded: Array<{ id: string; doctor_id: string | null; appointment_at: string }> = [];
    for (let from = 0; from < OCCUPIED_SLOT_VIEW_LIMIT; from += OCCUPIED_SLOT_PAGE_SIZE) {
      const to = Math.min(from + OCCUPIED_SLOT_PAGE_SIZE - 1, OCCUPIED_SLOT_VIEW_LIMIT - 1);
      const { data, error } = await supabase.from("appointments")
        .select("id, doctor_id, appointment_at")
        .eq("clinic_id", clinic.id)
        .is("voided_at", null)
        .in("status", ["pending", "confirmed"])
        .gte("appointment_at", new Date(now - 5 * 60 * 1000).toISOString())
        .lte("appointment_at", bookingHorizonEnd.toISOString())
        .order("appointment_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
      if (error) return { data: null, error, limited: false };
      const page = data ?? [];
      loaded.push(...page);
      if (page.length < OCCUPIED_SLOT_PAGE_SIZE) return { data: loaded, error: null, limited: false };
    }

    const { data: overflow, error: overflowError } = await supabase.from("appointments")
      .select("id")
      .eq("clinic_id", clinic.id)
      .is("voided_at", null)
      .in("status", ["pending", "confirmed"])
      .gte("appointment_at", new Date(now - 5 * 60 * 1000).toISOString())
      .lte("appointment_at", bookingHorizonEnd.toISOString())
      .order("appointment_at", { ascending: true })
      .order("id", { ascending: true })
      .range(OCCUPIED_SLOT_VIEW_LIMIT, OCCUPIED_SLOT_VIEW_LIMIT);
    if (overflowError) return { data: null, error: overflowError, limited: false };
    return { data: loaded, error: null, limited: Boolean(overflow?.length) };
  };

  const [
    { data: membership, error: membershipError },
    { data: appointments, error: appointmentError, count: appointmentCount },
    { data: occupiedAppointments, error: occupiedError, limited: occupiedSlotsLimited },
    { data: reminderSettings, error: reminderSettingsError },
    { data: doctorWorkflowRows, error: workflowError },
    { data: doctors, error: doctorsError },
  ] = await Promise.all([
    supabase.from("clinic_members").select("role, assigned_doctor_id").eq("clinic_id", clinic.id).eq("user_id", userData.user.id).maybeSingle(),
    supabase.from("appointments").select("id, patient_name, patient_phone, contact_relationship, doctor_id, doctor_name, appointment_at, created_at, status, reminder_status, reminder_language, reminder_consent, appointment_revision", { count: "exact" }).eq("clinic_id", clinic.id).is("voided_at", null).gte("appointment_at", dayStart).lt("appointment_at", dayEnd).order("appointment_at", { ascending: true }).order("created_at", { ascending: true }).order("id", { ascending: true }).limit(DAILY_SCHEDULE_VIEW_LIMIT),
    loadOccupiedAppointments(),
    supabase.from("clinic_reminder_settings").select("enabled, lead_minutes, second_lead_minutes, default_reminder_language").eq("clinic_id", clinic.id).maybeSingle(),
    (supabase as any).from("doctor_workflow_settings").select("doctor_id, appointment_interval_minutes, default_reminder_language").eq("clinic_id", clinic.id),
    supabase.from("doctors").select("id, name, active, display_order").eq("clinic_id", clinic.id).order("display_order", { ascending: true }).order("name", { ascending: true }),
  ]);
  if (membershipError || appointmentError || occupiedError || reminderSettingsError || workflowError || doctorsError) return <DashboardError locale={locale} />;

  const canMonitorDoctors = clinic.owner_id === userData.user.id || membership?.role === "owner" || membership?.role === "manager";
  const rows = appointments ?? [];
  const scheduleTruncated = appointmentCount !== null && appointmentCount > rows.length;
  const doctorRows = doctors ?? [];
  const activeDoctors = doctorRows.filter((doctor) => doctor.active);
  const multiDoctor = canMonitorDoctors && activeDoctors.length > 1;
  const requestedDoctorId = params.doctor && isUuid(params.doctor) ? params.doctor : null;
  const selectedDoctor = multiDoctor
    ? activeDoctors.find((doctor) => doctor.id === requestedDoctorId)
      ?? activeDoctors.find((doctor) => rows.some((row) => row.doctor_id === doctor.id))
      ?? activeDoctors[0]
    : activeDoctors[0] ?? null;
  const selectedDoctorId = multiDoctor ? selectedDoctor?.id ?? null : null;
  const selectedDoctorWorkflow = ((doctorWorkflowRows ?? []) as Array<{ doctor_id: string; appointment_interval_minutes: number; default_reminder_language: string }>)
    .find((row) => row.doctor_id === selectedDoctor?.id);
  const defaultReminderLanguage = selectedDoctorWorkflow?.default_reminder_language ?? reminderSettings?.default_reminder_language ?? "ku";
  const doctorInterval = selectedDoctorWorkflow?.appointment_interval_minutes;
  const bookingInterval = typeof doctorInterval === "number" && [5, 10, 15, 20, 30].includes(doctorInterval)
    ? doctorInterval
    : clinic.appointment_interval_minutes;
  const visibleRows = multiDoctor && selectedDoctor
    ? rows.filter((row) => row.doctor_id === selectedDoctor.id)
    : rows;

  const confirmed = visibleRows.filter((row) => row.status === "confirmed").length;
  const pending = visibleRows.filter((row) => row.status === "pending").length;
  const completed = visibleRows.filter((row) => row.status === "completed").length;
  const noShow = visibleRows.filter((row) => row.status === "no_show").length;
  const cancelled = visibleRows.filter((row) => row.status === "cancelled").length;
  const focusStatuses = ["all", "pending", "confirmed", "completed", "no_show", "cancelled"] as const;
  const focus = focusStatuses.find((item) => item === params.focus) ?? "all";
  const focusedRows = focus === "all" ? visibleRows : visibleRows.filter((row) => row.status === focus);
  const arrivalCopy = arrivalBoardCopy[locale];
  const pendingQueue = visibleRows.filter((row) => row.status === "pending").slice(0, 3);
  const confirmedQueue = visibleRows.filter((row) => row.status === "confirmed").slice(0, 3);
  const hasArrivalQueue = pending > 0 || confirmed > 0;
  const arrivalLanes = [
    { status: "pending" as const, label: arrivalCopy.needsConfirmation, count: pending, appointments: pendingQueue, empty: arrivalCopy.noPending },
    { status: "confirmed" as const, label: arrivalCopy.attendanceConfirmed, count: confirmed, appointments: confirmedQueue, empty: arrivalCopy.noConfirmed },
  ];
  const focusOptions = [
    { key: "all", label: summary.all, count: visibleRows.length },
    { key: "pending", label: summary.notConfirmed, count: pending },
    { key: "confirmed", label: summary.confirmed, count: confirmed },
    { key: "completed", label: summary.completed, count: completed },
    { key: "no_show", label: summary.noShow, count: noShow },
    { key: "cancelled", label: summary.cancelled, count: cancelled },
  ];

  const appointmentOrder = new Map<string, number>();
  let activeOrder = 0;
  for (const row of visibleRows) {
    if (row.status !== "pending" && row.status !== "confirmed") continue;
    activeOrder += 1;
    appointmentOrder.set(row.id, activeOrder);
  }

  const previousDay = shiftBaghdadDay(selectedDay, -1);
  const nextDay = shiftBaghdadDay(selectedDay, 1);
  const nextAppointment = selectedDay >= today ? visibleRows.find((row) => ["pending", "confirmed"].includes(row.status) && (selectedDay > today || new Date(row.appointment_at).getTime() >= now - 5 * 60 * 1000)) ?? null : null;
  const nextAppointmentId = nextAppointment?.id ?? null;

  const occupiedForSelectedDoctor = selectedDoctor
    ? (occupiedAppointments ?? []).filter((row) => row.doctor_id === selectedDoctor.id)
    : (occupiedAppointments ?? []);
  const futureAppointmentDays = Array.from(new Set(
    occupiedForSelectedDoctor
      .map((row) => baghdadDate.format(new Date(row.appointment_at)))
      .filter((day) => day > tomorrow),
  )).sort().slice(0, 40);
  const quickDays = [
    { day: yesterday, label: days.yesterday },
    { day: today, label: days.today },
    { day: tomorrow, label: days.tomorrow },
    ...futureAppointmentDays.map((day) => ({ day, label: formatShortcutDay(day, locale) })),
  ];

  const selectedFutureHasActiveSchedule = selectedDay <= tomorrow
    || visibleRows.some((row) => row.status === "pending" || row.status === "confirmed");
  const canCreateOnSelectedDay = selectedDay >= today;
  const minimum = new Date(now + 5 * 60 * 1000); minimum.setSeconds(0, 0);
  const maximum = bookingHorizonEnd;
  const minimumInput = toBaghdadInputValue(minimum);
  const maximumInput = toBaghdadInputValue(maximum);
  const occupiedByDoctor = (occupiedAppointments ?? []).reduce<Record<string, string[]>>((result, row) => { if (!row.doctor_id) return result; const values = result[row.doctor_id] ?? []; values.push(toBaghdadInputValue(new Date(row.appointment_at))); result[row.doctor_id] = values; return result; }, {});
  const statusLabels: Record<string, string> = { pending: t.pending, confirmed: t.confirmed, cancelled: t.cancelled, completed: t.completed, no_show: t.noShow };
  const reminderLabels: Record<string, string> = { queued: t.reminderQueued, processing: t.reminderSending, sent: t.reminderSent, delivered: t.reminderDelivered, read: t.reminderRead, failed: t.reminderFailed };
  const reminderLanguageLabels: Record<string, string> = locale === "ar"
    ? { ku: "الكردية (السورانية)", bd: "الكردية (البادينية)", ar: "العربية العراقية", en: "الإنجليزية" }
    : locale === "en"
      ? { ku: "Kurdish (Sorani)", bd: "Kurdish (Badini)", ar: "Iraqi Arabic", en: "English" }
      : { ku: "کوردی (سۆرانی)", bd: "کوردی (بادینی)", ar: "عەرەبی (عێراقی)", en: "ئینگلیزی" };

  return <main className="workspace-page shell" data-atlas-selected-day={selectedDay} data-atlas-clinic={clinic.id} data-atlas-memory-valid={selectedFutureHasActiveSchedule ? "true" : "false"}>
    <DashboardDayRollover selectedDay={selectedDay} todayAtRender={today} />
    <header className="workspace-header"><div className="workspace-title-block"><div className="eyebrow">{t.schedule}</div><h1 data-atlas-user-content="true">{clinic.name}</h1></div><LiveClinicClock locale={locale} /></header>
    <LiveClinicFlow
      key={`${clinic.id}:${selectedDoctor?.id ?? "none"}:${selectedDay}`}
      locale={locale}
      clinicId={clinic.id}
      doctorId={selectedDoctor?.id ?? null}
      day={selectedDay}
      embedded
    />
    <nav className="schedule-date-shortcuts" aria-label={days.quickDates}>
      {quickDays.map((item) => <a className={item.day === selectedDay ? "is-selected" : ""} href={scheduleHref(clinic.id, item.day, selectedDoctorId)} key={item.day} aria-current={item.day === selectedDay ? "date" : undefined}>{item.label}</a>)}
    </nav>
    <nav className="day-navigation" aria-label={days.appointments}>
      <a className="button button-ghost button-small" href={scheduleHref(clinic.id, previousDay, selectedDoctorId)} aria-label={days.previous}>‹ <span>{days.previous}</span></a>
      <a className={`day-current ${selectedDay === today ? "is-today" : ""} ${relativeDay ? "has-relative-day" : ""}`} href={scheduleHref(clinic.id, today, selectedDoctorId)}><strong>{formatBaghdadDay(selectedDate, locale)}</strong>{relativeDay ? <span data-atlas-relative-day="true">{relativeDay}</span> : null}</a>
      <a className="button button-ghost button-small" href={scheduleHref(clinic.id, nextDay, selectedDoctorId)} aria-label={days.next}><span>{days.next}</span> ›</a>
    </nav>
    {clinics.length > 1 ? <form key={clinic.id} className="clinic-switcher workspace-switcher" method="get"><label htmlFor="clinic">{t.clinicWorkspace}</label><input type="hidden" name="day" value={selectedDay} /><select id="clinic" name="clinic" defaultValue={clinic.id}>{clinics.map((item) => <option value={item.id} key={item.id} data-atlas-user-content="true">{item.name}</option>)}</select><button className="button button-ghost button-small" type="submit">{t.switch}</button></form> : null}
    {multiDoctor ? <nav className="doctor-schedule-tabs" aria-label={days.doctorSchedules}>{activeDoctors.map((doctor) => { const count = rows.filter((row) => row.doctor_id === doctor.id).length; const selected = doctor.id === selectedDoctor?.id; return <a href={scheduleHref(clinic.id, selectedDay, doctor.id)} className={selected ? "is-selected" : ""} aria-current={selected ? "page" : undefined} key={doctor.id}><strong data-atlas-user-content="true">{doctor.name}</strong><span>{localizeDigits(count, locale)}</span></a>; })}</nav> : null}
    {messageError || selectionError ? <p className="notice notice-error workspace-notice" role="alert">{messageError ?? selectionError}</p> : null}{notice ? <p className="notice notice-success workspace-notice" role="status">{notice}</p> : null}
    {scheduleTruncated ? <p className="notice workspace-notice" role="status">{days.limited.replaceAll("{count}", localizeDigits(rows.length, locale))}</p> : null}
    <section className="clinic-command-center" aria-label={workbench.title}>
      <div className="clinic-command-main">
        <div className="eyebrow">{workbench.eyebrow} · {relativeDay ?? formatBaghdadDay(selectedDate, locale)}</div>
        <h2>{workbench.title}</h2>
        <p>{workbench.description}</p>
        <div className="clinic-command-actions">
          {canCreateOnSelectedDay && selectedDoctor ? <a className="clinic-command-primary" href="#new-appointment">+ {workbench.book}</a> : null}
          {pending > 0 ? <a className="clinic-command-secondary" href={scheduleHref(clinic.id, selectedDay, selectedDoctorId, "pending")}>{workbench.review} <span aria-hidden="true">↗</span></a> : null}
          {visibleRows.length > 0 ? <a className="clinic-command-secondary" href={focus === "all" ? "#atlas-appointment-search" : `${scheduleHref(clinic.id, selectedDay, selectedDoctorId)}#atlas-appointment-search`} data-atlas-find-patient="true">{workbench.find} <span aria-hidden="true">⌕</span></a> : null}
        </div>
      </div>
      <div className="clinic-command-metrics">
        <div className="clinic-command-active"><span>{workbench.active}</span><strong>{localizeDigits(pending + confirmed, locale)}</strong></div>
        <a className="clinic-command-metric" href={scheduleHref(clinic.id, selectedDay, selectedDoctorId, "pending")}><span>{summary.notConfirmed}</span><strong>{localizeDigits(pending, locale)}</strong></a>
        <a className="clinic-command-metric" href={scheduleHref(clinic.id, selectedDay, selectedDoctorId, "confirmed")}><span>{summary.confirmed}</span><strong>{localizeDigits(confirmed, locale)}</strong></a>
        <div className="clinic-command-next"><span>{workbench.next}</span><strong>{nextAppointment ? formatTimeValue(toBaghdadInputValue(new Date(nextAppointment.appointment_at)).slice(11, 16), locale) : "—"}</strong></div>
      </div>
    </section>
    <ClinicPriorityBoard
      key={`${clinic.id}:${selectedDoctor?.id ?? "none"}:${selectedDay}`}
      clinicId={clinic.id}
      selectedDay={selectedDay}
      selectedDoctorId={selectedDoctorId}
      locale={locale}
      nowAtRender={now}
      appointments={visibleRows.filter((row) => row.status === "pending" || row.status === "confirmed").map((row) => ({
        id: row.id,
        patient_name: row.patient_name,
        appointment_at: row.appointment_at,
        appointment_revision: row.appointment_revision,
        status: row.status,
      }))}
    />
    {hasArrivalQueue ? <ClinicArrivalDisclosure
      key={`${clinic.id}:${selectedDoctor?.id ?? "none"}:${selectedDay}`}
      appointments={visibleRows.map(({ id, status, appointment_at }) => ({ id, status, appointment_at }))}
      selectedDay={selectedDay}
      nowAtRender={now}
      summary={<>
        <span className="clinic-arrival-disclosure-label">{arrivalCopy.showFullQueue}</span>
        <span className="clinic-arrival-disclosure-counts">
          <span>{arrivalCopy.needsConfirmation}: <strong>{localizeDigits(pending, locale)}</strong></span>
          <span>{arrivalCopy.attendanceConfirmed}: <strong>{localizeDigits(confirmed, locale)}</strong></span>
        </span>
        <span className="clinic-arrival-disclosure-chevron" aria-hidden="true">⌄</span>
      </>}
    >
      <section className="clinic-arrival-board" aria-labelledby="clinic-arrival-heading">
      <div className="clinic-arrival-heading">
        <div>
          <div className="eyebrow">{relativeDay ?? formatBaghdadDay(selectedDate, locale)}</div>
          <h2 id="clinic-arrival-heading">{arrivalCopy.title}</h2>
          <p>{arrivalCopy.subtitle}</p>
        </div>
      </div>
      <div className="clinic-arrival-lanes">
        {arrivalLanes.map((lane) => <section key={lane.status} className={`clinic-arrival-lane is-${lane.status}`} aria-label={lane.label}>
          <div className="clinic-arrival-lane-heading">
            <h3><span className="clinic-arrival-count">{localizeDigits(lane.count, locale)}</span>{lane.label}</h3>
            {lane.count > 0 ? <a href={scheduleHref(clinic.id, selectedDay, selectedDoctorId, lane.status)}>{arrivalCopy.viewAll} <span aria-hidden="true">↗</span></a> : null}
          </div>
          {lane.appointments.length > 0
            ? <ul className="clinic-arrival-items">{lane.appointments.map((appointment) => <li key={appointment.id}>
                <a href={`${scheduleHref(clinic.id, selectedDay, selectedDoctorId, lane.status)}#atlas-appointment-${appointment.id}`}>
                  <span className="clinic-arrival-patient" data-atlas-user-content="true">{appointment.patient_name}</span>
                  <span className="clinic-arrival-time"><bdi dir="ltr">{formatTimeValue(toBaghdadInputValue(new Date(appointment.appointment_at)).slice(11, 16), locale)}</bdi></span>
                  <span className="clinic-arrival-open">{arrivalCopy.open} <span aria-hidden="true">↗</span></span>
                </a>
                {selectedDay === today ? <ClinicArrivalQuickAction
                  key={`${appointment.id}:${appointment.appointment_revision}:${lane.status}`}
                  clinicId={clinic.id}
                  appointmentId={appointment.id}
                  patientName={appointment.patient_name}
                  revision={appointment.appointment_revision}
                  status={lane.status}
                  appointmentAt={appointment.appointment_at}
                  locale={locale}
                /> : null}
              </li>)}</ul>
            : <p className="clinic-arrival-empty">{lane.empty}</p>}
        </section>)}
      </div>
      </section>
    </ClinicArrivalDisclosure> : null}
    <nav className="schedule-focus" aria-label={workbench.filters}>
      <strong className="schedule-focus-label">{workbench.filters}</strong>
      <div className="schedule-focus-options">
        {focusOptions.map((option) => <a key={option.key} className={focus === option.key ? "is-selected" : ""} href={scheduleHref(clinic.id, selectedDay, selectedDoctorId, option.key)} aria-current={focus === option.key ? "page" : undefined}>{option.label}</a>)}
      </div>
    </nav>
    <div className={`workspace-grid ${canCreateOnSelectedDay ? "" : "is-read-only-day"}`}>
      <section className="panel appointments-panel schedule-card"><div className="panel-heading schedule-heading"><div><div className="eyebrow">{relativeDay ?? t.schedule}</div><h2>{formatBaghdadDay(selectedDate, locale)}</h2><p className="panel-subtitle" data-atlas-user-content={selectedDoctor ? "true" : undefined}>{selectedDoctor?.name ?? t.todaySubheading}</p></div><div className="schedule-count-box" aria-label={`${days.appointments}: ${localizeDigits(focusedRows.length, locale)}`}><span>{days.appointments}</span><strong>{localizeDigits(focusedRows.length, locale)}</strong></div></div>
        {focusedRows.length === 0 ? <div className="empty-state compact-empty"><div><strong>{focus === "all" ? days.empty : workbench.filteredEmpty}</strong><span>{focus === "all" ? days.emptyHelp : focusOptions.find((option) => option.key === focus)?.label}</span>{focus !== "all" ? <a className="button button-ghost button-small" href={scheduleHref(clinic.id, selectedDay, selectedDoctorId)}>{workbench.all}</a> : null}{canCreateOnSelectedDay && selectedDoctor ? <a className="button button-small empty-state-action" href="#new-appointment">+ {days.add}</a> : null}</div></div> : <div className="appointment-list polished-appointment-list">{focusedRows.map((appointment) => { const status = isAppointmentStatus(appointment.status) ? appointment.status : "pending"; const editorDoctors = doctorRows.filter((doctor) => doctor.active || doctor.id === appointment.doctor_id).map((doctor) => ({ id: doctor.id, name: doctor.name })); const isNext = appointment.id === nextAppointmentId; const reminderLabel = reminderLabels[appointment.reminder_status]; const order = appointmentOrder.get(appointment.id); const canEditDetails = new Date(appointment.appointment_at).getTime() >= now - 60_000; return <article className={`appointment-row polished-appointment ${isNext ? "is-next-appointment" : ""}`} data-atlas-appointment-id={appointment.id} data-atlas-compact-time={formatTimeValue(toBaghdadInputValue(new Date(appointment.appointment_at)).slice(11, 16), locale)} key={appointment.id} id={`atlas-appointment-${appointment.id}`}>{isNext ? <div className="next-appointment-label">{days.nextUp}</div> : null}<div className="appointment-primary"><div className="patient-cell" data-atlas-user-content="true"><strong>{appointment.patient_name}</strong><span><bdi dir="ltr">{formatIraqiMobile(appointment.patient_phone)}</bdi></span></div><div className="appointment-badges">{order ? <span className="appointment-order-badge" title={`${days.order} #${localizeDigits(order, locale)}`} aria-label={`${days.order} ${localizeDigits(order, locale)}`}>#{localizeDigits(order, locale)}</span> : null}<span className={`status status-${status}`}>{statusLabels[status]}</span>{reminderLabel ? <span className="status status-reminder">{reminderLabel}</span> : null}</div></div><dl className="appointment-details polished-details"><div><dt>{t.time}</dt><dd className="appointment-time-value">{formatBaghdadDateTime(new Date(appointment.appointment_at), locale)}</dd></div><div><dt>{t.doctor}</dt><dd data-atlas-user-content="true">{appointment.doctor_name}</dd></div><div><dt>{t.reminderLanguage}</dt><dd>{reminderLanguageLabels[appointment.reminder_language] ?? appointment.reminder_language}</dd></div></dl>{canEditDetails ? <AppointmentEditor clinicId={clinic.id} appointmentId={appointment.id} revision={appointment.appointment_revision} status={status} patientName={appointment.patient_name} patientPhone={formatIraqiMobile(appointment.patient_phone)} contactRelationship={appointment.contact_relationship as "patient" | "parent_guardian" | "relative_caregiver"} doctorId={appointment.doctor_id} appointmentAt={appointment.appointment_at} reminderLanguage={appointment.reminder_language} reminderConsent={appointment.reminder_consent} doctors={editorDoctors} min={toBaghdadInputValue(new Date(Math.min(minimum.getTime(), new Date(appointment.appointment_at).getTime())))} max={maximumInput} locale={locale} /> : null}<AppointmentActions clinicId={clinic.id} appointmentId={appointment.id} revision={appointment.appointment_revision} status={status} appointmentAt={appointment.appointment_at} patientName={appointment.patient_name} locale={locale} reminderLanguage={appointment.reminder_language as UiLocale} /></article>; })}</div>}
      </section>
      {canCreateOnSelectedDay ? <section className="panel appointment-composer" id="new-appointment"><div className="panel-heading composer-heading"><div><div className="eyebrow">{relativeDay ?? formatBaghdadDay(selectedDate, locale)}</div><h2>{t.newAppointment}</h2></div><span className="composer-shortcut" aria-hidden="true">+</span></div>
        {occupiedSlotsLimited ? <p className="notice workspace-notice" role="status">{days.availabilityLimited.replace("{count}", localizeDigits(OCCUPIED_SLOT_VIEW_LIMIT, locale))}</p> : null}
        <form action={createAppointment} className="stack-form appointment-form" key={`${clinic.id}:${selectedDay}:${selectedDoctor?.id ?? "none"}`}><input type="hidden" name="clinic_id" value={clinic.id} /><input type="hidden" name="return_day" value={selectedDay} /><input type="hidden" name="idempotency_key" value={randomUUID()} />
          <label htmlFor="patient_name">{t.patientName}</label><input id="patient_name" name="patient_name" autoComplete="name" minLength={2} maxLength={120} required />
          <label htmlFor="patient_phone">{t.iraqiMobile}</label><input id="patient_phone" name="patient_phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={24} pattern="(?:[+]?(?:[9٩۹][6٦۶][4٤۴])|[0٠۰])[7٧۷][0-9٠-٩۰-۹ .\(\)\-]{9,16}" placeholder="0750 000 0000" aria-describedby="phone-help" dir="ltr" required /><p className="field-help" id="phone-help">{t.phoneHelp}</p>
          <label htmlFor="contact_relationship">{contactRelationship.label}</label>
          <select id="contact_relationship" name="contact_relationship" defaultValue="" required>
            <option value="" disabled>{contactRelationship.choose}</option>
            <option value="patient">{contactRelationship.patient}</option>
            <option value="parent_guardian">{contactRelationship.guardian}</option>
            <option value="relative_caregiver">{contactRelationship.caregiver}</option>
          </select>
          <label htmlFor="doctor_id">{t.doctor}</label><input id="doctor_id" name="doctor_id" type="hidden" value={selectedDoctor?.id ?? ""} /><div className="composer-doctor-lock" aria-label={`${t.doctor}: ${selectedDoctor?.name ?? t.chooseDoctor}`}><strong data-atlas-user-content={selectedDoctor ? "true" : undefined}>{selectedDoctor?.name ?? t.chooseDoctor}</strong><span aria-hidden="true">✓</span></div>
          <AppointmentTimeField key={`time:${selectedDay}:${selectedDoctor?.id ?? "none"}`} intervalMinutes={bookingInterval} min={minimumInput} max={maximumInput} initialDate={selectedDay} occupiedByDoctor={occupiedByDoctor} timeZoneLabel={t.erbilTime} locale={locale} />
          <label htmlFor="reminder_language">{t.reminderLanguage}</label><select id="reminder_language" name="reminder_language" defaultValue={defaultReminderLanguage}>{Object.entries(reminderLanguageLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
          <label className="checkbox-field consent-card" htmlFor="reminder_consent"><input id="reminder_consent" name="reminder_consent" type="checkbox" /><span>{t.reminderConsent}</span></label><p className="field-help">{t.reminderConsentHelp}</p><SubmitButton pendingLabel={t.saving} disabled={!selectedDoctor}>{t.saveAppointment}</SubmitButton>
        </form><div className={`reminder-note ${reminderSettings?.enabled ? "reminder-ready" : ""}`}><strong>{days.reminders}: </strong>{reminderSettings?.enabled ? reminderPlanLabel(reminderSettings.lead_minutes, reminderSettings.second_lead_minutes, locale) : t.reminderOff}</div><p className="composer-privacy">{t.privacyNote}</p></section> : null}
    </div>
    <style>{`

      .clinic-command-center{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr);gap:20px;margin:12px 0 18px;padding:clamp(20px,3vw,32px);border-radius:24px;background:linear-gradient(125deg,#102b32 0%,#153e43 62%,#1c5652 100%);color:#fff;box-shadow:0 16px 35px rgba(12,45,48,.16)}
      .clinic-command-main{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;min-width:0}
      .clinic-command-main .eyebrow{color:#a7dfd1;font-size:12px;letter-spacing:.07em}
      .clinic-command-main h2{margin:12px 0 9px;font-size:clamp(25px,3vw,39px);line-height:1.12;letter-spacing:-.035em;color:#fff}
      .clinic-command-main p{max-width:43ch;margin:0;color:#d5e7e4;font-size:14px;line-height:1.65}
      .clinic-command-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
      .clinic-command-actions a{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;border-radius:12px;padding:11px 17px;font-size:13px;font-weight:800;text-decoration:none;transition:transform .15s ease,background .15s ease}
      .clinic-command-actions a:hover{transform:translateY(-1px)}
      .clinic-command-primary{background:#b8f0d9;color:#103d34}
      .clinic-command-primary:hover{background:#d3fbe9}
      .clinic-command-secondary{border:1px solid #86b9ae;background:rgba(255,255,255,.08);color:#fff}
      .clinic-command-secondary:hover{background:rgba(255,255,255,.15)}
      .clinic-command-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      .clinic-command-metrics>*{display:flex;flex-direction:column;justify-content:space-between;min-height:102px;min-width:0;border:1px solid rgba(255,255,255,.19);border-radius:15px;padding:14px 16px;background:rgba(255,255,255,.09);color:#fff;text-decoration:none}
      .clinic-command-metrics span{font-size:12px;font-weight:720;line-height:1.4;color:#d7ece7}
      .clinic-command-metrics strong{margin-top:9px;font-size:clamp(23px,2.4vw,34px);font-weight:850;line-height:1.05;letter-spacing:-.02em;color:#fff}
      .clinic-command-active{background:rgba(169,242,212,.18)!important;border-color:rgba(169,242,212,.42)!important}
      .clinic-command-metric:hover{background:rgba(255,255,255,.17)}
      .clinic-command-next strong{font-size:clamp(21px,2.1vw,29px)}
      .clinic-priority-board{display:grid;gap:17px;margin:0 0 18px;padding:clamp(18px,2.4vw,25px);border:1px solid var(--line-strong);border-radius:22px;background:var(--surface);box-shadow:var(--shadow-sm)}
      .clinic-priority-heading .eyebrow{color:var(--accent);font-size:11px;font-weight:850}
      .clinic-priority-heading h2{margin:5px 0 5px;font-size:clamp(22px,2.3vw,29px);line-height:1.2;letter-spacing:-.025em;color:var(--ink)}
      .clinic-priority-heading p{margin:0;color:var(--ink-soft);font-size:13px;line-height:1.5}
      .clinic-priority-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .clinic-priority-card{display:flex;min-width:0;flex-direction:column;gap:12px;border:1px solid var(--line);border-top:4px solid var(--accent);border-radius:16px;padding:16px;background:var(--surface-soft)}
      .clinic-priority-card.is-attendance{border-top-color:var(--warning)}
      .clinic-priority-card.is-finish{border-top-color:var(--success)}
      .clinic-priority-top{display:flex;justify-content:space-between;align-items:start;gap:10px}
      .clinic-priority-top strong{font-size:13px;font-weight:850;color:var(--ink);line-height:1.4}
      .clinic-priority-top span{font-size:11px;color:var(--ink-soft);text-align:end}
      .clinic-priority-patient{display:flex;min-width:0;justify-content:space-between;gap:10px;align-items:baseline;border-radius:9px;color:var(--ink);text-decoration:none;font-size:17px;font-weight:850}
      .clinic-priority-patient span{min-width:0;overflow-wrap:anywhere}
      .clinic-priority-patient bdi{flex:none;color:var(--accent);font-size:15px;font-weight:850}
      .clinic-priority-card p{margin:0;min-height:37px;color:var(--ink-soft);font-size:12px;line-height:1.5}
      .clinic-priority-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:auto}
      .clinic-priority-actions .clinic-arrival-quick{flex:1;min-width:min(100%,165px);max-width:none}
      .clinic-priority-actions>a{display:inline-flex;align-items:center;min-height:44px;color:var(--accent);font-size:12px;font-weight:800;text-decoration:underline;text-underline-offset:3px}
      .clinic-priority-actions a:focus-visible,.clinic-priority-patient:focus-visible{outline:3px solid #ca8221;outline-offset:3px}
      @media(max-width:1020px){.clinic-priority-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:700px){.clinic-priority-grid{grid-template-columns:1fr}.clinic-priority-card{padding:14px}.clinic-priority-card p{min-height:0}.clinic-priority-actions .clinic-arrival-quick{flex:1 1 175px}}
      .clinic-arrival-disclosure{margin:0 0 18px;border:1px solid var(--line-strong);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-sm);overflow:hidden}
      .clinic-arrival-disclosure-summary{display:flex;align-items:center;gap:12px;min-height:66px;padding:12px 17px;cursor:pointer;list-style:none}
      .clinic-arrival-disclosure-summary::-webkit-details-marker{display:none}
      .clinic-arrival-disclosure-label{flex:1;min-width:0;color:var(--ink);font-size:15px;font-weight:850}
      .clinic-arrival-disclosure-counts{display:flex;flex-wrap:wrap;gap:6px 12px;color:var(--ink-soft);font-size:12px;line-height:1.45}
      .clinic-arrival-disclosure-counts strong{color:var(--ink);font-size:13px}
      .clinic-arrival-disclosure-chevron{flex:none;color:var(--accent);font-size:24px;font-weight:800;transition:transform .15s}
      .clinic-arrival-disclosure[open] .clinic-arrival-disclosure-chevron{transform:rotate(180deg)}
      .clinic-arrival-disclosure-summary:focus-visible{outline:3px solid #ca8221;outline-offset:-3px;border-radius:16px}
      .clinic-arrival-disclosure .clinic-arrival-board{margin:0;border:0;border-top:1px solid var(--line);border-radius:0;box-shadow:none}
      @media(max-width:700px){.clinic-arrival-disclosure-summary{flex-wrap:wrap;gap:6px 12px}.clinic-arrival-disclosure-label{flex-basis:calc(100% - 40px)}.clinic-arrival-disclosure-counts{order:3;width:100%}.clinic-arrival-disclosure-chevron{margin-inline-start:auto}}
      .clinic-arrival-board{display:grid;gap:16px;margin:0 0 18px;padding:clamp(17px,2.2vw,24px);border:1px solid var(--line);border-radius:22px;background:linear-gradient(130deg,var(--surface-soft),var(--surface))}
      .clinic-arrival-heading h2{margin:5px 0 4px;font-size:clamp(20px,2vw,25px);letter-spacing:-.025em;line-height:1.2;color:var(--ink)}
      .clinic-arrival-heading p{margin:0;color:var(--ink-soft);font-size:13px;line-height:1.5}
      .clinic-arrival-heading .eyebrow{font-size:11px;font-weight:800;color:var(--accent)}
      .clinic-arrival-lanes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .clinic-arrival-lane{min-width:0;border:1px solid var(--line);border-radius:17px;padding:15px;background:var(--surface)}
      .clinic-arrival-lane.is-pending{border-top:4px solid var(--warning)}
      .clinic-arrival-lane.is-confirmed{border-top:4px solid var(--success)}
      .clinic-arrival-lane-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px}
      .clinic-arrival-lane-heading h3{display:flex;align-items:center;gap:9px;min-width:0;margin:0;font-size:14px;font-weight:850;line-height:1.35;color:var(--ink)}
      .clinic-arrival-count{display:grid;min-width:30px;min-height:30px;place-items:center;border-radius:9px;background:var(--accent-soft);color:var(--accent);font-size:15px;font-weight:900}
      .clinic-arrival-lane.is-pending .clinic-arrival-count{background:var(--warning-bg);color:var(--warning)}
      .clinic-arrival-lane-heading>a{flex:none;color:var(--accent);font-size:12px;font-weight:800;text-decoration:underline;text-underline-offset:3px}
      .clinic-arrival-items{display:grid;gap:7px;margin:0;padding:0;list-style:none}
      .clinic-arrival-items li{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:9px;border:1px solid var(--line);border-radius:12px;padding:8px;background:var(--surface-soft)}
      .clinic-arrival-items a{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:4px 10px;min-height:64px;border-radius:10px;padding:9px;color:var(--ink);background:var(--surface-soft);text-decoration:none;transition:border-color .15s,background .15s}
      .clinic-arrival-items a:hover{border-color:var(--accent);background:var(--accent-faint)}
      .clinic-arrival-patient{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:850}
      .clinic-arrival-time{font-size:14px;font-weight:850;color:var(--accent)}
      .clinic-arrival-open{grid-column:1/-1;font-size:11px;font-weight:700;color:var(--ink-soft)}
      .clinic-arrival-quick{display:grid;justify-items:stretch;gap:5px;max-width:210px}
      .clinic-arrival-quick-button{min-height:46px;border:1px solid var(--accent);border-radius:11px;padding:9px 13px;background:var(--accent);color:#fff;font:inherit;font-size:12px;font-weight:850;line-height:1.3;cursor:pointer;touch-action:manipulation}
      .clinic-arrival-quick-button:hover:not(:disabled){filter:brightness(1.08)}
      .clinic-arrival-quick-button:disabled{cursor:not-allowed;opacity:.58}
      .clinic-arrival-quick-button:focus-visible{outline:3px solid #ca8221;outline-offset:3px}
      .clinic-arrival-quick-hint{font-size:11px;line-height:1.4;color:var(--ink-soft)}
      .clinic-arrival-quick-error{font-size:11px;line-height:1.4;color:var(--danger);max-width:200px}
      @media(max-width:1100px){.clinic-arrival-items li{grid-template-columns:1fr}.clinic-arrival-quick{max-width:none}.clinic-arrival-quick-button{width:100%}}
      .clinic-arrival-empty{margin:0;border-radius:12px;padding:16px;background:var(--surface-soft);color:var(--ink-soft);font-size:13px;line-height:1.5}
      .clinic-arrival-lane a:focus-visible{outline:3px solid #ca8221;outline-offset:3px}
      .appointment-row[id^="atlas-appointment-"]{scroll-margin-top:90px}
      .appointment-row:target{outline:3px solid #178060;outline-offset:3px;box-shadow:0 0 0 7px rgba(23,128,96,.12)}
      @media(max-width:700px){.clinic-arrival-lanes{grid-template-columns:1fr}.clinic-arrival-board{border-radius:18px}.clinic-arrival-lane{padding:13px}.clinic-arrival-items li{grid-template-columns:1fr}.clinic-arrival-items a{min-height:60px}.clinic-arrival-quick{max-width:none}.clinic-arrival-quick-button{width:100%}}
      .schedule-focus{display:flex;flex-wrap:wrap;align-items:center;gap:10px 15px;margin:0 0 14px;padding:11px 14px;border:1px solid var(--line);border-radius:14px;background:var(--surface-soft)}
      .schedule-focus-label{font-size:13px;font-weight:800;color:var(--ink);white-space:nowrap}
      .schedule-focus-options{display:flex;flex-wrap:wrap;gap:7px}
      .schedule-focus-options a{display:inline-flex;align-items:center;min-height:44px;border:1px solid var(--line-strong);border-radius:10px;padding:9px 12px;background:var(--surface);color:var(--ink);font-size:13px;font-weight:750;line-height:1.3;text-decoration:none}
      .schedule-focus-options a.is-selected{border-color:#166f5c;background:#e9f6ef;color:#125b4b;box-shadow:inset 0 0 0 1px #166f5c}
      .schedule-focus-options a:focus-visible,.clinic-command-actions a:focus-visible,.clinic-command-metric:focus-visible{outline:3px solid #f1c85c;outline-offset:3px}
      @media(max-width:900px){.clinic-command-center{grid-template-columns:1fr}.clinic-command-metrics>*{min-height:94px}}
      @media(max-width:600px){.clinic-command-center{padding:19px;border-radius:19px;gap:19px}.clinic-command-main h2{font-size:27px}.clinic-command-actions{width:100%}.clinic-command-actions a{flex:1 1 160px}.clinic-command-metrics>*{min-height:89px;padding:12px}.clinic-command-metrics strong{font-size:27px}.schedule-focus{padding:11px}.schedule-focus-label{width:100%}.schedule-focus-options{display:grid;width:100%;grid-template-columns:repeat(2,minmax(0,1fr))}.schedule-focus-options a{justify-content:center;min-width:0;text-align:center;padding:8px 10px;overflow-wrap:anywhere}}
      .workspace-grid.is-read-only-day{grid-template-columns:1fr}
      .workspace-grid.is-read-only-day .appointments-panel{min-width:0}
      .schedule-summary{grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
      .schedule-summary .schedule-stat{position:relative;min-height:82px;padding:15px 16px;overflow:hidden}
      .schedule-summary .schedule-stat::before{content:"";position:absolute;inset-block:0;inset-inline-start:0;width:4px;background:#dbe4df}
      .schedule-summary .schedule-stat-pending{background:#fffaf0;border-color:#eadfbe}
      .schedule-summary .schedule-stat-pending::before{background:#d4ad43}
      .schedule-summary .schedule-stat-confirmed{background:#f3faf7;border-color:#cfe5db}
      .schedule-summary .schedule-stat-confirmed::before{background:#3f9b79}
      .schedule-summary .schedule-stat-completed{background:#f7f9f8;border-color:#dbe2de}
      .schedule-summary .schedule-stat-completed::before{background:#7d9188}
      .schedule-summary .schedule-stat span{font-size:11px;line-height:1.35}
      .schedule-summary .schedule-stat strong{margin-top:5px;font-size:27px}
      .schedule-count-box{display:grid;min-width:122px;min-height:68px;align-content:center;justify-items:center;gap:4px;border:1px solid #bdddd1;border-radius:15px;padding:9px 16px;background:#f0faf6;color:var(--ink);box-shadow:0 3px 12px rgba(8,119,90,.07)}
      .schedule-count-box span{font-size:10.5px;font-weight:800;line-height:1.25;color:var(--ink-soft);white-space:nowrap}
      .schedule-count-box strong{font-size:29px;font-weight:900;line-height:1;color:var(--accent)}
      .composer-doctor-lock{display:flex;min-height:46px;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--line-strong);border-radius:12px;padding:10px 13px;background:var(--surface-soft);color:var(--ink)}
      .composer-doctor-lock strong{font-size:14px;font-weight:780}
      .composer-doctor-lock span{display:grid;width:24px;height:24px;place-items:center;border-radius:999px;background:var(--accent-soft);color:var(--accent);font-size:11px;font-weight:900}
      @media(max-width:900px){.schedule-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:520px){.schedule-summary{gap:8px}.schedule-summary .schedule-stat{min-height:76px;padding:13px 14px}.schedule-summary .schedule-stat strong{font-size:24px}.schedule-count-box{min-width:104px;min-height:62px;padding:8px 12px}.schedule-count-box span{font-size:10px}.schedule-count-box strong{font-size:26px}}
    `}</style>
    {multiDoctor ? <style>{`
      .doctor-schedule-tabs{display:flex;gap:8px;overflow-x:auto;margin:4px 0 14px;padding:1px 0 4px;scrollbar-width:none}
      .doctor-schedule-tabs::-webkit-scrollbar{display:none}
      .doctor-schedule-tabs a{display:inline-flex;flex:0 0 auto;min-height:42px;align-items:center;gap:9px;border:1px solid var(--line-strong);border-radius:999px;padding:8px 13px;background:#fff;color:var(--ink-soft);text-decoration:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      .doctor-schedule-tabs a strong{font-size:12px}
      .doctor-schedule-tabs a span{display:inline-grid;min-width:23px;height:23px;place-items:center;border-radius:999px;background:var(--surface-soft);font-size:10px;font-weight:850}
      .doctor-schedule-tabs a.is-selected{border-color:rgba(8,119,90,.28);background:var(--accent-soft);color:var(--accent);box-shadow:0 2px 10px rgba(8,119,90,.08)}
      .doctor-schedule-tabs a.is-selected span{background:#fff}
    `}</style> : null}
  </main>;
}

function Stat({ label, value, tone, locale }: { label: string; value: number; tone: "total" | "pending" | "confirmed" | "completed" | "no-show" | "cancelled"; locale: UiLocale }) { return <article className={`stat schedule-stat schedule-stat-${tone}`}><span>{label}</span><strong>{localizeDigits(value, locale)}</strong></article>; }
function DashboardError({ locale }: { locale: UiLocale }) { const copy = dashboardErrorCopy[locale]; return <main className="center-page"><section className="auth-card"><div className="brand">Atlas</div><h1>{copy.title}</h1><p className="quiet">{copy.help}</p></section></main>; }
