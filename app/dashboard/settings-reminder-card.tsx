"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { formatLeadTime } from "@/lib/i18n/format";
import type { UiLocale } from "@/lib/i18n/ui";

type ReminderSettings = {
  enabled: boolean;
  leadMinutes: number;
  secondLeadMinutes: number | null;
  defaultLanguage: string;
  approved: boolean;
  canManage: boolean;
  templateName: string;
  templateLanguage: string;
  dailyMessageLimit: number;
};

const leadOptions = [30, 60, 120, 240, 360, 720, 1440, 2880, 10080];

const copy = {
  en: {
    eyebrow: "Communication",
    title: "Appointment reminders",
    approvedHelp: "Send up to two WhatsApp reminders for each appointment.",
    pendingHelp: "Choose the timing now. WhatsApp sending stays off until provider approval is finished.",
    enabled: "Automatic WhatsApp reminders",
    first: "First reminder",
    second: "Second reminder (optional)",
    off: "Off",
    before: "before appointment",
    language: "Default reminder language",
    saving: "Saving…",
    saved: "Saved",
    failed: "Could not save. Try again.",
    approval: "WhatsApp approval is still pending, so reminders cannot be turned on yet.",
    loading: "Loading reminder settings…",
  },
  ku: {
    eyebrow: "پەیوەندی",
    title: "بیرخستنەوەی وادە",
    approvedHelp: "بۆ هەر وادەیەک تا دوو بیرخستنەوەی واتسئاپ بنێرە.",
    pendingHelp: "کاتەکان ئێستا هەڵبژێرە. ناردنی واتسئاپ تا تەواوبوونی پەسەندکردنی دابینکەر ناچالاک دەمێنێتەوە.",
    enabled: "بیرخستنەوەی خۆکاری واتسئاپ",
    first: "بیرخستنەوەی یەکەم",
    second: "بیرخستنەوەی دووەم (ئارەزوومەندانە)",
    off: "ناچالاک",
    before: "پێش وادە",
    language: "زمانی بنەڕەتی بیرخستنەوە",
    saving: "پاشەکەوت دەکرێت…",
    saved: "پاشەکەوت کرا",
    failed: "پاشەکەوت نەکرا. دووبارە هەوڵ بدە.",
    approval: "پەسەندکردنی واتسئاپ هێشتا تەواو نەبووە، بۆیە ناتوانرێت بیرخستنەوەکان چالاک بکرێن.",
    loading: "ڕێکخستنەکانی بیرخستنەوە بار دەبن…",
  },
  ar: {
    eyebrow: "التواصل",
    title: "تذكيرات المواعيد",
    approvedHelp: "أرسل ما يصل إلى تذكيرين عبر واتساب لكل موعد.",
    pendingHelp: "اختر التوقيت الآن. يبقى إرسال واتساب متوقفاً حتى اكتمال موافقة المزود.",
    enabled: "تذكيرات واتساب التلقائية",
    first: "التذكير الأول",
    second: "التذكير الثاني (اختياري)",
    off: "إيقاف",
    before: "قبل الموعد",
    language: "لغة التذكير الافتراضية",
    saving: "جارٍ الحفظ…",
    saved: "تم الحفظ",
    failed: "تعذر الحفظ. حاول مرة أخرى.",
    approval: "موافقة واتساب ما زالت معلقة، لذلك لا يمكن تشغيل التذكيرات بعد.",
    loading: "جارٍ تحميل إعدادات التذكير…",
  },
} as const;

const languageLabels = {
  en: { ku: "Kurdish (Sorani)", ar: "Arabic", en: "English" },
  ku: { ku: "کوردی (سۆرانی)", ar: "عەرەبی", en: "ئینگلیزی" },
  ar: { ku: "الكردية (السورانية)", ar: "العربية", en: "الإنجليزية" },
} as const;

function reminderLeadLabel(minutes: number, locale: UiLocale) {
  return `${formatLeadTime(minutes, locale)} ${copy[locale].before}`;
}

