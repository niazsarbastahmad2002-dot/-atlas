import Link from "next/link";
import { uiLocaleMeta } from "@/lib/i18n/ui";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { formatBaghdadDateTime, formatBaghdadDay, type UiLocale } from "@/lib/i18n/ui";
import { localizeDigits } from "@/lib/i18n/format";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ clinic?: string; type?: string }> };
type ActivityFilter = "all" | "appointments" | "smart_fill" | "staff";
const ACTIVITY_VIEW_LIMIT = 250;
type SafeState = Record<string, unknown> | null;

type Copy = {
  eyebrow: string;
  title: string;
  help: string;
  back: string;
  appointment: string;
  smartFill: string;
  staff: string;
  system: string;
  patient: string;
  contact: string;
  formerStaff: string;
  unknownStaff: string;
  filter: string;
  allEvents: string;
  appointmentEvents: string;
  smartFillEvents: string;
  staffEvents: string;
  noMatches: string;
  you: string;
  empty: string;
  privacy: string;
  clinic: string;
  open: string;
  loadFailed: string;
  limited: string;
};

const copy: Record<UiLocale, Copy> = {
  en: {
    eyebrow: "Clinic administration",
    title: "Activity history",
    help: "See who performed important clinic actions, what happened, and when.",
    back: "Back to appointment history",
    appointment: "Appointment",
    smartFill: "Smart Fill slot",
    staff: "Staff access",
    system: "Atlas",
    patient: "Patient action",
    contact: "Patient contact",
    formerStaff: "Former staff",
    you: "You",
    empty: "No activity has been recorded yet.",
    privacy: "Activity history stores operational IDs and small status/permission changes. It does not copy patient names, phone numbers, messages, or appointment notes into the log.",
    clinic: "Clinic",
    open: "Open",
    loadFailed: "Activity history could not load.",
    limited: "Showing the latest {count} activity events. Older events are not included in this view.",
    unknownStaff: "Staff (identity unavailable)",
    filter: "Show activity",
    allEvents: "All activity",
    appointmentEvents: "Appointments",
    smartFillEvents: "Smart Fill",
    staffEvents: "Staff & access",
    noMatches: "No activity matches this filter.",
  },
  ku: {
    eyebrow: "بەڕێوەبردنی کلینیک",
    title: "مێژووی چالاکی",
    help: "ببینە کێ کاری گرنگی کلینیکی کردووە، چی ڕوویداوە و کەی.",
    back: "گەڕانەوە بۆ مێژووی وادەکان",
    appointment: "وادە",
    smartFill: "شوێنی Smart Fill",
    staff: "دەسەڵاتی ستاف",
    system: "Atlas",
    patient: "کرداری نەخۆش",
    contact: "پەیوەندی نەخۆش",
    formerStaff: "ستافی پێشوو",
    you: "تۆ",
    empty: "هێشتا هیچ چالاکییەک تۆمار نەکراوە.",
    privacy: "مێژووی چالاکی تەنها ناسنامە و گۆڕانکارییە کەمەکانی دۆخ و دەسەڵات هەڵدەگرێت. ناوی نەخۆش، ژمارەی مۆبایل، نامە یان تێبینی وادە دووبارە ناکاتەوە.",
    clinic: "کلینیک",
    open: "کردنەوە",
    loadFailed: "مێژووی چالاکی بار نەبوو.",
    limited: "نوێترین {count} ڕووداوی چالاکی پیشان دەدرێن. ڕووداوە کۆنترەکان لەم دیمەنەدا نین.",
    unknownStaff: "ستاف (ناسنامە دیار نییە)",
    filter: "جۆری چالاکی",
    allEvents: "هەموو چالاکییەکان",
    appointmentEvents: "وادەکان",
    smartFillEvents: "پڕکردنەوەی شوێن",
    staffEvents: "ستاف و دەسەڵات",
    noMatches: "هیچ چالاکییەک بۆ ئەم پاڵاوتنە نییە.",
  },
  bd: {
    eyebrow: "بەڕێڤەبرنا کلینیکێ",
    title: "مێژوویا چالاکیێ",
    help: "ببینە کی کارەکێ گرنگ یێ کلینیکێ کری، چی بوویە و کەنگی.",
    back: "ڤەگەڕە بۆ مێژوویا وادەیان",
    appointment: "وادە",
    smartFill: "جهێ Smart Fill",
    staff: "دەستهەلاتا ستافی",
    system: "Atlas",
    patient: "کارێ نەخۆشی",
    contact: "پەیوەندیا نەخۆشی",
    formerStaff: "ستافێ بەرێ",
    you: "تو",
    empty: "هێشتا چ چالاکی نەهاتییە تۆمارکرن.",
    privacy: "مێژوویا چالاکیێ تەنێ ناسنامە و گوهۆڕینێن بچووک یێن بار و دەستهەلاتێ دپارێزیت. ناڤێ نەخۆشی، ژمارا موبایلێ، نامە یان تێبینیێن وادەیان دووبارە ناکەت.",
    clinic: "کلینیک",
    open: "ڤەکە",
    loadFailed: "مێژوویا چالاکیێ نەهاتە بارکرن.",
    limited: "نووترین {count} ڕوودانێن چالاکیێ دهێنە نیشاندان. ڕوودانێن کەڤنتر ل ڤێ دیمەنێ نینن.",
    unknownStaff: "ستاف (ناسنامە دیار نینە)",
    filter: "جۆرێ چالاکیێ",
    allEvents: "هەمی چالاکی",
    appointmentEvents: "وادە",
    smartFillEvents: "پڕکرنا جهی",
    staffEvents: "ستاف و دەستهەلات",
    noMatches: "چ چالاکی بۆ ڤێ هەلبژارتنێ نینە.",
  },
  ar: {
    eyebrow: "إدارة العيادة",
    title: "سجل النشاط",
    help: "اعرف من نفّذ الإجراء المهم، ماذا حدث، ومتى.",
    back: "العودة إلى سجل المواعيد",
    appointment: "موعد",
    smartFill: "فتحة Smart Fill",
    staff: "صلاحية الموظفين",
    system: "Atlas",
    patient: "إجراء المريض",
    contact: "جهة اتصال المريض",
    formerStaff: "موظف سابق",
    you: "أنت",
    empty: "ماكو نشاط مسجل لحد الآن.",
    privacy: "سجل النشاط يحتفظ بالمعرّفات التشغيلية وتغييرات الحالة والصلاحية الصغيرة فقط. ما ينسخ أسماء المرضى أو أرقامهم أو الرسائل أو ملاحظات المواعيد إلى السجل.",
    clinic: "العيادة",
    open: "فتح",
    loadFailed: "تعذر تحميل سجل النشاط.",
    limited: "نعرض أحدث {count} حدث نشاط. الأحداث الأقدم غير مشمولة في هذا العرض.",
    unknownStaff: "موظف (الهوية غير متاحة)",
    filter: "نوع النشاط",
    allEvents: "كل النشاط",
    appointmentEvents: "المواعيد",
    smartFillEvents: "ملء الفتحات",
    staffEvents: "الموظفون والصلاحيات",
    noMatches: "لا يوجد نشاط يطابق هذا الفلتر.",
  },
};

