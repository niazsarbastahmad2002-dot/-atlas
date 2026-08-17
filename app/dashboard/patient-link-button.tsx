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
    help: "Backup while automatic WhatsApp is not active. The patient sees only this appointment and can respond.",
    shareHelp: "Open WhatsApp, review the message, then send it.",
    copy: "Copy link",
    copied: "Copied ✓",
    share: "Share…",
    whatsapp: "Open WhatsApp",
    shareTitle: "Atlas appointment",
    message: "Your Atlas appointment:",
  },
  ku: {
    shareAppointment: "ناردنی کات",
    creating: "ئامادە دەکرێت…",
    help: "تا واتسئەپە خۆکارەکە چالاک دەبێت، ئەمە ڕێگای جێگرەوەیە. نەخۆش تەنها ئەم کاتە دەبینێت و دەتوانێت وەڵام بدات.",
    shareHelp: "واتسئەپ بکەرەوە، پەیامەکە ببینە، پاشان بینێرە.",
    copy: "بەستەر کۆپی بکە",
    copied: "کۆپی کرا ✓",
    share: "ناردن…",
    whatsapp: "واتسئەپ بکەرەوە",
    shareTitle: "کاتی Atlas",
    message: "کاتی پزیشکی تۆ لە Atlas:",
  },
  ar: {
    shareAppointment: "مشاركة الموعد",
    creating: "جارٍ التجهيز…",
    help: "خيار احتياطي إلى أن يعمل واتساب تلقائياً. يرى المريض هذا الموعد فقط ويمكنه الرد.",
    shareHelp: "افتح واتساب، راجع الرسالة، ثم أرسلها.",
    copy: "نسخ الرابط",
    copied: "تم النسخ ✓",
    share: "مشاركة…",
    whatsapp: "فتح واتساب",
    shareTitle: "موعد Atlas",
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
  const [sharing, setSharing] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const whatsappUrl = useMemo(() => {
    if (!state.link || !state.patientPhone) return null;
    const digits = state.patientPhone.replace(/\D/g, "");
    if (!digits) return null;
    const message = `${t.message}\n${state.link}`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }, [state.link, state.patientPhone, t.message]);

  async function copyLink() {
    if (!state.link) return;
    try {
      await navigator.clipboard.writeText(state.link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function shareLink() {
    if (!state.link || !canShare) return;
    setSharing(true);
    try {
      await navigator.share({
        title: t.shareTitle,
        text: t.message,
        url: state.link,
      });
    } catch {
      // Closing the native share sheet is not an error the receptionist needs to see.
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="patient-link-control">
      <form action={action}>
        <input type="hidden" name="clinic_id" value={clinicId} />
        <input type="hidden" name="appointment_id" value={appointmentId} />
        <button type="submit" disabled={pending}>
          {pending ? t.creating : t.shareAppointment}
        </button>
      </form>

      {state.error ? <span className="field-help" role="alert">{state.error}</span> : null}

      {state.link ? (
        <div className="patient-link-result" role="status">
          <div className="patient-link-copy-block">
            <strong>{t.shareAppointment}</strong>
            <p className="patient-link-help">{t.help}</p>
            <p className="patient-link-send-help">{t.shareHelp}</p>
          </div>
          <div className="patient-link-share-actions">
            {whatsappUrl ? <a className="patient-link-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer">{t.whatsapp}</a> : null}
            {canShare ? <button type="button" onClick={shareLink} disabled={sharing}>{t.share}</button> : null}
            <button type="button" onClick={copyLink}>{copied ? t.copied : t.copy}</button>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .patient-link-control { display: contents; }
        .patient-link-result {
          flex-basis: 100%;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
          margin-top: 4px;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px;
          background: var(--surface-soft);
        }
        .patient-link-copy-block strong { display: block; margin-bottom: 4px; font-size: 11.5px; }
        .patient-link-help, .patient-link-send-help { margin: 0; color: var(--muted); font-size: 10.5px; line-height: 1.45; }
        .patient-link-send-help { margin-top: 5px; color: #7d8982; }
        .patient-link-share-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
        .patient-link-share-actions button, .patient-link-share-actions a {
          display: inline-flex;
          min-height: 38px;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 9px;
          padding: 8px 10px;
          background: #e9efeb;
          color: var(--ink);
          font-size: 10px;
          font-weight: 760;
          text-decoration: none;
          cursor: pointer;
        }
        .patient-link-share-actions .patient-link-whatsapp { background: var(--accent); color: #fff; }
        @media (max-width: 720px) {
          .patient-link-result { grid-template-columns: 1fr; align-items: stretch; }
          .patient-link-share-actions { width: 100%; justify-content: stretch; }
          .patient-link-share-actions button, .patient-link-share-actions a { flex: 1; }
        }
      `}</style>
    </div>
  );
}
