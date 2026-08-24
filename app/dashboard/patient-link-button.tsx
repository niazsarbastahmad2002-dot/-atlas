"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { createPatientAccessLink } from "./patient-link-actions";

const initialPatientLinkState = {
  link: null as string | null,
  error: null as string | null,
  patientPhone: null as string | null,
  patientName: null as string | null,
  doctorName: null as string | null,
  appointmentAt: null as string | null,
};

const copy = {
  en: {
    shareAppointment: "Share details",
    creating: "Preparing…",
    help: "Manual backup. The WhatsApp message includes the appointment itself; the private link is only for full details or changes.",
    copy: "Copy details link",
    copied: "Copied ✓",
    whatsapp: "Send on WhatsApp",
    back: "Back",
    title: "Your appointment",
    doctor: "Doctor",
    time: "Time",
    details: "Full details or changes",
  },
  ku: {
    shareAppointment: "زانیاری مەوعید بنێرە",
    creating: "ئامادە دەکرێت…",
    help: "ڕێگای دەستییە. خودی مەوعیدەکە لە پەیامی WhatsApp ـدا دەردەکەوێت؛ بەستەرە تایبەتەکە تەنها بۆ زانیاری تەواو یان گۆڕانکارییە.",
    copy: "بەستەری زانیاری کۆپی بکە",
    copied: "کۆپی کرا ✓",
    whatsapp: "لە WhatsApp بینێرە",
    back: "گەڕانەوە",
    title: "مەوعیدەکەت",
    doctor: "دکتۆر",
    time: "کات",
    details: "زانیاری تەواو یان گۆڕانکاری",
  },
  bd: {
    shareAppointment: "زانیاریێن مەوعیدی بهنێرە",
    creating: "دهێتە ئامادەکرن…",
    help: "ڕێکا دەستییە. خودێ مەوعیدی د پەیاما WhatsApp دا دیار دبیت؛ لینکێ تایبەت تەنێ بۆ زانیاریێن تەمام یان گوهۆڕینێیە.",
    copy: "لینکێ زانیارییان کۆپی بکە",
    copied: "کۆپی بوو ✓",
    whatsapp: "ل WhatsApp بهنێرە",
    back: "ڤەگەرە",
    title: "مەوعیدا تە",
    doctor: "دکتۆر",
    time: "دەم",
    details: "زانیاریێن تەمام یان گوهۆڕین",
  },
  ar: {
    shareAppointment: "إرسال تفاصيل الموعد",
    creating: "جارٍ التجهيز…",
    help: "خيار يدوي احتياطي. تفاصيل الموعد تظهر داخل رسالة واتساب نفسها؛ الرابط الخاص فقط للتفاصيل الكاملة أو التغيير.",
    copy: "نسخ رابط التفاصيل",
    copied: "تم النسخ ✓",
    whatsapp: "إرسال عبر واتساب",
    back: "رجوع",
    title: "موعدك",
    doctor: "الدكتور",
    time: "الوقت",
    details: "التفاصيل الكاملة أو التغيير",
  },
} as const;

const dateLocale: Record<UiLocale, string> = {
  en: "en-IQ",
  ku: "ckb-IQ",
  bd: "ckb-IQ",
  ar: "ar-IQ",
};

function appointmentText(value: string | null, locale: UiLocale) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(dateLocale[locale], {
    timeZone: "Asia/Baghdad",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function PatientLinkButton({
  clinicId,
  appointmentId,
  locale,
}: {
  clinicId: string;
  appointmentId: string;
  locale: UiLocale;
}) {
  const t = copy[locale];
  const [state, action, pending] = useActionState(
    createPatientAccessLink,
    initialPatientLinkState,
  );
  const [copied, setCopied] = useState(false);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (state.link) setShowResult(true);
  }, [state.link]);

  const initialLink = useMemo(() => {
    if (!state.link) return null;
    try {
      const url = new URL(state.link);
      url.searchParams.set("view", "initial");
      return url.toString();
    } catch {
      return state.link;
    }
  }, [state.link]);

  const whatsappUrl = useMemo(() => {
    if (!initialLink || !state.patientPhone) return null;
    const digits = state.patientPhone.replace(/\D/g, "");
    if (!digits) return null;
    const lines = [t.title];
    if (state.doctorName) lines.push(`${t.doctor}: ${state.doctorName}`);
    const when = appointmentText(state.appointmentAt, locale);
    if (when) lines.push(`${t.time}: ${when}`);
    lines.push("", `${t.details}:`, initialLink);
    return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join("\n"))}`;
  }, [initialLink, locale, state.appointmentAt, state.doctorName, state.patientPhone, t]);

  async function copyLink() {
    if (!initialLink) return;
    try {
      await navigator.clipboard.writeText(initialLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="patient-link-control">
      {!state.link ? (
        <form action={action}>
          <input type="hidden" name="clinic_id" value={clinicId} />
          <input type="hidden" name="appointment_id" value={appointmentId} />
          <button type="submit" disabled={pending}>
            {pending ? t.creating : t.shareAppointment}
          </button>
        </form>
      ) : !showResult ? (
        <button type="button" onClick={() => setShowResult(true)}>{t.shareAppointment}</button>
      ) : null}

      {state.error ? <span className="field-help" role="alert">{state.error}</span> : null}

      {state.link && showResult ? (
        <div className="patient-link-result" role="status">
          <div className="patient-link-copy-block">
            <strong>{t.shareAppointment}</strong>
            <p>{t.help}</p>
          </div>
          <div className="patient-link-share-actions">
            {whatsappUrl ? (
              <a className="patient-link-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => setShowResult(false)}>{t.whatsapp}</a>
            ) : null}
            <button type="button" onClick={copyLink}>{copied ? t.copied : t.copy}</button>
            <button className="patient-link-back" type="button" onClick={() => setShowResult(false)}>{t.back}</button>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .patient-link-control { display: contents; }
        .patient-link-result { flex-basis: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 14px; margin-top: 4px; border: 1px solid var(--line); border-radius: 12px; padding: 12px; background: var(--surface-soft); }
        .patient-link-copy-block strong { display: block; margin-bottom: 4px; font-size: 11.5px; }
        .patient-link-copy-block p { margin: 0; color: var(--muted); font-size: 10.5px; line-height: 1.45; }
        .patient-link-share-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
        .patient-link-share-actions button, .patient-link-share-actions a { display: inline-flex; min-height: 38px; align-items: center; justify-content: center; border: 0; border-radius: 9px; padding: 8px 10px; background: #e9efeb; color: var(--ink); font-size: 10px; font-weight: 760; text-decoration: none; cursor: pointer; }
        .patient-link-share-actions .patient-link-whatsapp { background: var(--accent); color: #fff; }
        .patient-link-share-actions .patient-link-back { background: transparent; color: var(--muted); }
        @media (max-width: 720px) { .patient-link-result { grid-template-columns: 1fr; align-items: stretch; } .patient-link-share-actions { width: 100%; justify-content: stretch; } .patient-link-share-actions button, .patient-link-share-actions a { flex: 1; } }
      `}</style>
    </div>
  );
}
