"use client";

import { useActionState, useState } from "react";
import { uiText, type UiLocale } from "@/lib/i18n/ui";
import { createPatientAccessLink } from "./patient-link-actions";

const initialPatientLinkState = {
  link: null as string | null,
  error: null as string | null,
};

export function PatientLinkButton({
  clinicId,
  appointmentId,
  locale,
}: {
  clinicId: string;
  appointmentId: string;
  locale: UiLocale;
}) {
  const t = uiText(locale);
  const [state, action, pending] = useActionState(
    createPatientAccessLink,
    initialPatientLinkState,
  );
  const [copied, setCopied] = useState(false);
  const creating = locale === "ku" ? "بەستەر دروست دەکرێت…" : locale === "ar" ? "جارٍ إنشاء الرابط…" : "Creating link…";
  const copy = locale === "ku" ? "کۆپی" : locale === "ar" ? "نسخ" : "Copy";
  const copiedLabel = locale === "ku" ? "کۆپی کرا" : locale === "ar" ? "تم النسخ" : "Copied";

  async function copyLink() {
    if (!state.link) return;
    try {
      await navigator.clipboard.writeText(state.link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="patient-link-control">
      <form action={action}>
        <input type="hidden" name="clinic_id" value={clinicId} />
        <input type="hidden" name="appointment_id" value={appointmentId} />
        <button type="submit" disabled={pending}>
          {pending ? creating : t.patientLink}
        </button>
      </form>
      {state.error ? <span className="field-help" role="alert">{state.error}</span> : null}
      {state.link ? (
        <div className="patient-link-result">
          <input aria-label={t.patientLink} readOnly value={state.link} dir="ltr" />
          <button type="button" onClick={copyLink}>{copied ? copiedLabel : copy}</button>
        </div>
      ) : null}
    </div>
  );
}