export function SettingsReminderCard({ locale }: { locale: UiLocale }) {
  const pathname = usePathname();
  const router = useRouter();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [clinicId, setClinicId] = useState("");
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const hydrated = useRef(false);
  const saveVersion = useRef(0);

  const t = copy[locale];

  useEffect(() => {
    if (!pathname.startsWith("/dashboard/settings")) return;

    const oldLead = document.querySelector<HTMLSelectElement>("#lead_minutes");
    const oldCard = oldLead?.closest<HTMLElement>(".settings-card") ?? null;
    const grid = document.querySelector<HTMLElement>(".settings-grid");
    const hiddenClinic = oldLead?.form?.querySelector<HTMLInputElement>('input[name="clinic_id"]');
    const id = hiddenClinic?.value ?? new URLSearchParams(window.location.search).get("clinic") ?? "";

    if (oldCard) oldCard.hidden = true;
    if (grid) setTarget(grid);
    if (id) setClinicId(id);

    const manageLink = document.querySelector<HTMLAnchorElement>('a.settings-link[href*="/dashboard/staff"]');
    let manageHref = "";
    let onManage: ((event: MouseEvent) => void) | null = null;
    if (manageLink) {
      manageHref = manageLink.getAttribute("href") ?? "";
      if (manageHref) {
        router.prefetch(manageHref);
        onManage = (event: MouseEvent) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          router.push(manageHref);
        };
        manageLink.addEventListener("click", onManage);
      }
    }

    return () => {
      if (oldCard) oldCard.hidden = false;
      if (manageLink && onManage) manageLink.removeEventListener("click", onManage);
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!clinicId) return;
    let cancelled = false;
    setLoadError(false);

    void fetch(`/api/settings/reminders?clinic=${encodeURIComponent(clinicId)}`, {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("load_failed");
        return response.json() as Promise<ReminderSettings>;
      })
      .then((data) => {
        if (cancelled) return;
        hydrated.current = false;
        setSettings(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => { cancelled = true; };
  }, [clinicId]);

  const payload = useMemo(() => settings ? {
    clinicId,
    enabled: settings.enabled,
    leadMinutes: settings.leadMinutes,
    secondLeadMinutes: settings.secondLeadMinutes,
    defaultLanguage: settings.defaultLanguage,
  } : null, [clinicId, settings]);

  useEffect(() => {
    if (!payload || !settings?.canManage) return;
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }

    const version = ++saveVersion.current;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      void fetch("/api/settings/reminders", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (response) => {
        if (version !== saveVersion.current) return;
        if (!response.ok) {
          if (response.status === 409) setSettings((current) => current ? { ...current, enabled: false } : current);
          setSaveState("error");
          return;
        }
        setSaveState("saved");
        window.setTimeout(() => {
          if (version === saveVersion.current) setSaveState("idle");
        }, 1200);
      }).catch(() => {
        if (version === saveVersion.current) setSaveState("error");
      });
    }, 220);

    return () => window.clearTimeout(timer);
  }, [payload, settings?.canManage]);

  if (!pathname.startsWith("/dashboard/settings") || !target) return null;

  const content = (
    <section className="settings-card atlas-reminder-card">
      <div className="settings-card-heading">
        <span className="settings-card-icon" aria-hidden="true">◎</span>
        <div>
          <div className="eyebrow">{t.eyebrow}</div>
          <h2>{t.title}</h2>
          <p>{settings?.approved ? t.approvedHelp : t.pendingHelp}</p>
        </div>
      </div>

      {!settings ? (
        <p className={`quiet ${loadError ? "notice notice-error" : ""}`}>{loadError ? t.failed : t.loading}</p>
      ) : (
        <div className="atlas-reminder-form">
          <label className="toggle-row" htmlFor="atlas-reminders-enabled">
            <span>
              <strong>{t.enabled}</strong>
              <small>{settings.approved ? t.approvedHelp : t.approval}</small>
            </span>
            <input
              id="atlas-reminders-enabled"
              type="checkbox"
              checked={settings.enabled}
              disabled={!settings.canManage || !settings.approved}
              onChange={(event) => setSettings((current) => current ? { ...current, enabled: event.target.checked } : current)}
            />
          </label>

          <div className="atlas-reminder-times">
            <label>
              <span>{t.first}</span>
              <select
                value={settings.leadMinutes}
                disabled={!settings.canManage}
                onChange={(event) => {
                  const leadMinutes = Number(event.target.value);
                  setSettings((current) => current ? {
                    ...current,
                    leadMinutes,
                    secondLeadMinutes: current.secondLeadMinutes === leadMinutes ? null : current.secondLeadMinutes,
                  } : current);
                }}
              >
                {leadOptions.map((minutes) => <option value={minutes} key={minutes}>{reminderLeadLabel(minutes, locale)}</option>)}
              </select>
            </label>

            <label>
              <span>{t.second}</span>
              <select
                value={settings.secondLeadMinutes ?? ""}
                disabled={!settings.canManage}
                onChange={(event) => setSettings((current) => current ? {
                  ...current,
                  secondLeadMinutes: event.target.value ? Number(event.target.value) : null,
                } : current)}
              >
                <option value="">{t.off}</option>
                {leadOptions.map((minutes) => (
                  <option value={minutes} key={minutes} disabled={minutes === settings.leadMinutes}>
                    {reminderLeadLabel(minutes, locale)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            <span>{t.language}</span>
            <select
              value={settings.defaultLanguage}
              disabled={!settings.canManage}
              onChange={(event) => setSettings((current) => current ? { ...current, defaultLanguage: event.target.value } : current)}
            >
              <option value="ku">{languageLabels[locale].ku}</option>
              <option value="ar">{languageLabels[locale].ar}</option>
              <option value="en">{languageLabels[locale].en}</option>
            </select>
          </label>

          <div className="atlas-reminder-footer">
            <p className="field-help">Template: {settings.templateName} · {settings.templateLanguage} · limit {settings.dailyMessageLimit}/day</p>
            <span className={`atlas-reminder-save is-${saveState}`} role={saveState === "error" ? "alert" : "status"}>
              {saveState === "saving" ? t.saving : saveState === "saved" ? t.saved : saveState === "error" ? t.failed : ""}
            </span>
          </div>
        </div>
      )}

      <style jsx>{`
        .atlas-reminder-form { display: grid; gap: 13px; }
        .atlas-reminder-form > label,
        .atlas-reminder-times label { display: grid; gap: 7px; color: var(--ink-soft); font-size: 12px; font-weight: 760; }
        .atlas-reminder-times { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .atlas-reminder-footer { min-height: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .atlas-reminder-footer .field-help { margin: 0; }
        .atlas-reminder-save { min-width: 92px; color: var(--muted); text-align: end; font-size: 11px; font-weight: 760; }
        .atlas-reminder-save.is-saved { color: var(--success); }
        .atlas-reminder-save.is-error { color: var(--danger); }
        @media (max-width: 620px) {
          .atlas-reminder-times { grid-template-columns: 1fr; }
          .atlas-reminder-footer { align-items: flex-start; flex-direction: column; }
          .atlas-reminder-save { min-width: 0; text-align: start; }
        }
      `}</style>
    </section>
  );

  return createPortal(content, target);
}