const activityStatusLabel: Record<UiLocale, Record<string, string>> = {
  en: { pending: "Pending", confirmed: "Confirmed", cancelled: "Cancelled", completed: "Completed", no_show: "No-show" },
  ku: { pending: "چاوەڕوان", confirmed: "پشتڕاستکراوە", cancelled: "هەڵوەشێنراوەتەوە", completed: "تەواوبوو", no_show: "نەهات" },
  bd: { pending: "چاڤەڕێ", confirmed: "پشتڕاستکری", cancelled: "هەلوەشاندی", completed: "تەمام", no_show: "نەهات" },
  ar: { pending: "قيد الانتظار", confirmed: "مؤكد", cancelled: "ملغي", completed: "مكتمل", no_show: "لم يحضر" },
};

const changedFieldLabel: Record<UiLocale, Record<string, string>> = {
  en: { patient_name: "Patient name", patient_phone: "Patient phone", contact_relationship: "Phone owner relationship", doctor: "Doctor", reminder_consent: "Reminder consent", reminder_language: "Reminder language" },
  ku: { patient_name: "ناوی نەخۆش", patient_phone: "ژمارەی مۆبایلی نەخۆش", contact_relationship: "پەیوەندی خاوەنی ژمارە", doctor: "پزیشک", reminder_consent: "ڕەزامەندی بیرخستنەوە", reminder_language: "زمانی بیرخستنەوە" },
  bd: { patient_name: "ناڤێ نەخۆشی", patient_phone: "ژمارا موبایلا نەخۆشی", contact_relationship: "پەیوەندیا خودانێ ژمارەیێ", doctor: "دکتۆر", reminder_consent: "ڕەزامەندیا بیرخستنەوەیێ", reminder_language: "زمانێ بیرخستنەوەیێ" },
  ar: { patient_name: "اسم المريض", patient_phone: "رقم هاتف المريض", contact_relationship: "صلة صاحب الرقم", doctor: "الطبيب", reminder_consent: "موافقة التذكير", reminder_language: "لغة التذكير" },
};

