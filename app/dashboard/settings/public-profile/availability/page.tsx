import Link from "next/link";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/app/components/submit-button";
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
  reopen: string;
  saved: string;
  invalid: string;
  doctorUnavailable: string;
  saveFailed: string;
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
    reopen: "Reopen",
    saved: "Public availability settings saved.",
    invalid: "Check the availability settings and try again.",
    doctorUnavailable: "That doctor is unavailable for public booking settings.",
    saveFailed: "The availability settings could not be saved.",
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
    reopen: "کردنەوە",
    saved: "ڕێکخستنەکانی بەردەستبوونی گشتی پاشەکەوت کران.",
    invalid: "ڕێکخستنەکان بپشکنە و دووبارە هەوڵ بدەوە.",
    doctorUnavailable: "ئەم پزیشکە بۆ ڕێکخستنی مەوعیدی گشتی بەردەست نییە.",
    saveFailed: "ڕێکخستنەکان پاشەکەوت نەکران.",
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
    reopen: "ڤەکە",
    saved: "ڕێکخستنێن بەردەستبوونا گشتی هاتنە پاراستن.",
    invalid: "ڕێکخستنان بپشکنە و جارەکا دی هەول بدە.",
    doctorUnavailable: "ئەڤ دکتۆرە بۆ ڕێکخستنا وادەیا گشتی بەردەست نینە.",
    saveFailed: "ڕێکخستن نەهاتنە پاراستن.",
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
    reopen: "إعادة الفتح",
    saved: "تم حفظ إعدادات التوفر العام.",
    invalid: "راجع إعدادات التوفر وحاول مرة ثانية.",
    doctorUnavailable: "هذا الطبيب غير متاح لإعدادات الحجز العام.",
    saveFailed: "تعذر حفظ إعدادات التوفر.",
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

  const [
    { data: settings, error: settingsError },
    { data: doctors, error: doctorsError },
    { data: hours, error: hoursError },
    { data: closedDates, error: closedDatesError },
  ] = await Promise.all([
    supabase.from("clinic_public_booking_settings").select("*").eq("clinic_id", clinic.id).maybeSingle(),
    supabase.from("doctors").select("id, name, active").eq("clinic_id", clinic.id).eq("active", true).order("display_order"),
    supabase.from("doctor_public_booking_hours").select("*").eq("clinic_id", clinic.id),
    supabase.from("doctor_public_booking_closed_dates").select("*").eq("clinic_id", clinic.id).eq("is_closed", true).order("booking_date"),
  ]);
  if (settingsError || doctorsError || hoursError || closedDatesError) {
    redirect(`/dashboard/settings/public-profile?clinic=${clinic.id}`);
  }

  const hourMap = new Map((hours ?? []).map((row) => [`${row.doctor_id}:${row.weekday}`, row]));
  const closedByDoctor = new Map<string, typeof closedDates>();
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
          {(doctors ?? []).map((doctor) => {
            const doctorClosedDates = closedByDoctor.get(doctor.id) ?? [];
            return (
              <details className="settings-disclosure public-booking-doctor" key={doctor.id}>
                <summary>{doctor.name}</summary>
                <form action={saveDoctorPublicBookingHours} className="settings-form">
                  <input type="hidden" name="clinic_id" value={clinic.id} />
                  <input type="hidden" name="doctor_id" value={doctor.id} />
                  <div className="public-booking-hours-heading">
                    <strong>{t.publicHours}</strong>
                    <span>{t.publicHoursHelp}</span>
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
                          <input aria-label={`${t.weekdays[weekday]} start`} type="time" name={`day_${weekday}_start`} defaultValue={row?.starts_at?.slice(0,5) ?? "09:00"} required />
                          <span aria-hidden="true">–</span>
                          <input aria-label={`${t.weekdays[weekday]} end`} type="time" name={`day_${weekday}_end`} defaultValue={row?.ends_at?.slice(0,5) ?? "17:00"} required />
                        </div>
                      );
                    })}
                  </div>
                  <SubmitButton pendingLabel="…">{t.save}</SubmitButton>
                </form>

                <div className="public-booking-closed">
                  <div><strong>{t.closedDates}</strong><span>{t.closedDatesHelp}</span></div>
                  <form action={setDoctorPublicClosedDate.bind(null, clinic.id, doctor.id, true)} className="public-booking-close-form">
                    <input type="date" name="booking_date" required />
                    <SubmitButton className="button button-ghost button-small" pendingLabel="…">{t.closeDate}</SubmitButton>
                  </form>
                  {doctorClosedDates.length ? (
                    <div className="public-booking-closed-list">
                      {doctorClosedDates.map((row) => (
                        <form action={setDoctorPublicClosedDate.bind(null, clinic.id, doctor.id, false)} key={row.booking_date}>
                          <input type="hidden" name="booking_date" value={row.booking_date} />
                          <span>{row.booking_date}</span>
                          <SubmitButton className="button button-ghost button-small" pendingLabel="…">{t.reopen}</SubmitButton>
                        </form>
                      ))}
                    </div>
                  ) : null}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <style>{`
        .public-availability-settings{padding-bottom:100px}.public-availability-settings>.settings-card{margin-top:16px}.public-booking-rules{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.public-booking-rules>label:not(.public-booking-toggle){display:grid;gap:6px;color:var(--muted);font-size:11px;font-weight:780}.public-booking-rules small{color:var(--muted);font-size:10px;line-height:1.45}.public-booking-toggle{grid-column:1/-1;display:grid!important;grid-template-columns:auto 1fr;align-items:start;gap:10px;padding:13px;border:1px solid var(--line);border-radius:14px;background:var(--surface-soft)}.public-booking-toggle span{display:grid;gap:4px}.public-booking-toggle strong{color:var(--ink)}.public-booking-doctors{display:grid;gap:10px}.public-booking-doctor>summary{font-weight:850}.public-booking-hours-heading,.public-booking-closed>div:first-child{display:grid;gap:4px;margin:12px 0}.public-booking-hours-heading span,.public-booking-closed>div:first-child span{color:var(--muted);font-size:11px}.public-booking-week{display:grid;gap:7px}.public-booking-day{display:grid;grid-template-columns:minmax(120px,1fr) minmax(105px,140px) auto minmax(105px,140px);align-items:center;gap:8px}.public-booking-day-toggle{display:flex!important;align-items:center;gap:8px}.public-booking-day input[type=time]{min-width:0}.public-booking-closed{margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}.public-booking-close-form{display:flex;gap:8px;align-items:center}.public-booking-close-form input{max-width:210px}.public-booking-closed-list{display:grid;gap:6px;margin-top:10px}.public-booking-closed-list form{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid var(--line);border-radius:12px}.public-booking-closed-list span{font-size:12px;font-weight:760}@media(max-width:680px){.public-booking-rules{grid-template-columns:1fr}.public-booking-day{grid-template-columns:1fr 1fr auto 1fr}.public-booking-day-toggle{grid-column:1/-1}.public-booking-close-form{align-items:stretch;flex-direction:column}.public-booking-close-form input{max-width:none}}
      `}</style>
    </main>
  );
}
