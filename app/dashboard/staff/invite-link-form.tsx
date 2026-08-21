"use client";

import { useActionState } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { createReceptionistInviteLink, type InviteLinkState } from "./invite-actions";

const initialState: InviteLinkState = { status: "idle", message: "" };
type DoctorOption = { id: string; name: string };

const copy = {
  en: {
    title: "Invite receptionist by WhatsApp",
    help: "Enter the receptionist's WhatsApp number. Atlas sends a secure one-use link to that exact number. They open it, verify the same phone through WhatsApp, and Atlas joins them to this clinic as a receptionist.",
    phone: "Receptionist WhatsApp number",
    phoneHelp: "Iraq: 0750… is accepted. Other countries: enter the full +country-code number.",
    doctor: "Receptionist's doctor",
    choose: "Choose one doctor",
    send: "Send invitation on WhatsApp",
    sending: "Sending WhatsApp invitation…",
  },
  ku: {
    title: "ستافی ڕیسێپشن بە WhatsApp بانگهێشت بکە",
    help: "ژمارەی WhatsApp ـی ستافەکە بنووسە. Atlas بەستەرێکی پارێزراوی یەکجارە بۆ هەمان ژمارە دەنێرێت. بەستەرەکە دەکاتەوە، هەمان ژمارە لە WhatsApp پشتڕاست دەکاتەوە و Atlas وەک ستافی ڕیسێپشن بە کلینیکەکەی دەبەستێتەوە.",
    phone: "ژمارەی WhatsApp ـی ستافی ڕیسێپشن",
    phoneHelp: "عێراق: 0750… قبوڵە. وڵاتی تر: ژمارەی تەواو لەگەڵ +کۆدی وڵات بنووسە.",
    doctor: "دکتۆری ستافی ڕیسێپشن",
    choose: "یەک دکتۆر هەڵبژێرە",
    send: "بانگهێشت لە WhatsApp بنێرە",
    sending: "بانگهێشتی WhatsApp دەنێردرێت…",
  },
  bd: {
    title: "ستافێ ڕیسێپشنێ ب WhatsApp بانگهێشت بکە",
    help: "ژمارا WhatsApp یا ستافی بنڤیسە. Atlas لینکەکا پاراستی یا ئێکجارە بۆ هەمان ژمارێ دهنێریت. لینکێ ڤەدکەت، هەمان ژمارە ل WhatsApp پشتڕاست دکەت و Atlas وی وەک ستافێ ڕیسێپشنێ ب کلینیکێ گرێددەت.",
    phone: "ژمارا WhatsApp یا ستافێ ڕیسێپشنێ",
    phoneHelp: "عێراق: 0750… دهێتە قبولکرن. وەلاتێ دی: ژمارا تەمام لگەل +کۆدێ وەلاتی بنڤیسە.",
    doctor: "دکتۆرێ ستافێ ڕیسێپشنێ",
    choose: "ئێک دکتۆر هەلبژێرە",
    send: "بانگهێشت ل WhatsApp بهنێرە",
    sending: "بانگهێشتا WhatsApp دهێتە هنارتن…",
  },
  ar: {
    title: "دعوة موظف الاستقبال عبر واتساب",
    help: "اكتب رقم واتساب لموظف الاستقبال. Atlas يرسل رابطاً آمناً يُستخدم مرة واحدة إلى نفس الرقم. يفتح الرابط، يوثق نفس الرقم عبر واتساب، وبعدها Atlas يضيفه للعيادة كموظف استقبال.",
    phone: "رقم واتساب لموظف الاستقبال",
    phoneHelp: "العراق: تقدر تكتب 0750… للدول الأخرى اكتب الرقم الدولي الكامل مع +.",
    doctor: "طبيب موظف الاستقبال",
    choose: "اختر طبيباً واحداً",
    send: "إرسال الدعوة على واتساب",
    sending: "جارٍ إرسال دعوة واتساب…",
  },
} as const;

export function InviteLinkForm({ clinicId, locale, doctors }: {
  clinicId: string;
  locale: UiLocale;
  doctors: DoctorOption[];
}) {
  const t = copy[locale];
  const [state, action, pending] = useActionState(createReceptionistInviteLink, initialState);

  return (
    <section className="settings-card">
      <div className="settings-card-heading">
        <span className="settings-card-icon" aria-hidden="true">↗</span>
        <div>
          <h2>{t.title}</h2>
          <p>{t.help}</p>
        </div>
      </div>

      <form action={action} className="settings-form">
        <input type="hidden" name="clinic_id" value={clinicId} />
        <label htmlFor="invite_phone">{t.phone}</label>
        <input id="invite_phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0750 123 4567" required dir="ltr" />
        <p className="field-help">{t.phoneHelp}</p>

        <label htmlFor="invite_assigned_doctor_id">{t.doctor}</label>
        <select id="invite_assigned_doctor_id" name="assigned_doctor_id" defaultValue="" required disabled={doctors.length === 0}>
          <option value="" disabled>{t.choose}</option>
          {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
        </select>
        <button className="button" type="submit" disabled={pending || doctors.length === 0}>
          {pending ? t.sending : t.send}
        </button>
      </form>

      {state.message ? (
        <div className={`notice ${state.status === "success" ? "notice-success" : "notice-error"}`} role={state.status === "success" ? "status" : "alert"}>
          <strong>{state.message}</strong>
        </div>
      ) : null}
    </section>
  );
}
