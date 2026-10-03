"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { normalizeIraqiMobile, type AppointmentMutationFailure, type AppointmentStatus } from "@/lib/appointments";
import { uiText, type UiLocale } from "@/lib/i18n/ui";
import { AppointmentEditDateTimeField } from "./appointment-edit-datetime-field";
import { updateAppointmentDetailsInline } from "./instant-actions";

type DoctorOption = { id: string; name: string };
type ContactRelationship = "patient" | "parent_guardian" | "relative_caregiver";

type AppointmentEditorProps = {
  clinicId: string;
  appointmentId: string;
  revision: number;
  status: AppointmentStatus;
  patientName: string;
  patientPhone: string;
  contactRelationship: ContactRelationship;
  doctorId: string | null;
  appointmentAt: string;
  reminderLanguage: string;
  reminderConsent: boolean;
  doctors: DoctorOption[];
  min: string;
  max: string;
  locale: UiLocale;
};

const editorOpenEvent = "atlas:appointment-editor-open";

const copy = {
  en: {
    edit: "Edit",
    title: "Edit appointment",
    close: "Close",
    save: "Save changes",
    saving: "Saving…",
    consent: "This phone’s owner agreed to WhatsApp reminders",
    relationship: "Whose phone is this?",
    patient: "Patient",
    guardian: "Parent / guardian",
    caregiver: "Relative / caregiver",
    saved: "Appointment updated.",
    invalid: "Check the appointment details and try again.",
    slotTaken: "That doctor already has an appointment at this time. Choose another time.",
    busy: "This appointment is still updating. Try again.",
    closed: "Reopen this appointment before changing its details.",
    stale: "This appointment changed elsewhere. Loading the latest status.",
    failed: "The appointment could not be updated. Try again.",
  },
  ku: {
    edit: "دەستکاری",
    title: "دەستکاری وادە",
    close: "داخستن",
    save: "گۆڕانکارییەکان پاشەکەوت بکە",
    saving: "پاشەکەوت دەکرێت…",
    consent: "خاوەنی ئەم ژمارەیە ڕازییە بیرخستنەوەی واتسئاپ وەربگرێت",
    relationship: "ئەم ژمارەیە هی کێیە؟",
    patient: "نەخۆش",
    guardian: "دایک، باوک / سەرپەرشت",
    caregiver: "خزم / چاودێر",
    saved: "وادەکە نوێکرایەوە.",
    invalid: "زانیاری وادەکە بپشکنە و دووبارە هەوڵ بدە.",
    slotTaken: "ئەم پزیشکە لەم کاتەدا وادەیەکی تری هەیە. کاتێکی تر هەڵبژێرە.",
    busy: "وادەکە هێشتا نوێ دەکرێتەوە. دووبارە هەوڵ بدە.",
    closed: "پێش گۆڕینی زانیارییەکان، وادەکە بکەرەوە.",
    stale: "ئەم وادەیە لە شوێنێکی تر گۆڕدراوە. نوێترین دۆخ بار دەکرێتەوە.",
    failed: "وادەکە نوێ نەکرایەوە. دووبارە هەوڵ بدە.",
  },
  bd: {
    edit: "دەستکاری",
    title: "دەستکاریا وادەیێ",
    close: "داخە",
    save: "گۆڕینان بپارێزە",
    saving: "دهێتە پاراستن…",
    consent: "خودانێ ڤێ ژمارەیێ ڕازییە بیرخستنەوەیا واتسئاپێ وەربگریت",
    relationship: "ئەڤ ژمارە یا کێیە؟",
    patient: "نەخۆش",
    guardian: "دایک، باب / سەرپەرشت",
    caregiver: "خزم / چاڤدێر",
    saved: "وادە هاتە نوێکرن.",
    invalid: "زانیاریێن وادەیێ بپشکنە و دووبارە هەول بدە.",
    slotTaken: "ڤی دکتۆری ل ڤی دەمی وادە هەیە. دەمەکێ دی هەلبژێرە.",
    busy: "وادە هێشتا دهێتە نوێکرن. دووبارە هەول بدە.",
    closed: "بەری گۆڕینا زانیارییان، وادەیێ دووبارە ڤەکە.",
    stale: "ئەڤ وادەیە ل جهەکێ دی هاتیە گۆڕین. نووترین بار دهێتە بارکرن.",
    failed: "وادە نەهاتە نوێکرن. دووبارە هەول بدە.",
  },
  ar: {
    edit: "تعديل",
    title: "تعديل الموعد",
    close: "إغلاق",
    save: "حفظ التغييرات",
    saving: "جارٍ الحفظ…",
    consent: "صاحب هذا الرقم وافق على استلام تذكيرات واتساب",
    relationship: "رقم من هذا؟",
    patient: "المريض",
    guardian: "الأب / الأم / ولي الأمر",
    caregiver: "قريب / مقدم رعاية",
    saved: "تم تحديث الموعد.",
    invalid: "تحقق من تفاصيل الموعد وحاول مرة أخرى.",
    slotTaken: "لدى هذا الطبيب موعد في هذا الوقت. اختر وقتاً آخر.",
    busy: "الموعد قيد التحديث. حاول مرة أخرى.",
    closed: "أعد فتح الموعد قبل تغيير تفاصيله.",
    stale: "تم تغيير هذا الموعد من مكان آخر. سيتم تحميل أحدث حالة.",
    failed: "تعذر تحديث الموعد. حاول مرة أخرى.",
  },
} as const;