const roleLabel: Record<UiLocale, Record<string, string>> = {
  en: { owner: "Clinic administrator", manager: "Manager", receptionist: "Receptionist" },
  ku: { owner: "بەڕێوەبەری کلینیک", manager: "بەڕێوەبەر", receptionist: "ستافی ڕیسێپشن" },
  bd: { owner: "بەڕێڤەبەرێ کلینیکێ", manager: "بەڕێڤەبەر", receptionist: "ستافێ ڕیسێپشنێ" },
  ar: { owner: "مسؤول العيادة", manager: "مدير", receptionist: "موظف استقبال" },
};

function asState(value: unknown): SafeState {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function shortId(value: string | null) {
  return value ? `…${value.slice(-6)}` : "";
}

function stateText(state: SafeState, locale: UiLocale) {
  if (!state) return null;
  const status = typeof state.status === "string" ? state.status : null;
  if (status) return activityStatusLabel[locale][status] ?? status.replaceAll("_", " ");
  const role = typeof state.role === "string" ? state.role : null;
  if (role) return roleLabel[locale][role] ?? role;
  const appointmentAt = typeof state.appointment_at === "string" ? state.appointment_at : null;
  if (appointmentAt) return formatBaghdadDateTime(new Date(appointmentAt), locale);
  const changed = Array.isArray(state.changed_fields)
    ? state.changed_fields.filter((item): item is string => typeof item === "string")
    : [];
  if (changed.length) {
    return changed.map((item) => changedFieldLabel[locale][item] ?? item.replaceAll("_", " ")).join(", ");
  }
  return null;
}

function eventLabel(action: string, toStatus: string | null, locale: UiLocale) {
  const labels: Record<UiLocale, Record<string, string>> = {
    en: {
      created: "Appointment created",
      status_changed: toStatus === "cancelled" ? "Appointment cancelled" : "Appointment status changed",
      rescheduled: "Appointment rescheduled",
      details_updated: "Appointment details changed",
      voided: "Appointment removed",
      smart_fill_slot_claimed: "Smart Fill slot claimed",
      smart_fill_slot_released: "Smart Fill slot released",
      staff_invited: "Staff invited",
      staff_added: "Staff added",
      staff_removed: "Staff removed",
      permission_changed: "Staff permission changed",
    },
    ku: {
      created: "وادە دروستکرا",
      status_changed: toStatus === "cancelled" ? "وادە هەڵوەشێنرایەوە" : "دۆخی وادە گۆڕا",
      rescheduled: "وادە گۆڕدرایەوە",
      details_updated: "وردەکاری وادە گۆڕا",
      voided: "وادە لابرا",
      smart_fill_slot_claimed: "شوێنی Smart Fill گیرا",
      smart_fill_slot_released: "شوێنی Smart Fill بەردرا",
      staff_invited: "ستاف بانگهێشتکرا",
      staff_added: "ستاف زیادکرا",
      staff_removed: "ستاف لابرا",
      permission_changed: "دەسەڵاتی ستاف گۆڕا",
    },
    bd: {
      created: "وادە هاتە دروستکرن",
      status_changed: toStatus === "cancelled" ? "وادە هاتە هەلوەشاندن" : "بارێ وادەیێ هاتە گوهارتن",
      rescheduled: "وادە هاتە گوهارتن",
      details_updated: "وردەکاریێن وادەیێ هاتنە گوهارتن",
      voided: "وادە هاتە لابرن",
      smart_fill_slot_claimed: "جهێ Smart Fill هاتە گرتن",
      smart_fill_slot_released: "جهێ Smart Fill هاتە بەردان",
      staff_invited: "ستاف هاتە بانگهێشتکرن",
      staff_added: "ستاف هاتە زێدەکرن",
      staff_removed: "ستاف هاتە لابرن",
      permission_changed: "دەستهەلاتا ستافی هاتە گوهارتن",
    },
    ar: {
      created: "تم إنشاء الموعد",
      status_changed: toStatus === "cancelled" ? "تم إلغاء الموعد" : "تغيّرت حالة الموعد",
      rescheduled: "تم تغيير موعد الحجز",
      details_updated: "تغيّرت تفاصيل الموعد",
      voided: "تمت إزالة الموعد",
      smart_fill_slot_claimed: "تم حجز فتحة Smart Fill",
      smart_fill_slot_released: "تم تحرير فتحة Smart Fill",
      staff_invited: "تمت دعوة موظف",
      staff_added: "تمت إضافة موظف",
      staff_removed: "تمت إزالة موظف",
      permission_changed: "تغيّرت صلاحية موظف",
    },
  };
  return labels[locale][action] ?? action.replaceAll("_", " ");
}

export default async function ActivityPage({ searchParams }: Props) {
  const params = await searchParams;
  const locale = await getUiLocale();
  const t = copy[locale];
  const filter: ActivityFilter = params.type === "appointments" || params.type === "smart_fill" || params.type === "staff" ? params.type : "all";
  const direction = uiLocaleMeta[locale].direction;
  const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad", year: "numeric", month: "2-digit", day: "2-digit" });
  const transitionArrow = locale === "en" ? "→" : "←";
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: clinics, error: clinicsError } = await supabase
    .from("clinics")
    .select("id, name, owner_id")
    .order("created_at", { ascending: true });
  if (clinicsError || !clinics?.length) redirect("/dashboard");

  const requestedClinic = params.clinic && isUuid(params.clinic) ? params.clinic : null;
  if (params.clinic && (!requestedClinic || !clinics.some((item) => item.id === requestedClinic))) {
    redirect("/dashboard?error=clinic_unavailable");
  }
  const clinic = clinics.find((item) => item.id === requestedClinic) ?? clinics[0];
  const { data: membership, error: membershipError } = await supabase
    .from("clinic_members")
    .select("role")
    .eq("clinic_id", clinic.id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (membershipError && clinic.owner_id !== userData.user.id) {
    return <main className="center-page"><section className="auth-card"><div className="brand">Atlas</div><h1>{t.title}</h1><p className="notice notice-error">{t.loadFailed}</p><Link className="button" href={`/dashboard/history?clinic=${clinic.id}`}>{t.back}</Link></section></main>;
  }

  const canView = clinic.owner_id === userData.user.id || membership?.role === "owner" || membership?.role === "manager";
  if (!canView) redirect(`/dashboard/settings?clinic=${clinic.id}`);

  const activityQuery = supabase
    .from("appointment_audit_events")
    .select("id, actor_id, actor_type, action, entity_type, entity_id, from_status, to_status, before_state, after_state, occurred_at", { count: "exact" })
    .eq("clinic_id", clinic.id)
    .order("occurred_at", { ascending: false });
  const filteredQuery = filter === "appointments" ? activityQuery.eq("entity_type", "appointment")
    : filter === "smart_fill" ? activityQuery.eq("entity_type", "smart_fill_slot")
      : filter === "staff" ? activityQuery.in("entity_type", ["staff_invite", "staff_membership"])
        : activityQuery;

  const [{ data: events, error: eventsError, count: eventCount }, { data: members, error: membersError }] = await Promise.all([
    filteredQuery.limit(ACTIVITY_VIEW_LIMIT),
    supabase
      .from("clinic_members")
      .select("user_id, role")
      .eq("clinic_id", clinic.id),
  ]);

  if (eventsError || membersError) {
    return <main className="center-page"><section className="auth-card"><div className="brand">Atlas</div><h1>{t.title}</h1><p className="notice notice-error">{t.loadFailed}</p><Link className="button" href={`/dashboard/history?clinic=${clinic.id}`}>{t.back}</Link></section></main>;
  }

  const activityTruncated = (eventCount ?? events?.length ?? 0) > ACTIVITY_VIEW_LIMIT;
  const roleByUser = new Map((members ?? []).map((member) => [member.user_id, member.role]));
  const activityRows = events ?? [];

  return (
    <main className="history-page shell">
      <header className="page-heading history-heading">
        <div><div className="eyebrow">{t.eyebrow}</div><h1>{t.title}</h1><p>{t.help}</p></div>
        <Link className="button button-ghost button-small" href={`/dashboard/history?clinic=${clinic.id}`} prefetch>{t.back}</Link>
      </header>

      {clinics.length > 1 ? (
        <form key={clinic.id} className="clinic-switcher history-clinic-switcher" method="get">
          <label htmlFor="clinic-activity">{t.clinic}</label>
          {filter !== "all" ? <input type="hidden" name="type" value={filter} /> : null}
          <select id="clinic-activity" name="clinic" defaultValue={clinic.id}>{clinics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <button className="button button-ghost button-small" type="submit">{t.open}</button>
        </form>
      ) : null}

      <form className="activity-filters" method="get">
        <input type="hidden" name="clinic" value={clinic.id} />
        <label htmlFor="activity-type">{t.filter}</label>
        <select id="activity-type" name="type" defaultValue={filter}>
          <option value="all">{t.allEvents}</option>
          <option value="appointments">{t.appointmentEvents}</option>
          <option value="smart_fill">{t.smartFillEvents}</option>
          <option value="staff">{t.staffEvents}</option>
        </select>
        <button className="button button-ghost button-small" type="submit">{t.open}</button>
      </form>
      {activityTruncated ? <p className="notice history-limit-notice" role="status">{t.limited.replace("{count}", localizeDigits(ACTIVITY_VIEW_LIMIT, locale))}</p> : null}
      <section className="history-card activity-card" dir={direction}>
        {activityRows.length === 0 ? <div className="history-empty">{filter === "all" ? t.empty : t.noMatches}</div> : activityRows.map((event, index) => {
          const occurredDate = new Date(event.occurred_at);
          const dayKey = dayKeyFormatter.format(occurredDate);
          const previousDay = index > 0 ? dayKeyFormatter.format(new Date(activityRows[index - 1].occurred_at)) : null;
          const before = asState(event.before_state);
          const after = asState(event.after_state);
          const statusAction = event.action === "status_changed" || event.action === "voided";
          const beforeText = statusAction && event.from_status
            ? activityStatusLabel[locale][event.from_status] ?? event.from_status.replaceAll("_", " ")
            : stateText(before, locale);
          const afterText = statusAction && event.to_status
            ? activityStatusLabel[locale][event.to_status] ?? event.to_status.replaceAll("_", " ")
            : stateText(after, locale);
          const actorRole = event.actor_id ? roleByUser.get(event.actor_id) : null;
          const actorLabel = event.actor_id === userData.user.id
            ? t.you
            : event.actor_type === "system"
              ? t.system
              : event.actor_type === "patient"
                ? t.patient
                : event.actor_type === "contact"
                  ? t.contact
                  : actorRole
                    ? roleLabel[locale][actorRole] ?? actorRole
                    : t.unknownStaff;
          const actorReference = event.actor_id
            && event.actor_id !== userData.user.id
            && event.actor_type !== "system"
            && event.actor_type !== "patient"
            && event.actor_type !== "contact"
            ? shortId(event.actor_id)
            : null;
          const entity = event.entity_type === "smart_fill_slot" ? t.smartFill
            : event.entity_type === "staff_invite" || event.entity_type === "staff_membership" ? t.staff
              : t.appointment;
          const detailChanged = Boolean(beforeText && afterText && beforeText !== afterText);
          const detail = detailChanged ? null : afterText ?? beforeText;

          return (
            <div className="activity-entry" key={event.id}>
              {dayKey !== previousDay ? <h2 className="activity-day">{formatBaghdadDay(occurredDate, locale)}</h2> : null}
              <article className={event.action === "voided" || (event.action === "status_changed" && event.to_status === "cancelled") ? "activity-row activity-row-cancelled" : "activity-row"}>
              <div className="activity-main">
                <strong>{eventLabel(event.action, event.to_status, locale)}</strong>
                <span className="activity-actor-line" dir={locale === "en" ? "ltr" : "rtl"}>
                  <span>{actorLabel}</span>
                  {actorReference ? <bdi dir="ltr">{actorReference}</bdi> : null}
                  <span>·</span>
                  <bdi>{formatBaghdadDateTime(new Date(event.occurred_at), locale)}</bdi>
                </span>
              </div>
              <div className="activity-meta">
                <span className="activity-entity-line" dir={locale === "en" ? "ltr" : "rtl"}>
                  <span>{entity}</span>
                  <bdi dir="ltr">{shortId(event.entity_id)}</bdi>
                </span>
                {detailChanged ? (
                  <span className="activity-change-detail" dir={locale === "en" ? "ltr" : "rtl"}>
                    <bdi>{beforeText}</bdi>
                    <span>{transitionArrow}</span>
                    <bdi>{afterText}</bdi>
                  </span>
                ) : detail ? <span>{detail}</span> : null}
              </div>
              </article>
            </div>
          );
        })}
      </section>
      <p className="history-privacy">{t.privacy}</p>

      <style>{`.activity-filters{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:14px 0}.activity-filters label{font-size:13px;font-weight:600}.activity-filters select{max-width:100%;min-height:40px;border:1px solid var(--line);border-radius:10px;padding:8px 12px;background:var(--surface,#fff);color:inherit}.activity-card{display:grid;overflow:hidden}.activity-day{font-size:13px;font-weight:700;color:var(--muted);margin:0;padding:13px 18px;background:var(--surface-2,#f8fafc);border-top:1px solid var(--line)}.activity-entry:first-child .activity-day{border-top:0}.activity-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px 24px;padding:17px 18px;border-top:1px solid var(--line);border-inline-start:3px solid transparent}.activity-row-cancelled{border-inline-start-color:var(--muted)}.activity-main,.activity-meta{display:grid;align-content:start;gap:7px;min-width:0}.activity-main strong{font-size:14px;line-height:1.5}.activity-main span,.activity-meta span{color:var(--muted);font-size:12px;line-height:1.6}.activity-actor-line,.activity-entity-line,.activity-change-detail{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;unicode-bidi:isolate}.activity-actor-line{overflow-wrap:anywhere}.activity-entity-line{font-weight:600}.activity-meta{text-align:end;justify-items:end;min-width:0}.activity-change-detail{font-weight:600}.activity-change-detail bdi{overflow-wrap:anywhere}.activity-change-detail span{font-weight:700;color:var(--muted)}@media(max-width:720px){.activity-row{grid-template-columns:minmax(0,1fr);gap:10px;padding:15px}.activity-day{padding:12px 15px}.activity-meta{text-align:start;justify-items:start}.activity-filters select{flex:1;min-width:150px}}@media(min-width:721px) and (max-width:1050px){.activity-row{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)}}`}</style>
    </main>
  );
}
