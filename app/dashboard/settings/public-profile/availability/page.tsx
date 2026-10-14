import Link from "next/link";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { baghdadDate } from "@/lib/i18n/config";
import { formatLocalDateValue } from "@/lib/i18n/format";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/app/components/submit-button";
import { PublicBookingWeekForm } from "./public-booking-week-form";
import {
  saveDoctorPublicBookingHours,
  savePublicBookingSettings,
  setDoctorPublicClosedDate,
} from "./actions";

export const dynamic = "force-dynamic";

type AvailabilitySettingsProps = {
  searchParams: Promise<{ clinic?: string; error?: string; notice?: string }>;
};

const weekdayOrder = [0, 1, 2, 3, 4, 5, 6] as const;

const copy: Record<UiLocale, {
  eyebrow: string;
  title: string;
  intro: string;
  back: string;
  clinicSettings: string;
  clinicSettingsHelp: string;
  enable: string;
  enableHelp: string;
  lead: string;
  leadHelp: string;
  horizon: string;
  horizonHelp: string;
  save: string;
  doctors: string;
  doctorsHelp: string;
  publicHours: string;
  publicHoursHelp: string;
  closedDates: string;
  closedDatesHelp: string;
  closeDate: string;
  startTime: string;
  endTime: string;
  closedDateInput: string;
  reopen: string;
  saved: string;
  invalid: string;
  doctorUnavailable: string;
  saveFailed: string;
  timezone: string;
  inactiveHelp: string;
  dayOn: string;
  dayOff: string;
  invalidRange: string;
  configuredDays: string;
  noDoctors: string;
  noClosedDates: string;
  weekdays: readonly string[];
}> = {
  en: {
    eyebrow: "Public availability",
    title: "Online booking hours",
    intro: "Define only the hours patients may book themselves. Reception can still schedule outside these hours.",
    back: "Back to public profile",
    clinicSettings: "Booking rules",
    clinicSettingsHelp: "Public booking stays off until you explicitly enable it.",
    enable: "Enable public availability",
    enableHelp: "This only exposes slots when the clinic and doctor profiles are also published.",
    lead: "Minimum notice (minutes)",
    leadHelp: "Do not offer a slot that starts sooner than this.",
    horizon: "Booking horizon (days)",
    horizonHelp: "How far ahead patients may see public slots.",
    save: "Save",
    doctors: "Doctor hours",
    doctorsHelp: "V1 supports one public-booking window per doctor per weekday.",
    publicHours: "Public-booking hours",
    publicHoursHelp: "Turning a day off here does not affect receptionist scheduling.",
    closedDates: "Closed dates",
    closedDatesHelp: "Hide a specific date from public booking without cancelling existing appointments.",
    closeDate: "Close date",
    startTime: "Start time",
    endTime: "End time",
    closedDateInput: "Closed date",
    reopen: "Reopen",
    saved: "Public availability settings saved.",
    invalid: "Check the availability settings and try again.",
    doctorUnavailable: "That doctor is unavailable for public booking settings.",
    saveFailed: "The availability settings could not be saved.",
    timezone: "Times use Erbil / Baghdad local time.",
    inactiveHelp: "After saving, days switched off are not offered online. Their saved hours are kept for later.",
    dayOn: "On",
    dayOff: "Off",
    invalidRange: "{day}: end time must be later than start time.",
    configuredDays: "Saved days on: {count} of 7",
    noDoctors: "No active doctors are available to configure yet.",
    noClosedDates: "No upcoming closed dates.",
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  },
  ku: {
    eyebrow: "بەردەستبوونی گشتی",
    title: "کاتەکانی مەوعیدی ئۆنلاین",
    intro: "تەنها ئەو کاتانە دیاری بکە کە نەخۆش دەتوانێت خۆی مەوعید دابنێت. ڕیسێپشن هێشتا دەتوانێت لە دەرەوەی ئەم کاتانە مەوعید دابنێت.",
    back: "گەڕانەوە بۆ پڕۆفایلی گشتی",
    clinicSettings: "یاساکانی مەوعید",
    clinicSettingsHelp: "مەوعیدی گشتی ناچالاک دەمێنێتەوە تا خۆت چالاکی بکەیت.",
    enable: "بەردەستبوونی گشتی چالاک بکە",
    enableHelp: "تەنها کاتێک کاتەکان دەردەکەون کە پڕۆفایلی کلینیک و پزیشکیش بڵاوکراوەبن.",
    lead: "کەمترین پێش‌ئاگاداری (خولەک)",
    leadHelp: "کاتێک کە زووتر لەم ماوەیە دەستپێدەکات پیشان مەدە.",
    horizon: "ماوەی داهاتوو (ڕۆژ)",
    horizonHelp: "نەخۆش تا چەند ڕۆژ داهاتوو بتوانێت کات ببینێت.",
    save: "پاشەکەوت",
    doctors: "کاتەکانی پزیشک",
    doctorsHelp: "لە وەشانی یەکەمدا بۆ هەر ڕۆژێک یەک ماوەی مەوعیدی گشتی هەیە.",
    publicHours: "کاتەکانی مەوعیدی گشتی",
    publicHoursHelp: "ناچالاککردنی ڕۆژێک لێرە کاری ڕیسێپشن ناگۆڕێت.",
    closedDates: "ڕۆژە داخراوەکان",
    closedDatesHelp: "ڕۆژێکی دیاریکراو لە مەوعیدی گشتی بشارەوە بەبێ هەڵوەشاندنەوەی مەوعیدە هەبووەکان.",
    closeDate: "داخستنی ڕۆژ",
    startTime: "کاتی دەستپێک",
    endTime: "کاتی کۆتایی",
    closedDateInput: "ڕۆژی داخستن",
    reopen: "کردنەوە",
    saved: "ڕێکخستنەکانی بەردەستبوونی گشتی پاشەکەوت کران.",
    invalid: "ڕێکخستنەکان بپشکنە و دووبارە هەوڵ بدەوە.",
    doctorUnavailable: "ئەم پزیشکە بۆ ڕێکخستنی مەوعیدی گشتی بەردەست نییە.",
    saveFailed: "ڕێکخستنەکان پاشەکەوت نەکران.",
    timezone: "کاتەکان بە کاتی هەولێر / بەغدا دیاری دەکرێن.",
    inactiveHelp: "دوای پاشەکەوتکردن، ڕۆژە ناچالاکەکان بۆ مەوعیدی ئۆنلاین پیشان نادرێن. کاتە هەڵگیراوەکانیان بۆ دواتر دەمێننەوە.",
    dayOn: "چالاک",
    dayOff: "ناچالاک",
    invalidRange: "لە {day}، کاتی کۆتایی دەبێت دوای کاتی دەستپێک بێت.",
    configuredDays: "ڕۆژە پاشەکەوتکراوە چالاکەکان: {count} لە ٧",
    noDoctors: "هێشتا هیچ پزیشکێکی چالاک نییە بۆ ڕێکخستنی کاتەکان.",
    noClosedDates: "هیچ ڕۆژێکی داخراوی داهاتوو نییە.",
    weekdays: ["یەکشەممە", "دووشەممە", "سێشەممە", "چوارشەممە", "پێنجشەممە", "هەینی", "شەممە"],
  },
  bd: {
    eyebrow: "بەردەستبوونا گشتی",
    title: "دەمێن وادەیێ ئۆنلاین",
    intro: "تەنێ وان دەمان دیار بکە کو نەخۆش دشێت بخۆ وادە دابنێت. ڕیسێپشن هێشتا دشێت ژ دەرڤەی وان دەمان وادە دابنێت.",
    back: "ڤەگەڕە پڕۆفایلا گشتی",
    clinicSettings: "یاسایێن وادەیێ",
    clinicSettingsHelp: "وادەیا گشتی ناچالاک دمینیت هەتا تو بخۆ چالاک دکەی.",
    enable: "بەردەستبوونا گشتی چالاک بکە",
    enableHelp: "تەنێ دەمێ پڕۆفایلا کلینیکێ و دکتۆری ژی بڵاوکرین دەم دێ دیار بن.",
    lead: "کێمترین ئاگەهداری (خولەک)",
    leadHelp: "دەمەکێ زووتر ژ ڤێ ماوەیێ دەست پێ دکەت پێشکێش مەکە.",
    horizon: "ماوەیا داهاتی (ڕۆژ)",
    horizonHelp: "نەخۆش تا چەند ڕۆژان داهاتی دشێت دەمان ببینیت.",
    save: "پاراستن",
    doctors: "دەمێن دکتۆری",
    doctorsHelp: "ل وەشانا ئێکێ بۆ هەر ڕۆژەکی یەک ماوەیا وادەیا گشتی هەیە.",
    publicHours: "دەمێن وادەیا گشتی",
    publicHoursHelp: "ناچالاککرنا ڕۆژەکی ل ڤێرێ کارێ ڕیسێپشنێ ناگوهۆڕیت.",
    closedDates: "ڕۆژێن گرتی",
    closedDatesHelp: "ڕۆژەکێ دیاریکری ژ وادەیا گشتی ڤەشێرە بێ هەلوەشاندنا وادەیێن هەیی.",
    closeDate: "ڕۆژێ بگرە",
    startTime: "دەمێ دەستپێکێ",
    endTime: "دەمێ دوماهیکێ",
    closedDateInput: "ڕۆژا گرتنێ",
    reopen: "ڤەکە",
    saved: "ڕێکخستنێن بەردەستبوونا گشتی هاتنە پاراستن.",
    invalid: "ڕێکخستنان بپشکنە و جارەکا دی هەول بدە.",
    doctorUnavailable: "ئەڤ دکتۆرە بۆ ڕێکخستنا وادەیا گشتی بەردەست نینە.",
    saveFailed: "ڕێکخستن نەهاتنە پاراستن.",
    timezone: "دەم ب دەمژمێرا هەولێر / بەغدا دێتە دیارکرن.",
    inactiveHelp: "پشتی پاراستنێ، ڕۆژێن ناچالاک بۆ وادەیێ ئۆنلاین ناهێنە نیشاندان. دەمێن وان بۆ پاشەڕۆژێ دمینن.",
    dayOn: "چالاک",
    dayOff: "ناچالاک",
    invalidRange: "ل {day}، دەمێ دوماهیکێ پێدڤیە پشتی دەمێ دەستپێکێ بیت.",
    configuredDays: "ڕۆژێن پاراستی یێن چالاک: {count} ژ ٧",
    noDoctors: "هێشتا چ دکتۆرێن چالاک نینن بۆ ڕێکخستنا دەمان.",
    noClosedDates: "چ ڕۆژێن گرتی یێن داهاتی نینن.",
    weekdays: ["ئێکشەمبی", "دووشەمبی", "سێشەمبی", "چوارشەمبی", "پێنجشەمبی", "ئەینی", "شەمبی"],
  },
  ar: {
    eyebrow: "التوفر العام",
    title: "ساعات الحجز عبر الإنترنت",
    intro: "حدد فقط الساعات التي يستطيع المريض حجزها بنفسه. يبقى الاستقبال قادراً على الحجز خارجها.",
    back: "العودة إلى الملف العام",
    clinicSettings: "قواعد الحجز",
    clinicSettingsHelp: "يبقى الحجز العام متوقفاً حتى تفعّله أنت.",
    enable: "تفعيل التوفر العام",
    enableHelp: "تظهر الأوقات فقط عندما يكون ملف العيادة وملف الطبيب منشورين أيضاً.",
    lead: "أقل مهلة قبل الموعد (دقيقة)",
    leadHelp: "لا تعرض موعداً يبدأ قبل هذه المهلة.",
    horizon: "مدة الحجز المسبق (يوم)",
    horizonHelp: "إلى أي مدى مستقبلاً تظهر المواعيد العامة.",
    save: "حفظ",
    doctors: "ساعات الأطباء",
    doctorsHelp: "الإصدار الأول يدعم فترة حجز عامة واحدة لكل طبيب في كل يوم من الأسبوع.",
    publicHours: "ساعات الحجز العام",
    publicHoursHelp: "إيقاف يوم هنا لا يغيّر جدول الاستقبال.",
    closedDates: "الأيام المغلقة",
    closedDatesHelp: "اخفِ تاريخاً محدداً عن الحجز العام بدون إلغاء المواعيد الموجودة.",
    closeDate: "إغلاق التاريخ",
    startTime: "وقت البدء",
    endTime: "وقت الانتهاء",
    closedDateInput: "تاريخ الإغلاق",
    reopen: "إعادة الفتح",
    saved: "تم حفظ إعدادات التوفر العام.",
    invalid: "راجع إعدادات التوفر وحاول مرة ثانية.",
    doctorUnavailable: "هذا الطبيب غير متاح لإعدادات الحجز العام.",
    saveFailed: "تعذر حفظ إعدادات التوفر.",
    timezone: "تُعرض الأوقات بالتوقيت المحلي لأربيل / بغداد.",
    inactiveHelp: "بعد الحفظ، الأيام المتوقفة لا تظهر للحجز العام، وتُحفظ ساعاتها لاستخدامها لاحقاً.",
    dayOn: "مفعّل",
    dayOff: "متوقف",
    invalidRange: "في {day} يجب أن يكون وقت الانتهاء بعد وقت البدء.",
    configuredDays: "الأيام المفعّلة المحفوظة: {count} من ٧",
    noDoctors: "لا يوجد أطباء نشطون لضبط ساعاتهم حالياً.",
    noClosedDates: "لا توجد تواريخ مغلقة قادمة.",
    weekdays: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
  },
};

