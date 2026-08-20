"use client";

import { useEffect, useRef, useState } from "react";
import { formatLeadTime } from "@/lib/i18n/format";
import type { UiLocale } from "@/lib/i18n/ui";
import { queueSettingWrite } from "./setting-write-barrier";

type ReminderSettings = {
  enabled: boolean;
  leadMinutes: number;
  secondLeadMinutes: number | null;
  defaultLanguage: string;
  approved: boolean;
};

type Props = {
  clinicId: string;
  locale: UiLocale;
  canManage: boolean;
  initialSettings: ReminderSettings;
};

type Workflow = {
  doctorId: string;
  doctorName: string;
  remindersEnabled: boolean;
  reminderLeadMinutes: number;
  reminderSecondLeadMinutes: number | null;
  defaultReminderLanguage: string;
  messagingApproved: boolean;
};

const leadOptions = [30, 60, 120, 240, 360, 720, 1440, 2880, 10080];
const copy = {
  en: {
    eyebrow: "Reminders", title: "Patient reminders", help: "These settings belong to the selected doctor.",
    enabled: "Send WhatsApp reminders automatically", enabledHelp: "Only appointments with patient reminder consent are included.",
    waiting: "Reminder timing is saved. Automatic WhatsApp sending will start after messaging approval is connected.",
    first: "First reminder", second: "Second reminder", optional: "Optional", off: "Off", before: "before appointment",
    language: "Default patient reminder language", saved: "Saved", failed: "That change did not go through. Try again.", loading: "Loading doctor settings…",
  },
  ku: {
    eyebrow: "بیرخستنەوە", title: "بیرخستنەوەی نەخۆش", help: "ئەم ڕێکخستنانە تایبەتن بە پزیشکی هەڵبژێردراو.",
    enabled: "بیرخستنەوەی واتسئاپ خۆکار بنێرە", enabledHelp: "تەنها وادەکانی ڕەزامەندی نەخۆش دەگرێتەوە.",
    waiting: "کاتەکانی بیرخستنەوە پاشەکەوت کراون. ناردنی خۆکار دوای پەسەندکردنی پەیام دەست پێدەکات.",
    first: "بیرخستنەوەی یەکەم", second: "بیرخستنەوەی دووەم", optional: "ئارەزوومەندانە", off: "ناچالاک", before: "پێش وادە",
    language: "زمانی بنەڕەتی بیرخستنەوە", saved: "پاشەکەوت کرا", failed: "گۆڕانکارییەکە نەکرا. دووبارە هەوڵ بدە.", loading: "ڕێکخستنەکانی پزیشک دەهێنرێن…",
  },
  bd: {
    eyebrow: "بیرخستنەوە", title: "بیرخستنەوەیێن نەخۆشی", help: "ئەڤ ڕێکخستن بۆ دکتۆرێ هەلبژارتی نە.",
    enabled: "بیرخستنەوەیێن واتسئاپێ خودکار بهنێرە", enabledHelp: "تەنێ وادەیێن کو نەخۆش ڕازی بووی دگرنە خۆ.",
    waiting: "دەمێن بیرخستنەوەیێ هاتنە پاراستن. هنارتنا خودکار پشتی پەسەندکرنا پەیامان دەست پێ دکەت.",
    first: "بیرخستنەوەیا ئێکێ", second: "بیرخستنەوەیا دوویێ", optional: "ئارەزوومەندانە", off: "نەچالاک", before: "بەری وادەیێ",
    language: "زمانێ سەرەکی یێ بیرخستنەوەیا نەخۆشی", saved: "هاتە پاراستن", failed: "گۆڕین نەبوو. دووبارە هەول بدە.", loading: "ڕێکخستنێن دکتۆری دهێنە بارکرن…",
  },
  ar: {
    eyebrow: "التذكيرات", title: "تذكيرات المرضى", help: "هذه الإعدادات خاصة بالطبيب المحدد.",
    enabled: "إرسال تذكيرات واتساب تلقائياً", enabledHelp: "تشمل فقط المواعيد التي وافق فيها المريض على التذكير.",
    waiting: "تم حفظ توقيت التذكيرات. يبدأ إرسال واتساب تلقائياً بعد اكتمال موافقة المراسلة.",
    first: "التذكير الأول", second: "التذكير الثاني", optional: "اختياري", off: "إيقاف", before: "قبل الموعد",
    language: "لغة تذكير المريض الافتراضية", saved: "تم الحفظ", failed: "لم يتم حفظ التغيير. حاول مرة أخرى.", loading: "جارٍ تحميل إعدادات الطبيب…",
  },
} as const;

const languageLabels = {
  en: { ku: "Kurdish (Sorani)", bd: "Kurdish (Badini)", ar: "Iraqi Arabic", en: "English" },
  ku: { ku: "کوردی (سۆرانی)", bd: "کوردی (بادینی)", ar: "عەرەبی (عێراقی)", en: "ئینگلیزی" },
  bd: { ku: "کوردی (سۆرانی)", bd: "کوردی (بادینی)", ar: "عەرەبی (عێراقی)", en: "ئینگلیزی" },
  ar: { ku: "الكردية (السورانية)", bd: "الكردية (البادينية)", ar: "العربية العراقية", en: "الإنجليزية" },
} as const;

function leadLabel(minutes: number, locale: UiLocale) {
  return `${formatLeadTime(minutes, locale)} ${copy[locale].before}`;
}

