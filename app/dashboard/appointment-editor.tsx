"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AppointmentMutationFailure, AppointmentStatus } from "@/lib/appointments";
import { uiText, type UiLocale } from "@/lib/i18n/ui";
import { AppointmentEditDateTimeField } from "./appointment-edit-datetime-field";
import { updateAppointmentDetailsInline } from "./instant-actions";

type DoctorOption = { id: string; name: string };

type AppointmentEditorProps = {
  clinicId: string;
  appointmentId: string;
  status: AppointmentStatus;
  patientName: string;
  patientPhone: string;
  doctorId: string | null;
  appointmentAt: string;
  reminderLanguage: string;
  reminderConsent: boolean;
  doctors: DoctorOption[];
  min: string;
  max: string;
  locale: UiLocale;
};

const copy = {
  en: {
    edit: "Edit",
    title: "Edit appointment",
    close: "Close",
    save: "Save changes",
    saving: "Saving…",
    consent: "Patient agreed to WhatsApp reminder",
    saved: "Appointment updated.",
    invalid: "Check the appointment details and try again.",
    slotTaken: "That doctor already has an appointment at this time. Choose another time.",
    busy: "This appointment is still updating. Try again.",
    closed: "Reopen this appointment before changing its details.",
    failed: "The appointment could not be updated. Try again.",
  },
  ku: {
    edit: "دەستکاری",
    title: "دەستکاری وادە",
    close: "داخستن",
    save: "گۆڕانکارییەکان پاشەکەوت بکە",
    saving: "پاشەکەوت دەکرێت…",
    consent: "نەخۆش ڕازییە بیرخستنەوەی واتسئاپ وەربگرێت",
    saved: "وادەکە نوێکرایەوە.",
    invalid: "زانیاری وادەکە بپشکنە و دووبارە هەوڵ بدە.",
    slotTaken: "ئەم پزیشکە لەم کاتەدا وادەیەکی تری هەیە. کاتێکی تر هەڵبژێرە.",
    busy: "وادەکە هێشتا نوێ دەکرێتەوە. دووبارە هەوڵ بدە.",
    closed: "پێش گۆڕینی زانیارییەکان، وادەکە بکەرەوە.",
    failed: "وادەکە نوێ نەکرایەوە. دووبارە هەوڵ بدە.",
  },
  ar: {
    edit: "تعديل",
    title: "تعديل الموعد",
    close: "إغلاق",
    save: "حفظ التغييرات",
    saving: "جارٍ الحفظ…",
    consent: "وافق المريض على تذكير واتساب",
    saved: "تم تحديث الموعد.",
    invalid: "تحقق من تفاصيل الموعد وحاول مرة أخرى.",
    slotTaken: "لدى هذا الطبيب موعد في هذا الوقت. اختر وقتاً آخر.",
    busy: "الموعد قيد التحديث. حاول مرة أخرى.",
    closed: "أعد فتح الموعد قبل تغيير تفاصيله.",
    failed: "تعذر تحديث الموعد. حاول مرة أخرى.",
  },
} as const;

const reminderLanguageLabels = {
  en: { ku: "Kurdish (Sorani)", ar: "Arabic", en: "English" },
  ku: { ku: "کوردی (سۆرانی)", ar: "عەرەبی", en: "ئینگلیزی" },
  ar: { ku: "الكردية (السورانية)", ar: "العربية", en: "الإنجليزية" },
} as const;

function failureText(locale: UiLocale, reason: AppointmentMutationFailure) {
  const t = copy[locale];
  if (reason === "slot_taken") return t.slotTaken;
  if (reason === "busy") return t.busy;
  if (reason === "invalid" || reason === "past_cancelled" || reason === "too_early") return t.invalid;
  return t.failed;
}

export function AppointmentEditor(props: AppointmentEditorProps) {
  const {
    clinicId,
    appointmentId,
    status,
    patientName,
    patientPhone,
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
  const [pending, startTransition] = useTransition();
  const editable = status === "pending" || status === "confirmed" || status === "cancelled";

  if (!editable) return null;

  function submit(formData: FormData) {
    if (pending) return;
    setMessage(null);
    startTransition(async () => {
      const result = await updateAppointmentDetailsInline(clinicId, appointmentId, formData);
      if (!result.ok) {
        setMessage({ tone: "error", text: failureText(locale, result.reason) });
        return;
      }
      setMessage({ tone: "success", text: t.saved });
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <div className="appointment-editor">
      <button className="appointment-edit-toggle" type="button" onClick={() => { setOpen((value) => !value); setMessage(null); }} aria-expanded={open}>
        {open ? t.close : t.edit}
      </button>
      {open ? (
        <form className="appointment-edit-form" action={submit}>
          <div className="appointment-edit-heading"><strong>{t.title}</strong></div>

          <label htmlFor={`edit-patient-${appointmentId}`}>{ui.patientName}</label>
          <input id={`edit-patient-${appointmentId}`} name="patient_name" defaultValue={patientName} minLength={2} maxLength={120} required />

          <label htmlFor={`edit-phone-${appointmentId}`}>{ui.iraqiMobile}</label>
          <input id={`edit-phone-${appointmentId}`} name="patient_phone" type="tel" inputMode="tel" defaultValue={patientPhone} placeholder="0750 000 0000" dir="ltr" required />

          <label htmlFor={`edit-doctor-${appointmentId}`}>{ui.doctor}</label>
          <select id={`edit-doctor-${appointmentId}`} name="doctor_id" defaultValue={doctorId ?? ""} required>
            <option value="">{ui.chooseDoctor}</option>
            {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
          </select>

          <AppointmentEditDateTimeField
            id={`edit-time-${appointmentId}`}
            appointmentAt={appointmentAt}
            min={min}
            max={max}
            locale={locale}
            label={ui.time}
            timeZoneLabel={ui.erbilTime}
          />

          <label htmlFor={`edit-language-${appointmentId}`}>{ui.reminderLanguage}</label>
          <select id={`edit-language-${appointmentId}`} name="reminder_language" defaultValue={reminderLanguage}>
            <option value="ku">{reminderLanguageLabels[locale].ku}</option>
            <option value="ar">{reminderLanguageLabels[locale].ar}</option>
            <option value="en">{reminderLanguageLabels[locale].en}</option>
          </select>

          <label className="checkbox-field consent-card" htmlFor={`edit-consent-${appointmentId}`}>
            <input id={`edit-consent-${appointmentId}`} name="reminder_consent" type="checkbox" defaultChecked={reminderConsent} />
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
