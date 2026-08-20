"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { createPatientAccessLink } from "./patient-link-actions";

const initialPatientLinkState = {
  link: null as string | null,
  error: null as string | null,
  patientPhone: null as string | null,
  patientName: null as string | null,
};

const copy = {
  en: {
    shareAppointment: "Share appointment",
    creating: "Preparing…",
    help: "Manual backup until automatic WhatsApp is active.",
    copy: "Copy link",
    copied: "Copied ✓",
    whatsapp: "Send on WhatsApp",
    back: "Back",
    message: "Your Atlas appointment:",
  },
  ku: {
    shareAppointment: "ناردنی کات",
    creating: "ئامادە دەکرێت…",
    help: "ڕێگای جێگرەوە تا واتسئەپە خۆکارەکە چالاک دەبێت.",
    copy: "بەستەر کۆپی بکە",
    copied: "کۆپی کرا ✓",
    whatsapp: "لە واتسئەپ بینێرە",
    back: "گەڕانەوە",
    message: "کاتی پزیشکی تۆ لە Atlas:",
  },
  bd: {
    shareAppointment: "وادەیێ پارڤە بکە",
    creating: "دهێتە ئامادەکرن…",
    help: "تا واتسئاپ خودکار چالاک دبیت، ئەڤە ڕێکا دەستییە.",
    copy: "لینکێ کۆپی بکە",
    copied: "کۆپی بوو ✓",
    whatsapp: "ل واتسئاپێ بهنێرە",
    back: "ڤەگەرە",
    message: "وادەیا تە ل Atlas:",
  },
  ar: {
    shareAppointment: "مشاركة الموعد",
    creating: "جارٍ التجهيز…",
    help: "خيار احتياطي إلى أن يعمل واتساب تلقائياً.",
    copy: "نسخ الرابط",
    copied: "تم النسخ ✓",
    whatsapp: "إرسال عبر واتساب",
    back: "رجوع",
    message: "موعدك في Atlas:",
  },
} as const;

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
    const message = `${t.message}\n${initialLink}`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }, [initialLink, state.patientPhone, t.message]);

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
