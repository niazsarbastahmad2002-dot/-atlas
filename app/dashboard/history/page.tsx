import Link from "next/link";
import { redirect } from "next/navigation";
import { formatIraqiMobile, isUuid } from "@/lib/appointments";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { localizeDigits } from "@/lib/i18n/format";
import { formatBaghdadDateTime, type UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { HistoryClient } from "./history-client";

export const dynamic = "force-dynamic";

type HistoryPageProps = { searchParams: Promise<{ clinic?: string }> };
const HISTORY_VIEW_LIMIT = 1000;

const copy: Record<UiLocale, { eyebrow: string; title: string; help: string; back: string; activity: string; privacy: string; clinic: string; open: string; loadFailed: string; limited: string }> = {
  en: { eyebrow: "Clinic records", title: "Appointment history", help: "Search old appointments and review removed records. Permanent deletion is limited to removed appointments and clinic administration.", back: "Back to settings", activity: "Activity history", privacy: "Deleting forever removes the appointment record and its patient access link. Atlas keeps audit events that are designed to remain as a minimal security record.", clinic: "Clinic", open: "Open", loadFailed: "The appointment history could not load.", limited: "Showing the latest {count} appointments. Older records are not included in this view." },
  ku: { eyebrow: "تۆمارەکانی کلینیک", title: "مێژووی وادەکان", help: "لە وادە کۆنەکان بگەڕێ و تۆمارە لابراوەکان ببینە. سڕینەوەی هەمیشەیی تەنها بۆ وادە لابراوەکان و بەڕێوەبردنی کلینیکە.", back: "گەڕانەوە بۆ ڕێکخستنەکان", activity: "مێژووی چالاکی", privacy: "سڕینەوەی هەمیشەیی تۆماری وادە و بەستەری نەخۆش دەسڕێتەوە. Atlas تۆماری کەمینەی ئاسایشی هەندێک ڕووداو دەپارێزێت.", clinic: "کلینیک", open: "کردنەوە", loadFailed: "مێژووی وادەکان بار نەبوو.", limited: "نوێترین {count} وادە پیشان دەدرێن. تۆمارە کۆنترەکان لەم دیمەنەدا نین." },
  bd: { eyebrow: "تۆمارێن کلینیکێ", title: "مێژوویا وادەیان", help: "ل وادەیێن کەڤن بگەڕێ و تۆمارێن لابری بپشکنە. ژێبرنا هەمیشەیی تەنێ بۆ وادەیێن لابری و بەڕێڤەبرنا کلینیکێیە.", back: "ڤەگەرە بۆ ڕێکخستن", activity: "مێژوویا چالاکیێ", privacy: "ژێبرنا هەمیشەیی تۆمارێ وادەیێ و لینکێ نەخۆشی ژێدبەت. Atlas تۆمارەکا کێم یا ئاسایشی دپارێزیت.", clinic: "کلینیک", open: "ڤەکە", loadFailed: "مێژوویا وادەیان نەهاتە بارکرن.", limited: "نووترین {count} وادە دهێنە نیشاندان. تۆمارێن کەڤنتر ل ڤێ دیمەنێ نینن." },
  ar: { eyebrow: "سجلات العيادة", title: "سجل المواعيد", help: "ابحث في المواعيد القديمة وراجع السجلات التي تمت إزالتها. الحذف النهائي متاح فقط للمواعيد المحذوفة وإدارة العيادة.", back: "العودة إلى الإعدادات", activity: "سجل النشاط", privacy: "الحذف النهائي يزيل سجل الموعد ورابط المريض. يحتفظ Atlas بأحداث تدقيق أمنية محدودة مصممة للبقاء كسجل أمني أدنى.", clinic: "العيادة", open: "فتح", loadFailed: "تعذر تحميل سجل المواعيد.", limited: "نعرض أحدث {count} موعداً. السجلات الأقدم غير مشمولة في هذا العرض." },
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const locale = await getUiLocale();
  const t = copy[locale];
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: clinics, error: clinicsError } = await supabase.from("clinics").select("id, name, owner_id").order("created_at", { ascending: true });
  if (clinicsError || !clinics?.length) redirect("/dashboard");
  const requestedClinic = params.clinic && isUuid(params.clinic) ? params.clinic : null;
  if (params.clinic && (!requestedClinic || !clinics.some((item) => item.id === requestedClinic))) {
    redirect("/dashboard?error=clinic_unavailable");
  }
  const clinic = clinics.find((item) => item.id === requestedClinic) ?? clinics[0];

  const { data: membership } = await supabase.from("clinic_members").select("role").eq("clinic_id", clinic.id).eq("user_id", userData.user.id).maybeSingle();
  const canManageRecords = clinic.owner_id === userData.user.id || membership?.role === "owner" || membership?.role === "manager";
  if (!canManageRecords) redirect(`/dashboard/settings?clinic=${clinic.id}`);

  const { data: appointments, error: appointmentsError, count: appointmentCount } = await supabase.from("appointments")
    .select("id, patient_name, patient_phone, doctor_name, appointment_at, status, voided_at", { count: "exact" })
    .eq("clinic_id", clinic.id).order("appointment_at", { ascending: false }).limit(HISTORY_VIEW_LIMIT);

  if (appointmentsError) {
    return <main className="center-page"><section className="auth-card"><div className="brand">Atlas</div><h1>{t.title}</h1><p className="notice notice-error">{t.loadFailed}</p><Link className="button" href={`/dashboard/settings?${new URLSearchParams({ clinic: clinic.id })}`}>{t.back}</Link></section></main>;
  }

  const historyTruncated = (appointmentCount ?? appointments?.length ?? 0) > HISTORY_VIEW_LIMIT;
  const rows = (appointments ?? []).map((appointment) => ({
    id: appointment.id,
    patientName: appointment.patient_name,
    patientPhone: formatIraqiMobile(appointment.patient_phone),
    doctorName: appointment.doctor_name,
    appointmentAt: appointment.appointment_at,
    displayTime: formatBaghdadDateTime(new Date(appointment.appointment_at), locale),
    status: appointment.status,
    removed: Boolean(appointment.voided_at),
  }));

  return (
    <main className="history-page shell">
      <header className="page-heading history-heading">
        <div><div className="eyebrow">{t.eyebrow}</div><h1>{t.title}</h1><p>{t.help}</p></div>
        <div className="compact-actions">
          <Link className="button button-ghost button-small" href={`/dashboard/activity?clinic=${clinic.id}`} prefetch>{t.activity}</Link>
          <Link className="button button-ghost button-small" href={`/dashboard/settings?clinic=${clinic.id}`} prefetch>{t.back}</Link>
        </div>
      </header>
      {clinics.length > 1 ? <form className="clinic-switcher history-clinic-switcher" method="get"><label htmlFor="clinic-history">{t.clinic}</label><select id="clinic-history" name="clinic" defaultValue={clinic.id}>{clinics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="button button-ghost button-small" type="submit">{t.open}</button></form> : null}
      {historyTruncated ? <p className="notice history-limit-notice" role="status">{t.limited.replace("{count}", localizeDigits(HISTORY_VIEW_LIMIT, locale))}</p> : null}
      <HistoryClient clinicId={clinic.id} rows={rows} locale={locale} canDelete />
      <p className="history-privacy">{t.privacy}</p>
    </main>
  );
}