const reminderLanguageLabels = {
  en: { ku: "Kurdish (Sorani)", bd: "Kurdish (Badini)", ar: "Iraqi Arabic", en: "English" },
  ku: { ku: "کوردی (سۆرانی)", bd: "کوردی (بادینی)", ar: "عەرەبی (عێراقی)", en: "ئینگلیزی" },
  bd: { ku: "کوردی (سۆرانی)", bd: "کوردی (بادینی)", ar: "عەرەبی (عێراقی)", en: "ئینگلیزی" },
  ar: { ku: "الكردية (السورانية)", bd: "الكردية (البادينية)", ar: "العربية العراقية", en: "الإنجليزية" },
} as const;

function failureText(locale: UiLocale, reason: AppointmentMutationFailure) {
  const t = copy[locale];
  if (reason === "slot_taken") return t.slotTaken;
  if (reason === "busy") return t.busy;
  if (reason === "stale") return t.stale;
  if (reason === "invalid" || reason === "past_cancelled" || reason === "too_early") return t.invalid;
  return t.failed;
}

export function AppointmentEditor(props: AppointmentEditorProps) {
  const {
    clinicId,
    appointmentId,
    revision,
    status,
    patientName,
    patientPhone,
    contactRelationship,
    doctorId,
    appointmentAt,
    reminderLanguage,
    reminderConsent,
    doctors,
    min,
    max,
    locale,
  } = props;
  const router = useRouter();
  const ui = uiText(locale);
  const t = copy[locale];
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [editConsent, setEditConsent] = useState(reminderConsent);
  const [editRelationship, setEditRelationship] = useState<ContactRelationship>(contactRelationship);
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const openedStatusRef = useRef<AppointmentStatus | null>(null);
  const openedRevisionRef = useRef<number | null>(null);
  const statusEditable = status === "pending" || status === "confirmed" || status === "cancelled";
  const withinEditWindow = new Date(appointmentAt).getTime() >= now - 60_000;
  const editable = statusEditable && (open || withinEditWindow);
  const lockedDoctor = doctors.length === 1 ? doctors[0] : null;

  useEffect(() => {
    setEditConsent(reminderConsent);
    setEditRelationship(contactRelationship);
  }, [contactRelationship, reminderConsent, revision]);

  useEffect(() => {
    const expiresAt = new Date(appointmentAt).getTime() + 60_000;
    if (!Number.isFinite(expiresAt)) return;

    let timer: number | null = null;
    const scheduleExpiry = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        setNow(Date.now());
        return;
      }
      timer = window.setTimeout(() => {
        const current = Date.now();
        setNow(current);
        if (current < expiresAt) scheduleExpiry();
      }, Math.min(remaining + 50, 2_147_000_000));
    };

    scheduleExpiry();
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [appointmentAt]);

  useEffect(() => {
    if (open && (
      (openedStatusRef.current && openedStatusRef.current !== status)
      || (openedRevisionRef.current !== null && openedRevisionRef.current !== revision)
    )) {
      openedStatusRef.current = null;
      openedRevisionRef.current = null;
      setOpen(false);
      setMessage({ tone: "error", text: t.stale });
    }
  }, [open, revision, status, t.stale]);

  useEffect(() => {
    const closeWhenAnotherEditorOpens = (event: Event) => {
      const detail = (event as CustomEvent<{ appointmentId?: string }>).detail;
      if (detail?.appointmentId && detail.appointmentId !== appointmentId) {
        openedStatusRef.current = null;
        openedRevisionRef.current = null;
        setOpen(false);
        setMessage(null);
      }
    };
    window.addEventListener(editorOpenEvent, closeWhenAnotherEditorOpens);
    return () => window.removeEventListener(editorOpenEvent, closeWhenAnotherEditorOpens);
  }, [appointmentId]);

  if (!editable) return null;

  function toggleEditor() {
    setMessage(null);
    if (open) {
      openedStatusRef.current = null;
      openedRevisionRef.current = null;
      setOpen(false);
      return;
    }
    openedStatusRef.current = status;
    openedRevisionRef.current = revision;
    window.dispatchEvent(new CustomEvent(editorOpenEvent, { detail: { appointmentId } }));
    setOpen(true);
  }

  function submit(formData: FormData) {
    if (pending) return;
    setMessage(null);
    startTransition(async () => {
      const expectedStatus = openedStatusRef.current;
      const expectedRevision = openedRevisionRef.current;
      if (!expectedStatus || expectedRevision === null) {
        setMessage({ tone: "error", text: t.stale });
        router.refresh();
        return;
      }
      const result = await updateAppointmentDetailsInline(clinicId, appointmentId, expectedStatus, expectedRevision, formData);
      if (!result.ok) {
        setMessage({ tone: "error", text: failureText(locale, result.reason) });
        if (result.reason === "stale") {
          openedStatusRef.current = null;
          openedRevisionRef.current = null;
          setOpen(false);
          router.refresh();
        }
        return;
      }
      setMessage({ tone: "success", text: t.saved });
      openedStatusRef.current = null;
      openedRevisionRef.current = null;
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <div className="appointment-editor">
      <button
        className="appointment-edit-toggle"
        type="button"
        onClick={toggleEditor}
        aria-expanded={open}
        disabled={pending}
        aria-label={`${open ? t.close : t.edit}: ${patientName}`}
      >
        {open ? t.close : t.edit}
      </button>
      {open ? (
        <form className="appointment-edit-form" action={submit}>
          <div className="appointment-edit-heading"><strong>{t.title}</strong></div>

          <label htmlFor={`edit-patient-${appointmentId}`}>{ui.patientName}</label>
          <input id={`edit-patient-${appointmentId}`} name="patient_name" defaultValue={patientName} disabled={pending} minLength={2} maxLength={120} required />

          <label htmlFor={`edit-phone-${appointmentId}`}>{ui.iraqiMobile}</label>
          <input
            id={`edit-phone-${appointmentId}`}
            name="patient_phone"
            type="tel"
            disabled={pending}
            inputMode="tel"
            autoComplete="tel"
            defaultValue={patientPhone}
            placeholder="0750 000 0000"
            pattern="(?:[+]?(?:[9٩۹][6٦۶][4٤۴])|[0٠۰])[7٧۷][0-9٠-٩۰-۹ .\(\)\-]{9,16}"
            dir="ltr"
            required
            onChange={(event) => {
              const originalPhone = normalizeIraqiMobile(patientPhone);
              const currentPhone = normalizeIraqiMobile(event.currentTarget.value);
              if (currentPhone && originalPhone && currentPhone !== originalPhone) setEditConsent(false);
            }}
          />

          <label htmlFor={`edit-contact-${appointmentId}`}>{t.relationship}</label>
          <select
            id={`edit-contact-${appointmentId}`}
            name="contact_relationship"
            disabled={pending}
            value={editRelationship}
            onChange={(event) => {
              const next = event.currentTarget.value as ContactRelationship;
              if (next !== contactRelationship) setEditConsent(false);
              setEditRelationship(next);
            }}
            required
          >
            <option value="patient">{t.patient}</option>
            <option value="parent_guardian">{t.guardian}</option>
            <option value="relative_caregiver">{t.caregiver}</option>
          </select>

          <label htmlFor={`edit-doctor-${appointmentId}`}>{ui.doctor}</label>
          {lockedDoctor ? (
            <>
              <input id={`edit-doctor-${appointmentId}`} name="doctor_id" type="hidden" value={lockedDoctor.id} />
              <div className="appointment-locked-doctor" aria-label={`${ui.doctor}: ${lockedDoctor.name}`}>
                <span>{lockedDoctor.name}</span><small>✓</small>
              </div>
            </>
          ) : (
            <select id={`edit-doctor-${appointmentId}`} name="doctor_id" disabled={pending} defaultValue={doctorId ?? ""} required>
              <option value="">{ui.chooseDoctor}</option>
              {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
            </select>
          )}

          <AppointmentEditDateTimeField
            id={`edit-time-${appointmentId}`}
            appointmentAt={appointmentAt}
            min={min}
            max={max}
            locale={locale}
            label={ui.time}
            timeZoneLabel={ui.erbilTime}
            disabled={pending}
          />

          <label htmlFor={`edit-language-${appointmentId}`}>{ui.reminderLanguage}</label>
          <select id={`edit-language-${appointmentId}`} name="reminder_language" disabled={pending} defaultValue={reminderLanguage}>
            <option value="ku">{reminderLanguageLabels[locale].ku}</option>
            <option value="bd">{reminderLanguageLabels[locale].bd}</option>
            <option value="ar">{reminderLanguageLabels[locale].ar}</option>
            <option value="en">{reminderLanguageLabels[locale].en}</option>
          </select>

          <label className="checkbox-field consent-card" htmlFor={`edit-consent-${appointmentId}`}>
            <input
              id={`edit-consent-${appointmentId}`}
              name="reminder_consent"
              type="checkbox"
              disabled={pending}
              checked={editConsent}
              onChange={(event) => setEditConsent(event.currentTarget.checked)}
            />
            <span>{t.consent}</span>
          </label>

          <button className="button button-small" type="submit" disabled={pending}>{pending ? t.saving : t.save}</button>
        </form>
      ) : null}
      {message ? <span className={`appointment-edit-message is-${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>{message.text}</span> : null}

      <style jsx global>{`
        .appointment-edit-form {
          display: grid;
          gap: 9px;
          margin: 8px 0 2px;
        }
        .appointment-edit-form > label {
          margin-top: 3px;
          font-size: 12px;
          font-weight: 760;
        }
        .appointment-edit-form > .button {
          justify-self: start;
          min-width: 126px;
          margin-top: 7px;
        }
        .appointment-locked-doctor {
          display: flex;
          min-height: 45px;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid var(--line-strong);
          border-radius: 12px;
          padding: 10px 13px;
          background: var(--surface-soft);
          color: var(--ink);
          font-weight: 760;
        }
        .appointment-locked-doctor small {
          display: grid;
          width: 22px;
          height: 22px;
          place-items: center;
          border-radius: 999px;
          background: var(--accent-soft);
          color: var(--accent);
          font-size: 11px;
        }
        .appointment-editor + .polished-actions {
          gap: 10px !important;
          row-gap: 9px !important;
          margin-top: 12px;
        }
        .appointment-editor + .polished-actions button {
          min-height: 38px;
          padding: 8px 12px;
          touch-action: manipulation;
        }
        @media (max-width: 540px) {
          .appointment-edit-form > .button { width: 100%; }
          .appointment-editor + .polished-actions { align-items: stretch; }
        }
      `}</style>
    </div>
  );
}
