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
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/app/components/submit-button";
import { createAppointment, createClinic } from "./actions";
import { AppointmentActions } from "./appointment-actions";
import { AppointmentEditor } from "./appointment-editor";
import { AppointmentTimeField } from "./appointment-time-field";
import { LiveClinicClock } from "./live-clinic-clock";

export const dynamic = "force-dynamic";

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

type DashboardPageProps = {
  searchParams: Promise<{ clinic?: string; day?: string; doctor?: string; error?: string; notice?: string }>;
};

const dayCopy: Record<UiLocale, {
  previous: string; today: string; yesterday: string; tomorrow: string; next: string; nextUp: string;
  appointments: string; empty: string; emptyHelp: string; add: string; reminders: string; order: string; quickDates: string; doctorSchedules: string;
}> = {
  en: { previous: "Previous", today: "Today", yesterday: "Yesterday", tomorrow: "Tomorrow", next: "Next", nextUp: "Next appointment", appointments: "Appointments", empty: "No appointments on this day.", emptyHelp: "Add an appointment when the first patient calls or walks in.", add: "Add appointment", reminders: "Patient reminders", order: "Appointment order", quickDates: "Quick schedule dates", doctorSchedules: "Doctor schedules" },
  ku: { previous: "پێشوو", today: "ئەمڕۆ", yesterday: "دوێنێ", tomorrow: "سبەی", next: "داهاتوو", nextUp: "وادەی داهاتوو", appointments: "وادەکان", empty: "لەم ڕۆژە هیچ وادەیەک نییە.", emptyHelp: "کاتێک یەکەم نەخۆش پەیوەندی کرد یان هات، وادەکە زیاد بکە.", add: "وادە زیاد بکە", reminders: "بیرخستنەوەی نەخۆش", order: "ڕیزی وادە", quickDates: "ڕۆژە خێراکان", doctorSchedules: "خشتەی پزیشکەکان" },
  bd: { previous: "بەرێ", today: "ئەڤرۆ", yesterday: "دووهی", tomorrow: "سبەهێ", next: "پاش", nextUp: "وادەیا پاش", appointments: "وادە", empty: "ل ڤێ ڕۆژێ چ وادە نینن.", emptyHelp: "دەمێ نەخۆشێ ئێکێ پەیوەندی دکەت یان دهێت، وادەیێ زێدە بکە.", add: "وادە زێدە بکە", reminders: "بیرخستنەوەیێن نەخۆشی", order: "ڕێزا وادەیان", quickDates: "ڕۆژێن خێرا", doctorSchedules: "خشتەیێن دکتۆران" },
  ar: { previous: "السابق", today: "اليوم", yesterday: "أمس", tomorrow: "باچر", next: "التالي", nextUp: "الموعد التالي", appointments: "المواعيد", empty: "ماكو مواعيد بهذا اليوم.", emptyHelp: "ضيف موعد من يتصل أول مريض أو يوصل للعيادة.", add: "إضافة موعد", reminders: "تذكيرات المرضى", order: "ترتيب الموعد", quickDates: "أيام سريعة", doctorSchedules: "جداول الأطباء" },
};

