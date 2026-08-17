"use client";

import { useActionState, useEffect, useState } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { createPatientAccessLink } from "./patient-link-actions";

const initialPatientLinkState = {
  link: null as string | null,
  error: null as string | null,
};

const copy = {
  en: {
    shareAppointment: "Share appointment",
    creating: "Preparing link…",
    help: "This private link lets the patient view, confirm, or cancel only this appointment.",
    copy: "Copy link",
    copied: "Copied ✓",
    share: "Share",
    shareTitle: "Atlas appointment",
  },
  ku: {
    shareAppointment: "وادەکە بنێرە",
    creating: "بەستەر ئامادە دەکرێت…",
    help: "ئەم بەستەرە تایبەتە تەنها ڕێگە بە نەخۆش دەدات ئەم وادەیە ببینێت، پشتڕاستی بکاتەوە یان هەڵیوەشێنێتەوە.",
    copy: "بەستەر کۆپی بکە",
    copied: "کۆپی کرا ✓",
    share: "ناردن",
    shareTitle: "وادەی Atlas",
  },
  ar: {
    shareAppointment: "مشاركة الموعد",
    creating: "جارٍ تجهيز الرابط…",
    help: "هذا الرابط الخاص يتيح للمريض عرض هذا الموعد فقط وتأكيده أو إلغاءه.",
    copy: "نسخ الرابط",
    copied: "تم النسخ ✓",
    share: "مشاركة",
    shareTitle: "موعد Atlas",
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
      await navigator.share({ title: t.shareTitle, url: state.link });
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
          <p className="patient-link-help">{t.help}</p>
          <div className="patient-link-share-actions">
            <button type="button" onClick={copyLink}>{copied ? t.copied : t.copy}</button>
            {canShare ? <button type="button" onClick={shareLink} disabled={sharing}>{t.share}</button> : null}
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .patient-link-control { display: contents; }
        .patient-link-result {
          flex-basis: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 2px;
          border-radius: 10px;
          padding: 10px 11px;
          background: var(--surface-soft);
        }
        .patient-link-help { margin: 0; color: var(--muted); font-size: 10.5px; line-height: 1.45; }
        .patient-link-share-actions { display: flex; flex: none; gap: 6px; }
        .patient-link-share-actions button { min-height: 38px; }
        @media (max-width: 620px) {
          .patient-link-result { align-items: stretch; flex-direction: column; }
          .patient-link-share-actions { width: 100%; }
          .patient-link-share-actions button { flex: 1; }
        }
      `}</style>
    </div>
  );
}
