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

const leadOptions = [30, 60, 120, 240, 360, 720, 1440, 2880, 10080];

const copy = {
  en: {
    eyebrow: "Reminders",
    title: "Patient reminders",
    help: "Choose when Atlas should remind patients about their appointment.",
    pending: "Your reminder timing is ready. WhatsApp sending stays off until messaging approval is connected.",
    enabled: "Send WhatsApp reminders automatically",
    enabledHelp: "Only appointments with patient reminder consent are included.",
    first: "First reminder",
    second: "Second reminder",
    optional: "Optional",
    off: "Off",
    before: "before",
    language: "Default patient reminder language",
    recommended: "Recommended default: 1 day before + 2 hours before.",
    failed: "That change did not go through. Your previous settings are still active.",
    approval: "WhatsApp is not connected yet, so automatic sending cannot be turned on.",
    viewOnly: "Only clinic administration can change these settings.",
  },
  ku: {
    eyebrow: "بیرخستنەوە",
    title: "بیرخستنەوەی نەخۆش",
    help: "هەڵبژێرە Atlas کەی بیرخستنەوەی وادە بۆ نەخۆش بنێرێت.",
    pending: "کاتەکانی بیرخستنەوە ئامادەن. ناردنی واتسئاپ تا پەیوەستکردنی پەسەندکردنی پەیام ناچالاک دەمێنێتەوە.",
    enabled: "بیرخستنەوەی واتسئاپ خۆکار بنێرە",
    enabledHelp: "تەنها ئەو وادانەی ڕەزامەندی بیرخستنەوەیان هەیە دەگرێتەوە.",
    first: "بیرخستنەوەی یەکەم",
    second: "بیرخستنەوەی دووەم",
    optional: "ئارەزوومەندانە",
    off: "ناچالاک",
    before: "پێش وادە",
    language: "زمانی بنەڕەتی بیرخستنەوەی نەخۆش",
    recommended: "پێشنیاری بنەڕەتی: ١ ڕۆژ پێش وادە + ٢ کاتژمێر پێش وادە.",
    failed: "گۆڕانکارییەکە نەکرا. ڕێکخستنەکانی پێشوو هەر ماون.",
    approval: "واتسئاپ هێشتا پەیوەست نەکراوە، بۆیە ناردنی خۆکار ناتوانرێت چالاک بکرێت.",
    viewOnly: "تەنها بەڕێوەبردنی کلینیک دەتوانێت ئەم ڕێکخستنانە بگۆڕێت.",
  },
  ar: {
    eyebrow: "التذكيرات",
    title: "تذكيرات المرضى",
    help: "اختر متى يذكّر Atlas المريض بموعده.",
    pending: "توقيت التذكيرات جاهز. يبقى إرسال واتساب متوقفاً حتى ربط موافقة المراسلة.",
    enabled: "إرسال تذكيرات واتساب تلقائياً",
    enabledHelp: "تشمل فقط المواعيد التي وافق فيها المريض على التذكير.",
    first: "التذكير الأول",
    second: "التذكير الثاني",
    optional: "اختياري",
    off: "إيقاف",
    before: "قبل الموعد",
    language: "لغة تذكير المريض الافتراضية",
    recommended: "الإعداد المقترح: قبل يوم + قبل ساعتين.",
    failed: "لم يتم التغيير. بقيت إعداداتك السابقة كما هي.",
    approval: "واتسئاب غير متصل بعد، لذلك لا يمكن تشغيل الإرسال التلقائي.",
    viewOnly: "يمكن لإدارة العيادة فقط تغيير هذه الإعدادات.",
  },
} as const;

const languageLabels = {
  en: { ku: "Kurdish (Sorani)", ar: "Arabic", en: "English" },
  ku: { ku: "کوردی (سۆرانی)", ar: "عەرەبی", en: "ئینگلیزی" },
  ar: { ku: "الكردية (السورانية)", ar: "العربية", en: "الإنجليزية" },
} as const;

function leadLabel(minutes: number, locale: UiLocale) {
  return locale === "en"
    ? `${formatLeadTime(minutes, locale)} before appointment`
    : `${formatLeadTime(minutes, locale)} ${copy[locale].before}`;
}