const summaryCopy: Record<UiLocale, {
  all: string;
  notConfirmed: string;
  confirmed: string;
  completed: string;
}> = {
  en: { all: "All appointments", notConfirmed: "Attendance not confirmed", confirmed: "Attendance confirmed", completed: "Visit completed" },
  ku: { all: "هەموو مەوعیدەکان", notConfirmed: "هاتن پشتڕاست نەکراوە", confirmed: "هاتن پشتڕاستکراوە", completed: "سەردان تەواوبوو" },
  bd: { all: "هەمی مەوعید", notConfirmed: "هاتن نەهاتیە پشتڕاستکرن", confirmed: "هاتن پشتڕاستکریە", completed: "سەردان تەمام بوو" },
  ar: { all: "كل المواعيد", notConfirmed: "الحضور غير مؤكد", confirmed: "الحضور مؤكد", completed: "انتهت الزيارة" },
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

function scheduleHref(clinicId: string, day: string, doctorId?: string | null) {
  const params = new URLSearchParams({ clinic: clinicId, day });
  if (doctorId) params.set("doctor", doctorId);
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
  const messageError = getDashboardMessage(params.error);
  const notice = getDashboardMessage(params.notice);
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: clinics, error: clinicsError } = await supabase.from("clinics").select("id, name, owner_id, appointment_interval_minutes").order("created_at", { ascending: true });
  if (clinicsError) return <DashboardError />;
  if (!clinics?.length) {
    return <main className="center-page"><section className="auth-card setup-card"><div className="app-brand setup-brand"><span className="app-brand-mark" aria-hidden="true">A</span><span>Atlas</span></div><div className="eyebrow">{t.firstSetup}</div><h1>{t.clinicSetup}</h1><p className="quiet">{t.useSynthetic}</p>{messageError ? <p className="notice notice-error" role="alert">{messageError}</p> : null}<form action={createClinic} className="stack-form"><label htmlFor="name">{t.clinicName}</label><input id="name" name="name" minLength={2} maxLength={120} autoComplete="organization" required /><SubmitButton pendingLabel={t.saving}>{t.createWorkspace}</SubmitButton></form></section></main>;
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

  const [
    { data: membership, error: membershipError },
    { data: appointments, error: appointmentError },
    { data: occupiedAppointments, error: occupiedError },
    { data: reminderSettings },
    { data: doctorWorkflowRows, error: workflowError },
    { data: doctors, error: doctorsError },
  ] = await Promise.all([
    supabase.from("clinic_members").select("role, assigned_doctor_id").eq("clinic_id", clinic.id).eq("user_id", userData.user.id).maybeSingle(),
    supabase.from("appointments").select("id, patient_name, patient_phone, doctor_id, doctor_name, appointment_at, created_at, status, reminder_status, reminder_language, reminder_consent").eq("clinic_id", clinic.id).is("voided_at", null).gte("appointment_at", dayStart).lt("appointment_at", dayEnd).order("appointment_at", { ascending: true }).order("created_at", { ascending: true }).order("id", { ascending: true }).limit(500),
    supabase.from("appointments").select("doctor_id, appointment_at").eq("clinic_id", clinic.id).is("voided_at", null).in("status", ["pending", "confirmed"]).gte("appointment_at", new Date(now - 5 * 60 * 1000).toISOString()).order("appointment_at", { ascending: true }).limit(5000),
    supabase.from("clinic_reminder_settings").select("enabled, lead_minutes, second_lead_minutes, default_reminder_language").eq("clinic_id", clinic.id).maybeSingle(),
    (supabase as any).from("doctor_workflow_settings").select("doctor_id, default_reminder_language").eq("clinic_id", clinic.id),
    supabase.from("doctors").select("id, name, active, display_order").eq("clinic_id", clinic.id).order("display_order", { ascending: true }).order("name", { ascending: true }),
  ]);
  if (membershipError || appointmentError || occupiedError || workflowError || doctorsError) return <DashboardError />;

  const canMonitorDoctors = clinic.owner_id === userData.user.id || membership?.role === "owner" || membership?.role === "manager";
  const rows = appointments ?? [];
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
  const defaultReminderLanguage = (doctorWorkflowRows ?? []).find((row: { doctor_id: string; default_reminder_language: string }) => row.doctor_id === selectedDoctor?.id)?.default_reminder_language ?? reminderSettings?.default_reminder_language ?? "ku";
  const visibleRows = multiDoctor && selectedDoctor
    ? rows.filter((row) => row.doctor_id === selectedDoctor.id)
    : rows;

  const confirmed = visibleRows.filter((row) => row.status === "confirmed").length;
  const pending = visibleRows.filter((row) => row.status === "pending").length;
  const completed = visibleRows.filter((row) => row.status === "completed").length;

  const appointmentOrder = new Map<string, number>();
  let activeOrder = 0;
  for (const row of visibleRows) {
    if (row.status !== "pending" && row.status !== "confirmed") continue;
    activeOrder += 1;
    appointmentOrder.set(row.id, activeOrder);
  }

  const previousDay = shiftBaghdadDay(selectedDay, -1);
  const nextDay = shiftBaghdadDay(selectedDay, 1);
  const nextAppointmentId = selectedDay === today ? visibleRows.find((row) => ["pending", "confirmed"].includes(row.status) && new Date(row.appointment_at).getTime() >= now - 5 * 60 * 1000)?.id ?? null : null;

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
  const maximum = new Date(now + 2 * 365 * 24 * 60 * 60 * 1000);
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
    <header className="workspace-header"><div className="workspace-title-block"><div className="eyebrow">{t.schedule}</div><h1>{clinic.name}</h1></div><LiveClinicClock locale={locale} /></header>
    <nav className="schedule-date-shortcuts" aria-label={days.quickDates}>
      {quickDays.map((item) => <a className={item.day === selectedDay ? "is-selected" : ""} href={scheduleHref(clinic.id, item.day, selectedDoctorId)} key={item.day} aria-current={item.day === selectedDay ? "date" : undefined}>{item.label}</a>)}
    </nav>
    <nav className="day-navigation" aria-label={days.appointments}>
      <a className="button button-ghost button-small" href={scheduleHref(clinic.id, previousDay, selectedDoctorId)} aria-label={days.previous}>‹ <span>{days.previous}</span></a>
      <a className={`day-current ${selectedDay === today ? "is-today" : ""} ${relativeDay ? "has-relative-day" : ""}`} href={scheduleHref(clinic.id, today, selectedDoctorId)}><strong>{formatBaghdadDay(selectedDate, locale)}</strong>{relativeDay ? <span data-atlas-relative-day="true">{relativeDay}</span> : null}</a>
      <a className="button button-ghost button-small" href={scheduleHref(clinic.id, nextDay, selectedDoctorId)} aria-label={days.next}><span>{days.next}</span> ›</a>
    </nav>
    {clinics.length > 1 ? <form className="clinic-switcher workspace-switcher" method="get"><label htmlFor="clinic">{t.clinicWorkspace}</label><input type="hidden" name="day" value={selectedDay} /><select id="clinic" name="clinic" defaultValue={clinic.id}>{clinics.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><button className="button button-ghost button-small" type="submit">{t.switch}</button></form> : null}
    {multiDoctor ? <nav className="doctor-schedule-tabs" aria-label={days.doctorSchedules}>{activeDoctors.map((doctor) => { const count = rows.filter((row) => row.doctor_id === doctor.id).length; const selected = doctor.id === selectedDoctor?.id; return <a href={scheduleHref(clinic.id, selectedDay, doctor.id)} className={selected ? "is-selected" : ""} aria-current={selected ? "page" : undefined} key={doctor.id}><strong>{doctor.name}</strong><span>{count}</span></a>; })}</nav> : null}
    {messageError || selectionError ? <p className="notice notice-error workspace-notice" role="alert">{messageError ?? selectionError}</p> : null}{notice ? <p className="notice notice-success workspace-notice" role="status">{notice}</p> : null}
    <section className="stats workspace-stats schedule-summary" aria-label={days.appointments}><Stat label={summary.all} value={visibleRows.length} tone="total" /><Stat label={summary.notConfirmed} value={pending} tone="pending" /><Stat label={summary.confirmed} value={confirmed} tone="confirmed" /><Stat label={summary.completed} value={completed} tone="completed" /></section>
    <div className={`workspace-grid ${canCreateOnSelectedDay ? "" : "is-read-only-day"}`}>
      {canCreateOnSelectedDay ? <section className="panel appointment-composer" id="new-appointment"><div className="panel-heading composer-heading"><div><div className="eyebrow">{relativeDay ?? formatBaghdadDay(selectedDate, locale)}</div><h2>{t.newAppointment}</h2></div><span className="composer-shortcut" aria-hidden="true">+</span></div>
        <form action={createAppointment} className="stack-form appointment-form" key={`${clinic.id}:${selectedDay}:${selectedDoctor?.id ?? "none"}`}><input type="hidden" name="clinic_id" value={clinic.id} /><input type="hidden" name="return_day" value={selectedDay} /><input type="hidden" name="idempotency_key" value={randomUUID()} />
          <label htmlFor="patient_name">{t.patientName}</label><input id="patient_name" name="patient_name" autoComplete="name" minLength={2} maxLength={120} required />
          <label htmlFor="patient_phone">{t.iraqiMobile}</label><input id="patient_phone" name="patient_phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={24} pattern="(?:[+]?(?:964)|0)7[0-9 ()-]{9,16}" placeholder="0750 000 0000" aria-describedby="phone-help" dir="ltr" required /><p className="field-help" id="phone-help">{t.phoneHelp}</p>
          <label htmlFor="doctor_id">{t.doctor}</label><input id="doctor_id" name="doctor_id" type="hidden" value={selectedDoctor?.id ?? ""} /><div className="composer-doctor-lock" aria-label={`${t.doctor}: ${selectedDoctor?.name ?? t.chooseDoctor}`}><strong>{selectedDoctor?.name ?? t.chooseDoctor}</strong><span aria-hidden="true">✓</span></div>
          <AppointmentTimeField key={`time:${selectedDay}:${selectedDoctor?.id ?? "none"}`} intervalMinutes={clinic.appointment_interval_minutes} min={minimumInput} max={maximumInput} initialDate={selectedDay} occupiedByDoctor={occupiedByDoctor} timeZoneLabel={t.erbilTime} locale={locale} />
          <label htmlFor="reminder_language">{t.reminderLanguage}</label><select id="reminder_language" name="reminder_language" defaultValue={defaultReminderLanguage}>{Object.entries(reminderLanguageLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
          <label className="checkbox-field consent-card" htmlFor="reminder_consent"><input id="reminder_consent" name="reminder_consent" type="checkbox" /><span>{t.reminderConsent}</span></label><p className="field-help">{t.reminderConsentHelp}</p><SubmitButton pendingLabel={t.saving} disabled={!selectedDoctor}>{t.saveAppointment}</SubmitButton>
        </form><div className={`reminder-note ${reminderSettings?.enabled ? "reminder-ready" : ""}`}><strong>{days.reminders}: </strong>{reminderSettings?.enabled ? reminderPlanLabel(reminderSettings.lead_minutes, reminderSettings.second_lead_minutes, locale) : t.reminderOff}</div><p className="composer-privacy">{t.privacyNote}</p></section> : null}
      <section className="panel appointments-panel schedule-card"><div className="panel-heading schedule-heading"><div><div className="eyebrow">{relativeDay ?? t.schedule}</div><h2>{formatBaghdadDay(selectedDate, locale)}</h2><p className="panel-subtitle">{selectedDoctor?.name ?? t.todaySubheading}</p></div><div className="schedule-count-box" aria-label={`${days.appointments}: ${visibleRows.length}`}><span>{days.appointments}</span><strong>{visibleRows.length}</strong></div></div>
        {visibleRows.length === 0 ? <div className="empty-state compact-empty"><div><strong>{days.empty}</strong><span>{days.emptyHelp}</span>{canCreateOnSelectedDay && selectedDoctor ? <a className="button button-small empty-state-action" href="#new-appointment">+ {days.add}</a> : null}</div></div> : <div className="appointment-list polished-appointment-list">{visibleRows.map((appointment) => { const status = isAppointmentStatus(appointment.status) ? appointment.status : "pending"; const editorDoctors = doctorRows.filter((doctor) => doctor.active || doctor.id === appointment.doctor_id).map((doctor) => ({ id: doctor.id, name: doctor.name })); const isNext = appointment.id === nextAppointmentId; const reminderLabel = reminderLabels[appointment.reminder_status]; const order = appointmentOrder.get(appointment.id); const canEditDetails = new Date(appointment.appointment_at).getTime() >= now - 60_000; return <article className={`appointment-row polished-appointment ${isNext ? "is-next-appointment" : ""}`} data-atlas-compact-time={formatTimeValue(toBaghdadInputValue(new Date(appointment.appointment_at)).slice(11, 16), locale)} key={appointment.id}>{isNext ? <div className="next-appointment-label">{days.nextUp}</div> : null}<div className="appointment-primary"><div className="patient-cell"><strong>{appointment.patient_name}</strong><span><bdi dir="ltr">{formatIraqiMobile(appointment.patient_phone)}</bdi></span></div><div className="appointment-badges">{order ? <span className="appointment-order-badge" title={`${days.order} #${order}`} aria-label={`${days.order} ${order}`}>#{order}</span> : null}<span className={`status status-${status}`}>{statusLabels[status]}</span>{reminderLabel ? <span className="status status-reminder">{reminderLabel}</span> : null}</div></div><dl className="appointment-details polished-details"><div><dt>{t.time}</dt><dd className="appointment-time-value">{formatBaghdadDateTime(new Date(appointment.appointment_at), locale)}</dd></div><div><dt>{t.doctor}</dt><dd>{appointment.doctor_name}</dd></div><div><dt>{t.reminderLanguage}</dt><dd>{reminderLanguageLabels[appointment.reminder_language] ?? appointment.reminder_language}</dd></div></dl>{canEditDetails ? <AppointmentEditor clinicId={clinic.id} appointmentId={appointment.id} status={status} patientName={appointment.patient_name} patientPhone={formatIraqiMobile(appointment.patient_phone)} doctorId={appointment.doctor_id} appointmentAt={appointment.appointment_at} reminderLanguage={appointment.reminder_language} reminderConsent={appointment.reminder_consent} doctors={editorDoctors} min={minimumInput} max={maximumInput} locale={locale} /> : null}<AppointmentActions clinicId={clinic.id} appointmentId={appointment.id} status={status} appointmentAt={appointment.appointment_at} locale={locale} /></article>; })}</div>}
      </section>
    </div>
    <style>{`
      .workspace-grid.is-read-only-day{grid-template-columns:1fr}
      .workspace-grid.is-read-only-day .appointments-panel{min-width:0}
      .schedule-summary{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
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

function Stat({ label, value, tone }: { label: string; value: number; tone: "total" | "pending" | "confirmed" | "completed" }) { return <article className={`stat schedule-stat schedule-stat-${tone}`}><span>{label}</span><strong>{value}</strong></article>; }
function DashboardError() { return <main className="center-page"><section className="auth-card"><div className="brand">Atlas</div><h1>Atlas could not load this clinic.</h1><p className="quiet">Refresh once. If it continues, check the clinic connection before entering any patient details.</p></section></main>; }
