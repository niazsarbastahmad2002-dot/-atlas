"use client";

import { useActionState, useState } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { createReceptionistInviteLink, type InviteLinkState } from "./invite-actions";

const initialState: InviteLinkState = { status: "idle", message: "" };
type DoctorOption = { id: string; name: string };

const copy = {
  en: {
    title: "Share a secure join link",
    help: "Choose the receptionist's doctor, create a one-use link, then share it through WhatsApp, Messages, AirDrop, or any app. The receptionist verifies their phone before Atlas grants this clinic membership.",
    doctor: "Receptionist's doctor",
    choose: "Choose one doctor",
    create: "Create secure join link",
    creating: "Creating…",
    copy: "Copy link",
    copied: "Copied",
    share: "Share",
  },
  ku: {
    title: "بەستەری پارێزراوی چوونەژوورەوە بنێرە",
    help: "دکتۆری ستافی ڕیسێپشن هەڵبژێرە، بەستەرێکی یەکجارە دروست بکە و بە WhatsApp، Messages، AirDrop یان هەر ئەپێک بنێرە. ستافەکە ژمارەی مۆبایلەکەی پشتڕاست دەکاتەوە پێش ئەوەی Atlas ئەندامێتی ئەم کلینیکە بدات.",
    doctor: "دکتۆری ستافی ڕیسێپشن",
    choose: "یەک دکتۆر هەڵبژێرە",
    create: "بەستەری پارێزراو دروست بکە",
    creating: "دروست دەکرێت…",
    copy: "بەستەر کۆپی بکە",
    copied: "کۆپی کرا",
    share: "بنێرە",
  },
  bd: {
    title: "لینکا پاراستی یا چوونەژوورێ بهنێرە",
    help: "دکتۆرێ ستافێ ڕیسێپشنێ هەلبژێرە، لینکەکا ئێکجارە دروست بکە و ب WhatsApp، Messages، AirDrop یان هەر ئەپەکێ بهنێرە. ستاف ژمارا موبایلا خۆ پشتڕاست دکەت بەری کو Atlas ئەندامەتیا ڤێ کلینیکێ بدەت.",
    doctor: "دکتۆرێ ستافێ ڕیسێپشنێ",
    choose: "ئێک دکتۆر هەلبژێرە",
    create: "لینکا پاراستی دروست بکە",
    creating: "دهێتە دروستکرن…",
    copy: "لینکێ کۆپی بکە",
    copied: "هاتە کۆپیکرن",
    share: "بهنێرە",
  },
  ar: {
    title: "شارك رابط انضمام آمن",
    help: "اختر طبيب موظف الاستقبال، أنشئ رابطاً يُستخدم مرة واحدة، وشاركه عبر WhatsApp أو Messages أو AirDrop أو أي تطبيق. الموظف يوثق رقم موبايله قبل ما Atlas يمنحه عضوية هذه العيادة.",
    doctor: "طبيب موظف الاستقبال",
    choose: "اختر طبيباً واحداً",
    create: "إنشاء رابط انضمام آمن",
    creating: "جارٍ الإنشاء…",
    copy: "نسخ الرابط",
    copied: "تم النسخ",
    share: "مشاركة",
  },
} as const;

export function InviteLinkForm({ clinicId, locale, doctors }: {
  clinicId: string;
  locale: UiLocale;
  doctors: DoctorOption[];
}) {
  const t = copy[locale];
  const [state, action, pending] = useActionState(createReceptionistInviteLink, initialState);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (!state.url) return;
    await navigator.clipboard.writeText(state.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function shareLink() {
    if (!state.url) return;
    if (navigator.share) {
      await navigator.share({ title: "Atlas clinic invitation", url: state.url });
    } else {
      await copyLink();
    }
  }

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
        <label htmlFor="invite_assigned_doctor_id">{t.doctor}</label>
        <select id="invite_assigned_doctor_id" name="assigned_doctor_id" defaultValue="" required disabled={doctors.length === 0}>
          <option value="" disabled>{t.choose}</option>
          {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
        </select>
        <button className="button" type="submit" disabled={pending || doctors.length === 0}>
          {pending ? t.creating : t.create}
        </button>
      </form>

      {state.message ? (
        <div className={`notice ${state.status === "success" ? "notice-success" : "notice-error"}`} role={state.status === "success" ? "status" : "alert"}>
          <strong>{state.message}</strong>
          {state.url ? (
            <>
              <div className="field-help" dir="ltr" style={{ overflowWrap: "anywhere", marginTop: 8 }}>{state.url}</div>
              <div className="login-secondary-actions" style={{ marginTop: 10 }}>
                <button className="button button-ghost button-small" type="button" onClick={() => void copyLink()}>{copied ? t.copied : t.copy}</button>
                <button className="button button-ghost button-small" type="button" onClick={() => void shareLink()}>{t.share}</button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