export function SettingsReminderCard({ clinicId, locale, canManage, initialSettings }: Props) {
  const t = copy[locale];
  const [settings, setSettings] = useState(initialSettings);
  const [saveError, setSaveError] = useState(false);
  const settingsRef = useRef(initialSettings);
  const lastSaved = useRef(initialSettings);
  const saveVersion = useRef(0);

  useEffect(() => {
    settingsRef.current = initialSettings;
    lastSaved.current = initialSettings;
    setSettings(initialSettings);
    setSaveError(false);
  }, [initialSettings]);

  const persist = async (next: ReminderSettings) => {
    const version = ++saveVersion.current;
    let confirmed = next;
    try {
      await queueSettingWrite(async () => {
        const response = await fetch("/api/settings/reminders", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clinicId,
            enabled: next.enabled,
            leadMinutes: next.leadMinutes,
            secondLeadMinutes: next.secondLeadMinutes,
            defaultLanguage: next.defaultLanguage,
          }),
        });
        if (!response.ok) throw new Error("reminder_update_failed");
        const saved = await response.json() as {
          enabled?: boolean;
          leadMinutes?: number;
          secondLeadMinutes?: number | null;
          defaultLanguage?: string;
        };
        if (
          saved.enabled !== next.enabled
          || saved.leadMinutes !== next.leadMinutes
          || saved.secondLeadMinutes !== next.secondLeadMinutes
          || saved.defaultLanguage !== next.defaultLanguage
        ) throw new Error("reminder_not_persisted");
        confirmed = next;
      });

      lastSaved.current = confirmed;
      if (version === saveVersion.current) {
        settingsRef.current = confirmed;
        setSettings(confirmed);
        setSaveError(false);
      }
    } catch {
      if (version !== saveVersion.current) return;
      settingsRef.current = lastSaved.current;
      setSettings(lastSaved.current);
      setSaveError(true);
    }
  };

  const apply = (next: ReminderSettings) => {
    settingsRef.current = next;
    setSettings(next);
    setSaveError(false);
    void persist(next);
  };

  function setFirstReminder(leadMinutes: number) {
    const current = settingsRef.current;
    apply({
      ...current,
      leadMinutes,
      secondLeadMinutes: current.secondLeadMinutes === leadMinutes ? null : current.secondLeadMinutes,
    });
  }

  function setSecondReminder(value: string) {
    const current = settingsRef.current;
    apply({ ...current, secondLeadMinutes: value ? Number(value) : null });
  }

  return (
    <section className="settings-card atlas-reminder-card">
      <div className="settings-card-heading">
        <span className="settings-card-icon" aria-hidden="true">◎</span>
        <div>
          <div className="eyebrow">{t.eyebrow}</div>
          <h2>{t.title}</h2>
          <p>{t.help}</p>
        </div>
      </div>

      <div className="atlas-reminder-form">
        <label className="toggle-row" htmlFor="atlas-reminders-enabled">
          <span>
            <strong>{t.enabled}</strong>
            <small>{settings.approved ? t.enabledHelp : t.approval}</small>
          </span>
          <input
            id="atlas-reminders-enabled"
            type="checkbox"
            checked={settings.enabled}
            disabled={!canManage || !settings.approved}
            onChange={(event) => apply({ ...settingsRef.current, enabled: event.target.checked })}
          />
        </label>

        {!settings.approved ? <p className="reminder-provider-note">{t.pending}</p> : null}

        <div className="atlas-reminder-times">
          <label>
            <span>{t.first}</span>
            <select
              value={settings.leadMinutes}
              disabled={!canManage}
              onChange={(event) => setFirstReminder(Number(event.target.value))}
            >
              {leadOptions.map((minutes) => <option value={minutes} key={minutes}>{leadLabel(minutes, locale)}</option>)}
            </select>
          </label>

          <label>
            <span>{t.second} <small>· {t.optional}</small></span>
            <select
              value={settings.secondLeadMinutes ?? ""}
              disabled={!canManage}
              onChange={(event) => setSecondReminder(event.target.value)}
            >
              <option value="">{t.off}</option>
              {leadOptions.map((minutes) => (
                <option value={minutes} key={minutes} disabled={minutes === settings.leadMinutes}>
                  {leadLabel(minutes, locale)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="atlas-reminder-language">
          <span>{t.language}</span>
          <select
            value={settings.defaultLanguage}
            disabled={!canManage}
            onChange={(event) => apply({ ...settingsRef.current, defaultLanguage: event.target.value })}
          >
            <option value="ku">{languageLabels[locale].ku}</option>
            <option value="ar">{languageLabels[locale].ar}</option>
            <option value="en">{languageLabels[locale].en}</option>
          </select>
        </label>

        <div className="atlas-reminder-footer">
          <p className="field-help">{canManage ? t.recommended : t.viewOnly}</p>
          {saveError ? <span className="atlas-reminder-save is-error" role="alert">{t.failed}</span> : null}
        </div>
      </div>

      <style jsx>{`
        .atlas-reminder-form { display: grid; gap: 14px; }
        .atlas-reminder-form > label,
        .atlas-reminder-times label { display: grid; gap: 7px; color: var(--ink-soft); font-size: 12px; font-weight: 760; }
        .atlas-reminder-times { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .atlas-reminder-times label > span { display: flex; align-items: baseline; gap: 4px; }
        .atlas-reminder-times small { color: var(--muted); font-size: 10px; font-weight: 650; }
        .reminder-provider-note { margin: -2px 0 0; border-radius: 10px; padding: 10px 11px; background: var(--surface-soft); color: var(--muted); font-size: 11px; line-height: 1.5; }
        .atlas-reminder-footer { min-height: 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .atlas-reminder-footer .field-help { margin: 0; }
        .atlas-reminder-save { color: var(--muted); text-align: end; font-size: 11px; font-weight: 780; }
        .atlas-reminder-save.is-error { max-width: 260px; color: var(--danger); }
        @media (max-width: 620px) {
          .atlas-reminder-times { grid-template-columns: 1fr; }
          .atlas-reminder-footer { align-items: flex-start; flex-direction: column; }
          .atlas-reminder-save { min-width: 0; text-align: start; }
        }
      `}</style>
    </section>
  );
}
