import Link from "next/link";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { formatBaghdadDateTime, type UiLocale } from "@/lib/i18n/ui";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ clinic?: string }> };
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
  you: string;
  empty: string;
  privacy: string;
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
  },
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
  if (status) return status.replaceAll("_", " ");
  const role = typeof state.role === "string" ? state.role : null;
  if (role) return roleLabel[locale][role] ?? role;
  const appointmentAt = typeof state.appointment_at === "string" ? state.appointment_at : null;
  if (appointmentAt) return formatBaghdadDateTime(new Date(appointmentAt), locale);
  const changed = Array.isArray(state.changed_fields)
    ? state.changed_fields.filter((item): item is string => typeof item === "string")
    : [];
  if (changed.length) {
    return changed.map((item) => item.replaceAll("_", " ")).join(", ");
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
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: clinics, error: clinicsError } = await supabase
    .from("clinics")
    .select("id, name, owner_id")
    .order("created_at", { ascending: true });
  if (clinicsError || !clinics?.length) redirect("/dashboard");

  const requestedClinic = params.clinic && isUuid(params.clinic) ? params.clinic : null;
  const clinic = clinics.find((item) => item.id === requestedClinic) ?? clinics[0];
  const { data: membership } = await supabase
    .from("clinic_members")
    .select("role")
    .eq("clinic_id", clinic.id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const canView = clinic.owner_id === userData.user.id || membership?.role === "owner" || membership?.role === "manager";
  if (!canView) redirect(`/dashboard/settings?clinic=${clinic.id}`);

  const [{ data: events, error: eventsError }, { data: members }] = await Promise.all([
    supabase
      .from("appointment_audit_events")
      .select("id, actor_id, actor_type, action, entity_type, entity_id, from_status, to_status, before_state, after_state, occurred_at")
      .eq("clinic_id", clinic.id)
      .order("occurred_at", { ascending: false })
      .limit(250),
    supabase
      .from("clinic_members")
      .select("user_id, role")
      .eq("clinic_id", clinic.id),
  ]);

  if (eventsError) {
    return <main className="center-page"><section className="auth-card"><div className="brand">Atlas</div><h1>{t.title}</h1><p className="notice notice-error">Activity history could not load.</p><Link className="button" href={`/dashboard/history?clinic=${clinic.id}`}>{t.back}</Link></section></main>;
  }

  const roleByUser = new Map((members ?? []).map((member) => [member.user_id, member.role]));

  return (
    <main className="history-page shell">
      <header className="page-heading history-heading">
        <div><div className="eyebrow">{t.eyebrow}</div><h1>{t.title}</h1><p>{t.help}</p></div>
        <Link className="button button-ghost button-small" href={`/dashboard/history?clinic=${clinic.id}`} prefetch>{t.back}</Link>
      </header>

      {clinics.length > 1 ? (
        <form className="clinic-switcher history-clinic-switcher" method="get">
          <label htmlFor="clinic-activity">Clinic</label>
          <select id="clinic-activity" name="clinic" defaultValue={clinic.id}>{clinics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <button className="button button-ghost button-small" type="submit">Open</button>
        </form>
      ) : null}

      <section className="history-card activity-card">
        {(events ?? []).length === 0 ? <div className="history-empty">{t.empty}</div> : (events ?? []).map((event) => {
          const before = asState(event.before_state);
          const after = asState(event.after_state);
          const beforeText = stateText(before, locale);
          const afterText = stateText(after, locale);
          const actorRole = event.actor_id ? roleByUser.get(event.actor_id) : null;
          const actor = event.actor_id === userData.user.id
            ? t.you
            : event.actor_type === "system"
              ? t.system
              : event.actor_type === "patient"
                ? t.patient
                : event.actor_type === "contact"
                  ? t.contact
                  : actorRole
                    ? `${roleLabel[locale][actorRole] ?? actorRole} ${shortId(event.actor_id)}`
                    : event.actor_id
                      ? `${t.formerStaff} ${shortId(event.actor_id)}`
                      : t.formerStaff;
          const entity = event.entity_type === "smart_fill_slot" ? t.smartFill
            : event.entity_type === "staff_invite" || event.entity_type === "staff_membership" ? t.staff
              : t.appointment;
          const detail = beforeText && afterText && beforeText !== afterText
            ? `${beforeText} → ${afterText}`
            : afterText ?? beforeText;

          return (
            <article className="activity-row" key={event.id}>
              <div className="activity-main">
                <strong>{eventLabel(event.action, event.to_status, locale)}</strong>
                <span>{actor} · {formatBaghdadDateTime(new Date(event.occurred_at), locale)}</span>
              </div>
              <div className="activity-meta">
                <span>{entity} {shortId(event.entity_id)}</span>
                {detail ? <span>{detail}</span> : null}
              </div>
            </article>
          );
        })}
      </section>
      <p className="history-privacy">{t.privacy}</p>

      <style>{`.activity-card{display:grid}.activity-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;padding:16px 18px;border-top:1px solid var(--line)}.activity-row:first-child{border-top:0}.activity-main,.activity-meta{display:grid;gap:5px}.activity-main span,.activity-meta span{color:var(--muted);font-size:12px}.activity-meta{text-align:end;justify-items:end}@media(max-width:720px){.activity-row{grid-template-columns:1fr}.activity-meta{text-align:start;justify-items:start}}`}</style>
    </main>
  );
}
