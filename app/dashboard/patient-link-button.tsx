"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { formatBaghdadDateTime, type UiLocale } from "@/lib/i18n/ui";
import { createPatientAccessLink } from "./patient-link-actions";

type PatientLinkError = "invalid" | "signed_out" | "unavailable" | "failed" | "not_configured";

const initialPatientLinkState = {
  link: null as string | null,
  error: null as PatientLinkError | null,
  patientPhone: null as string | null,
  patientName: null as string | null,
  doctorName: null as string | null,
  appointmentAt: null as string | null,
};

const copy = {
  en: {
    shareShort: "Share",
    shareAppointment: "Share appointment details",
    creating: "Preparing…",
    help: "Manual backup. The WhatsApp message includes the appointment itself; the private link is only for full details or changes.",
    copy: "Copy details link",
    copied: "Copied ✓",
    copyFailed: "Could not copy automatically. Select the link below and copy it manually.",
    whatsapp: "Send on WhatsApp",
    back: "Back",
    title: "Your appointment",
    doctor: "Doctor",
    time: "Time",
    details: "Full details or changes",
    errors: { invalid: "Could not prepare this share link.", signed_out: "Sign in again before sharing.", unavailable: "This appointment is unavailable.", failed: "Could not prepare the share link. Try again.", not_configured: "Patient sharing is not configured on this deployment." },
  },
  ku: {
    shareShort: "ناردن",
    shareAppointment: "زانیاری مەوعید بنێرە",
    creating: "ئامادە دەکرێت…",
    help: "ڕێگای دەستییە. خودی مەوعیدەکە لە پەیامی WhatsApp ـدا دەردەکەوێت؛ بەستەرە تایبەتەکە تەنها بۆ زانیاری تەواو یان گۆڕانکارییە.",
    copy: "بەستەری زانیاری کۆپی بکە",
    copied: "کۆپی کرا ✓",
    copyFailed: "بەستەرەکە کۆپی نەکرا. بەستەرەکەی خوارەوە دیاری بکە و بە دەستی کۆپی بکە.",
    whatsapp: "لە WhatsApp بینێرە",
    back: "گەڕانەوە",
    title: "مەوعیدەکەت",
    doctor: "دکتۆر",
    time: "کات",
    details: "زانیاری تەواو یان گۆڕانکاری",
    errors: { invalid: "بەستەری ناردن ئامادە نەکرا.", signed_out: "پێش ناردن دووبارە بچۆ ژوورەوە.", unavailable: "ئەم مەوعیدە بەردەست نییە.", failed: "بەستەری ناردن ئامادە نەکرا. دووبارە هەوڵ بدەوە.", not_configured: "ناردنی زانیاری نەخۆش لەم وەشانەدا ڕێک نەخراوە." },
  },
  bd: {
    shareShort: "هنارتن",
    shareAppointment: "زانیاریێن مەوعیدی بهنێرە",
    creating: "دهێتە ئامادەکرن…",
    help: "ڕێکا دەستییە. خودێ مەوعیدی د پەیاما WhatsApp دا دیار دبیت؛ لینکێ تایبەت تەنێ بۆ زانیاریێن تەمام یان گوهۆڕینێیە.",
    copy: "لینکێ زانیارییان کۆپی بکە",
    copied: "کۆپی بوو ✓",
    copyFailed: "لینک نەهاتە کۆپیکرن. لینکێ ل خوارێ هەلبژێرە و ب دەستی کۆپی بکە.",
    whatsapp: "ل WhatsApp بهنێرە",
    back: "ڤەگەرە",
    title: "مەوعیدا تە",
    doctor: "دکتۆر",
    time: "دەم",
    details: "زانیاریێن تەمام یان گوهۆڕین",
    errors: { invalid: "لینکێ هنارتنێ نەهاتە ئامادەکرن.", signed_out: "بەری هنارتنێ دووبارە بچۆ ژوور.", unavailable: "ئەڤ مەوعیدە بەردەست نینە.", failed: "لینکێ هنارتنێ نەهاتە ئامادەکرن. دووبارە هەوڵ بدە.", not_configured: "هنارتنا زانیاریێن نەخۆشی ل ڤێ وەشانێ نەهاتیە ڕێکخستن." },
  },
  ar: {
    shareShort: "مشاركة",
    shareAppointment: "إرسال تفاصيل الموعد",
    creating: "جارٍ التجهيز…",
    help: "خيار يدوي احتياطي. تفاصيل الموعد تظهر داخل رسالة واتساب نفسها؛ الرابط الخاص فقط للتفاصيل الكاملة أو التغيير.",
    copy: "نسخ رابط التفاصيل",
    copied: "تم النسخ ✓",
    copyFailed: "ما كدرنا ننسخ الرابط تلقائياً. حدّد الرابط أدناه وانسخه يدوياً.",
    whatsapp: "إرسال عبر واتساب",
    back: "رجوع",
    title: "موعدك",
    doctor: "الدكتور",
    time: "الوقت",
    details: "التفاصيل الكاملة أو التغيير",
    errors: { invalid: "ما كدرنا نجهز رابط المشاركة.", signed_out: "سجّل الدخول مرة ثانية قبل المشاركة.", unavailable: "هذا الموعد غير متاح.", failed: "ما كدرنا نجهز رابط المشاركة. حاول مرة ثانية.", not_configured: "مشاركة تفاصيل المريض غير مهيأة بهذا الإصدار." },
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
  if (locale === "bd") return formatBaghdadDateTime(date, locale);
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
  patientName,
  locale,
  reminderLanguage,
}: {
  clinicId: string;
  appointmentId: string;
  patientName: string;
  locale: UiLocale;
  reminderLanguage: UiLocale;
}) {
  const t = copy[locale];
  const patientMessage = copy[reminderLanguage];
  const shareLabel = `${t.shareAppointment}: ${patientName}`;
  const [state, action, pending] = useActionState(
    createPatientAccessLink,
    initialPatientLinkState,
  );
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const copyFallbackRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (state.link) setShowResult(true);
  }, [reminderLanguage, state.link]);

  useEffect(() => {
    if (!copyFailed) return;
    window.requestAnimationFrame(() => {
      copyFallbackRef.current?.focus();
      copyFallbackRef.current?.select();
    });
  }, [copyFailed]);

  const initialLink = useMemo(() => {
    if (!state.link) return null;
    try {
      const url = new URL(state.link);
      url.searchParams.set("view", "initial");
      url.searchParams.set("lang", reminderLanguage);
      return url.toString();
    } catch {
      return state.link;
    }
  }, [reminderLanguage, state.link]);

  const whatsappUrl = useMemo(() => {
    if (!initialLink || !state.patientPhone) return null;
    const digits = state.patientPhone.replace(/\D/g, "");
    if (!digits) return null;
    const lines: string[] = [patientMessage.title];
    if (state.doctorName) lines.push(`${patientMessage.doctor}: ${state.doctorName}`);
    const when = appointmentText(state.appointmentAt, reminderLanguage);
    if (when) lines.push(`${patientMessage.time}: ${when}`);
    lines.push("", `${patientMessage.details}:`, initialLink);
    return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join("\n"))}`;
  }, [initialLink, patientMessage, reminderLanguage, state.appointmentAt, state.doctorName, state.patientPhone]);

  function closeShareResult() {
    setCopyFailed(false);
    setCopied(false);
    setShowResult(false);
  }

  async function copyLink() {
    if (!initialLink) return;
    try {
      await navigator.clipboard.writeText(initialLink);
      setCopyFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }

  return (
    <div className="patient-link-control">
      {!state.link ? (
        <form action={action} aria-busy={pending}>
          <input type="hidden" name="clinic_id" value={clinicId} />
          <input type="hidden" name="appointment_id" value={appointmentId} />
          <button type="submit" disabled={pending} aria-label={shareLabel} title={t.shareAppointment}>
            {pending ? t.creating : t.shareShort}
          </button>
        </form>
      ) : !showResult ? (
        <button type="button" onClick={() => setShowResult(true)} aria-label={shareLabel} title={t.shareAppointment}>{t.shareShort}</button>
      ) : null}

      {state.error ? <span className="field-help" role="alert">{t.errors[state.error]}</span> : null}

      {state.link && showResult ? (
        <div className="patient-link-result" role="status">
          <div className="patient-link-copy-block">
            <strong>{t.shareAppointment}</strong>
            <p>{t.help}</p>
          </div>
          <div className="patient-link-share-actions">
            {whatsappUrl ? (
              <a className="patient-link-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer" onClick={closeShareResult}>{t.whatsapp}</a>
            ) : null}
            <button type="button" onClick={copyLink}>{copied ? t.copied : t.copy}</button>
            {copyFailed ? (
              <>
                <span className="field-help patient-link-copy-error" role="alert">{t.copyFailed}</span>
                <input
                  ref={copyFallbackRef}
                  className="patient-link-copy-fallback"
                  value={initialLink ?? ""}
                  readOnly
                  dir="ltr"
                  aria-label={t.copy}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </>
            ) : null}
            <button className="patient-link-back" type="button" onClick={closeShareResult}>{t.back}</button>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .patient-link-control { display: contents; }
        .patient-link-result { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 14px; margin-top: 4px; border: 1px solid var(--line); border-radius: 12px; padding: 12px; background: var(--surface-soft); }
        .patient-link-copy-block strong { display: block; margin-bottom: 4px; font-size: 11.5px; }
        .patient-link-copy-block p { margin: 0; color: var(--muted); font-size: 10.5px; line-height: 1.45; }
        .patient-link-share-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
        .patient-link-share-actions button, .patient-link-share-actions a { display: inline-flex; min-height: 38px; align-items: center; justify-content: center; border: 0; border-radius: 9px; padding: 8px 10px; background: #e9efeb; color: var(--ink); font-size: 10px; font-weight: 760; text-decoration: none; cursor: pointer; }
        .patient-link-share-actions .patient-link-whatsapp { background: var(--accent); color: #fff; }
        .patient-link-share-actions .patient-link-back { background: transparent; color: var(--muted); }
        .patient-link-copy-error { flex-basis: 100%; text-align: start; }
        .patient-link-copy-fallback { flex-basis: 100%; width: 100%; min-width: 0; border: 1px solid var(--line); border-radius: 9px; padding: 9px 10px; background: #fff; color: var(--ink); font-size: 11px; }
        @media (max-width: 720px) { .patient-link-result { grid-template-columns: 1fr; align-items: stretch; } .patient-link-share-actions { width: 100%; justify-content: stretch; } .patient-link-share-actions button, .patient-link-share-actions a { flex: 1; } }
      `}</style>
    </div>
  );
}