function resultMessage(locale: UiLocale, error?: string, notice?: string) {
  const t = copy[locale];
  if (notice === "saved") return { kind: "success" as const, text: t.saved };
  const errors: Record<string, string> = {
    invalid: t.invalid,
    doctor_unavailable: t.doctorUnavailable,
    save_failed: t.saveFailed,
  };
  return error ? { kind: "error" as const, text: errors[error] ?? t.saveFailed } : null;
}

export default async function AvailabilitySettings({ searchParams }: AvailabilitySettingsProps) {
  const [params, locale] = await Promise.all([searchParams, getUiLocale()]);
  const t = copy[locale];
  if (!params.clinic || !isUuid(params.clinic)) redirect("/dashboard/settings");

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const [{ data: clinic }, { data: membership }] = await Promise.all([
    supabase.from("clinics").select("id, owner_id").eq("id", params.clinic).maybeSingle(),
    supabase.from("clinic_members").select("role").eq("clinic_id", params.clinic).eq("user_id", userData.user.id).maybeSingle(),
  ]);
  const canManage = clinic
    && (clinic.owner_id === userData.user.id || membership?.role === "owner" || membership?.role === "manager");
  if (!clinic || !canManage) redirect("/dashboard/settings");
  const today = baghdadDate.format(new Date());

  const [
    { data: settings, error: settingsError },
    { data: doctors, error: doctorsError },
    { data: hours, error: hoursError },
    { data: closedDates, error: closedDatesError },
  ] = await Promise.all([
    supabase.from("clinic_public_booking_settings").select("*").eq("clinic_id", clinic.id).maybeSingle(),
    supabase.from("doctors").select("id, name, active").eq("clinic_id", clinic.id).eq("active", true).order("display_order"),
    supabase.from("doctor_public_booking_hours").select("*").eq("clinic_id", clinic.id),
    supabase.from("doctor_public_booking_closed_dates").select("*").eq("clinic_id", clinic.id).eq("is_closed", true).gte("booking_date", today).order("booking_date"),
  ]);
  if (settingsError || doctorsError || hoursError || closedDatesError) {
    redirect(`/dashboard/settings/public-profile?clinic=${clinic.id}`);
  }

  const hourMap = new Map((hours ?? []).map((row) => [`${row.doctor_id}:${row.weekday}`, row]));
  const closedByDoctor = new Map<string, NonNullable<typeof closedDates>>();
  for (const row of closedDates ?? []) {
    const current = closedByDoctor.get(row.doctor_id) ?? [];
    current.push(row);
    closedByDoctor.set(row.doctor_id, current);
  }
  const message = resultMessage(locale, params.error, params.notice);

  return (
    <main className="settings-page shell public-availability-settings">
      <header className="page-heading settings-heading">
        <div>
          <div className="eyebrow">{t.eyebrow}</div>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
        <Link className="button button-ghost button-small" href={`/dashboard/settings/public-profile?clinic=${clinic.id}`}>{t.back}</Link>
      </header>

      {message ? <p className={`notice ${message.kind === "error" ? "notice-error" : "notice-success"}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p> : null}

      <section className="settings-card settings-card-wide">
        <div className="settings-card-heading">
          <span className="settings-card-icon" aria-hidden="true">◷</span>
          <div><h2>{t.clinicSettings}</h2><p>{t.clinicSettingsHelp}</p></div>
        </div>
        <form action={savePublicBookingSettings} className="settings-form public-booking-rules">
          <input type="hidden" name="clinic_id" value={clinic.id} />
          <label className="public-booking-toggle">
            <input type="checkbox" name="enabled" defaultChecked={settings?.enabled ?? false} />
            <span><strong>{t.enable}</strong><small>{t.enableHelp}</small></span>
          </label>
          <label><span>{t.lead}</span><input type="number" name="min_lead_minutes" min={0} max={10080} step={15} defaultValue={settings?.min_lead_minutes ?? 120} required /><small>{t.leadHelp}</small></label>
          <label><span>{t.horizon}</span><input type="number" name="booking_horizon_days" min={1} max={90} defaultValue={settings?.booking_horizon_days ?? 30} required /><small>{t.horizonHelp}</small></label>
          <SubmitButton pendingLabel="…">{t.save}</SubmitButton>
        </form>
      </section>

      <section className="settings-card settings-card-wide">
        <div className="settings-card-heading">
          <span className="settings-card-icon" aria-hidden="true">+</span>
          <div><h2>{t.doctors}</h2><p>{t.doctorsHelp}</p></div>
        </div>

        <div className="public-booking-doctors">
          {doctors?.length ? null : <p className="public-booking-empty">{t.noDoctors}</p>}
          {(doctors ?? []).map((doctor) => {
            const doctorClosedDates = closedByDoctor.get(doctor.id) ?? [];
            const enabledDays = weekdayOrder.filter((weekday) => hourMap.get(`${doctor.id}:${weekday}`)?.is_enabled).length;
            return (
              <details className="settings-disclosure public-booking-doctor" key={doctor.id}>
                <summary>
                  <span>{doctor.name}</span>
                  <small>{t.configuredDays.replace("{count}", String(enabledDays))}</small>
                </summary>
                <PublicBookingWeekForm action={saveDoctorPublicBookingHours} weekdays={t.weekdays} invalidRange={t.invalidRange}>
                  <input type="hidden" name="clinic_id" value={clinic.id} />
                  <input type="hidden" name="doctor_id" value={doctor.id} />
                  <div className="public-booking-hours-heading">
                    <strong>{t.publicHours}</strong>
                    <span>{t.publicHoursHelp}</span>
                    <span>{t.timezone} {t.inactiveHelp}</span>
                  </div>
                  <div className="public-booking-week">
                    {weekdayOrder.map((weekday) => {
                      const row = hourMap.get(`${doctor.id}:${weekday}`);
                      return (
                        <div className="public-booking-day" key={weekday}>
                          <label className="public-booking-day-toggle">
                            <input type="checkbox" name={`day_${weekday}_enabled`} defaultChecked={row?.is_enabled ?? false} />
                            <span>{t.weekdays[weekday]}</span>
                          </label>
                          <span className="public-booking-day-status">
                            <span className="public-booking-status-on">{t.dayOn}</span>
                            <span className="public-booking-status-off">{t.dayOff}</span>
                          </span>
                          <div className="public-booking-day-times" dir="ltr">
                            <input aria-label={`${t.weekdays[weekday]} — ${t.startTime}`} type="time" name={`day_${weekday}_start`} defaultValue={row?.starts_at?.slice(0,5) ?? "09:00"} required />
                            <span aria-hidden="true">–</span>
                            <input aria-label={`${t.weekdays[weekday]} — ${t.endTime}`} type="time" name={`day_${weekday}_end`} defaultValue={row?.ends_at?.slice(0,5) ?? "17:00"} required />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <SubmitButton pendingLabel="…">{t.save}</SubmitButton>
                </PublicBookingWeekForm>

                <div className="public-booking-closed">
                  <div><strong>{t.closedDates}</strong><span>{t.closedDatesHelp}</span></div>
                  <form action={setDoctorPublicClosedDate.bind(null, clinic.id, doctor.id, true)} className="public-booking-close-form">
                    <input type="date" name="booking_date" min={today} aria-label={t.closedDateInput} required />
                    <SubmitButton className="button button-ghost button-small" pendingLabel="…">{t.closeDate}</SubmitButton>
                  </form>
                  {doctorClosedDates.length ? (
                    <div className="public-booking-closed-list">
                      {doctorClosedDates.map((row) => (
                        <form action={setDoctorPublicClosedDate.bind(null, clinic.id, doctor.id, false)} key={row.booking_date}>
                          <input type="hidden" name="booking_date" value={row.booking_date} />
                          <span>{formatLocalDateValue(row.booking_date, locale)}</span>
                          <SubmitButton className="button button-ghost button-small" pendingLabel="…">{t.reopen}</SubmitButton>
                        </form>
                      ))}
                    </div>
                  ) : <p className="public-booking-empty">{t.noClosedDates}</p>}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <style>{`
        .public-availability-settings{padding-bottom:100px}
        .public-availability-settings>.settings-card{margin-top:16px}
        .public-booking-rules{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
        .public-booking-rules>label:not(.public-booking-toggle){display:grid;gap:6px;color:var(--muted);font-size:11px;font-weight:780}
        .public-booking-rules small{color:var(--muted);font-size:11px;line-height:1.45}
        .public-booking-toggle{grid-column:1/-1;display:grid!important;grid-template-columns:auto minmax(0,1fr);align-items:start;gap:10px;padding:13px;border:1px solid var(--line);border-radius:14px;background:var(--surface-soft)}
        .public-booking-toggle span{display:grid;gap:4px}
        .public-booking-toggle strong{color:var(--ink)}
        .public-booking-doctors{display:grid;gap:10px}
        .public-booking-doctor>summary{font-weight:850;display:list-item}
        .public-booking-doctor>summary small{display:block;margin-top:5px;color:var(--muted);font-size:11px;font-weight:650}
        .public-booking-hours-heading,.public-booking-closed>div:first-child{display:grid;gap:4px;margin:12px 0}
        .public-booking-hours-heading span,.public-booking-closed>div:first-child span{color:var(--muted);font-size:12px;line-height:1.55}
        .public-booking-week{display:grid;gap:8px}
        .public-booking-day{display:grid;grid-template-columns:minmax(100px,1fr) auto minmax(250px,300px);align-items:center;column-gap:12px;row-gap:8px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;min-width:0}
        .public-booking-day:has(input[type=checkbox]:not(:checked)){background:var(--surface-soft)}
        .public-booking-day-toggle{display:flex!important;align-items:center;gap:8px;min-width:0;font-weight:750}
        .public-booking-day-status{font-size:11px;font-weight:800;padding:4px 8px;border-radius:999px;background:var(--surface-soft);color:var(--ink)}
        .public-booking-status-off{display:none}
        .public-booking-day:has(input[type=checkbox]:not(:checked)) .public-booking-status-on{display:none}
        .public-booking-day:has(input[type=checkbox]:not(:checked)) .public-booking-status-off{display:inline}
        .public-booking-day:has(input[type=checkbox]:not(:checked)) .public-booking-day-times{opacity:.55}
        .public-booking-day-times{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:8px;min-width:0}
        .public-booking-day-times input[type=time]{width:100%;min-width:0}
        .public-booking-validation{margin:8px 0 0}
        .public-booking-closed{margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}
        .public-booking-close-form{display:flex;gap:8px;align-items:center}
        .public-booking-close-form input{max-width:210px}
        .public-booking-closed-list{display:grid;gap:6px;margin-top:10px}
        .public-booking-closed-list form{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid var(--line);border-radius:12px}
        .public-booking-closed-list span{font-size:12px;font-weight:760}
        .public-booking-empty{font-size:12px;color:var(--muted);margin:8px 0}
        @media(max-width:680px){
          .public-booking-rules{grid-template-columns:1fr}
          .public-booking-day{grid-template-columns:minmax(0,1fr) auto}
          .public-booking-day-times{grid-column:1/-1}
          .public-booking-close-form{align-items:stretch;flex-direction:column}
          .public-booking-close-form input{max-width:none;width:100%}
        }
      `}</style>
    </main>
  );
}