function rememberedDoctorId() {
  try {
    const direct = document.querySelector<HTMLSelectElement>("#appointment_interval_minutes")?.dataset.atlasDoctorId;
    if (direct) return direct;
    const href = window.localStorage.getItem("atlas:last-schedule-href") ?? "";
    return new URL(href || "/dashboard", window.location.origin).searchParams.get("doctor") ?? "";
  } catch { return ""; }
}

export function SettingsReminderCard({ clinicId, locale }: Props) {
  const t = copy[locale];
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const version = useRef(0);

  const load = async (doctorId = rememberedDoctorId()) => {
    const params = new URLSearchParams({ clinic_id: clinicId });
    if (doctorId) params.set("doctor_id", doctorId);
    const response = await fetch(`/api/settings/doctor-workflow?${params}`, { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json() as Workflow;
    setWorkflow(data);
    setSaveError(false);
  };

  useEffect(() => {
    void load();
    const onChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement) || !target.closest("[data-atlas-doctor-settings-picker]")) return;
      window.setTimeout(() => { void load(target.value); }, 0);
    };
    document.addEventListener("change", onChange);
    return () => document.removeEventListener("change", onChange);
  }, [clinicId]);

  const persist = (patch: Record<string, unknown>, optimistic: (current: Workflow) => Workflow) => {
    if (!workflow) return;
    const currentVersion = ++version.current;
    const before = workflow;
    const next = optimistic(before);
    setWorkflow(next);
    setSaving(true);
    setSaveError(false);
    void queueSettingWrite(async () => {
      const response = await fetch("/api/settings/doctor-workflow", {
        method: "POST", credentials: "same-origin", cache: "no-store", keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, doctorId: before.doctorId, ...patch }),
      });
      if (!response.ok) throw new Error("save_failed");
      const saved = await response.json() as Partial<Workflow>;
      if (currentVersion !== version.current) return;
      setWorkflow((value) => value ? { ...value, ...saved } : value);
    }).catch(() => {
      if (currentVersion !== version.current) return;
      setWorkflow(before);
      setSaveError(true);
    }).finally(() => {
      if (currentVersion === version.current) setSaving(false);
    });
  };

  return (
    <section className="settings-card atlas-reminder-card">
      <div className="settings-card-heading">
        <span className="settings-card-icon" aria-hidden="true">◎</span>
        <div><div className="eyebrow">{t.eyebrow}</div><h2>{t.title}</h2><p>{workflow ? `${t.help} ${workflow.doctorName}` : t.loading}</p></div>
      </div>

      {workflow ? <div className="atlas-reminder-form">
        <label className="toggle-row" htmlFor="atlas-reminders-enabled">
          <span><strong>{t.enabled}</strong><small>{t.enabledHelp}</small></span>
          <input id="atlas-reminders-enabled" type="checkbox" checked={workflow.remindersEnabled}
            onChange={(event) => persist({ remindersEnabled: event.target.checked }, (current) => ({ ...current, remindersEnabled: event.target.checked }))} />
        </label>

        {!workflow.messagingApproved ? <p className="reminder-provider-note">{t.waiting}</p> : null}

        <div className="atlas-reminder-times">
          <label><span>{t.first}</span><select value={workflow.reminderLeadMinutes}
            onChange={(event) => {
              const value = Number(event.target.value);
              persist({ reminderLeadMinutes: value }, (current) => ({ ...current, reminderLeadMinutes: value, reminderSecondLeadMinutes: current.reminderSecondLeadMinutes === value ? null : current.reminderSecondLeadMinutes }));
            }}>
            {leadOptions.map((minutes) => <option value={minutes} key={minutes}>{leadLabel(minutes, locale)}</option>)}
          </select></label>

          <label><span>{t.second} <small>· {t.optional}</small></span><select value={workflow.reminderSecondLeadMinutes ?? ""}
            onChange={(event) => {
              const value = event.target.value ? Number(event.target.value) : null;
              persist({ reminderSecondLeadMinutes: value }, (current) => ({ ...current, reminderSecondLeadMinutes: value }));
            }}>
            <option value="">{t.off}</option>
            {leadOptions.filter((minutes) => minutes !== workflow.reminderLeadMinutes).map((minutes) => <option value={minutes} key={minutes}>{leadLabel(minutes, locale)}</option>)}
          </select></label>
        </div>

        <label><span>{t.language}</span><select value={workflow.defaultReminderLanguage}
          onChange={(event) => {
            const value = event.target.value;
            persist({ defaultReminderLanguage: value }, (current) => ({ ...current, defaultReminderLanguage: value }));
          }}>
          {Object.entries(languageLabels[locale]).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select></label>

        <p className={saveError ? "notice notice-error" : "field-help"}>{saveError ? t.failed : saving ? "…" : t.saved}</p>
      </div> : null}

      <style>{`
        .atlas-reminder-form{display:grid;gap:12px}.atlas-reminder-times{display:grid;grid-template-columns:1fr 1fr;gap:12px}.atlas-reminder-form label:not(.toggle-row){display:grid;gap:6px;font-size:12px;font-weight:800}.atlas-reminder-form select{min-height:44px;border:1px solid var(--line-strong);border-radius:12px;padding:8px 12px;background:#fff;color:var(--ink);font:inherit}.reminder-provider-note{margin:0;border-radius:11px;padding:9px 11px;background:var(--surface-soft);color:var(--muted);font-size:11px;line-height:1.5}@media(max-width:620px){.atlas-reminder-times{grid-template-columns:1fr}}
      `}</style>
    </section>
  );
}
