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
    copyFailed: "Could not copy the link. Select the link above and copy it manually.",
    share: "Share",
    shareTitle: "Atlas clinic invitation",
    shareText: "Join the clinic in Atlas with this secure one-use link. Verify your phone to continue. The link expires in 24 hours.",
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
    copyFailed: "بەستەرەکە کۆپی نەکرا. بەستەرەکەی سەرەوە هەڵبژێرە و بە دەستی کۆپی بکە.",
    share: "بنێرە",
    shareTitle: "بانگهێشتی کلینیکی Atlas",
    shareText: "بەم بەستەرە پارێزراوە یەکجارە بچۆ ژوورەوەی کلینیک لە Atlas. ژمارەی مۆبایلەکەت پشتڕاست بکەرەوە. بەستەرەکە دوای 24 کاتژمێر بەسەر دەچێت.",
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
    copyFailed: "لینک نەهاتە کۆپیکرن. لینکا سەرێ هەلبژێرە و ب دەستی کۆپی بکە.",
    share: "بهنێرە",
    shareTitle: "بانگهێشتا کلینیکا Atlas",
    shareText: "ب ڤێ لینکا پاراستی یا ئێکجارە بچۆ ژوورا کلینیکێ ل Atlas. ژمارا موبایلا خۆ پشتڕاست بکە. لینک پشتی 24 دەمژمێران بەسەر دچیت.",
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
    copyFailed: "تعذر نسخ الرابط. حدد الرابط بالأعلى وانسخه يدوياً.",
    share: "مشاركة",
    shareTitle: "دعوة عيادة Atlas",
    shareText: "انضم إلى العيادة في Atlas عبر هذا الرابط الآمن ذي الاستخدام الواحد. وثّق رقم موبايلك للمتابعة. تنتهي صلاحية الرابط بعد 24 ساعة.",
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
  const [shareError, setShareError] = useState("");

  async function copyLink() {
    if (!state.url) return;
    setShareError("");
    try {
      await navigator.clipboard.writeText(state.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
      setShareError(t.copyFailed);
    }
  }

  async function shareLink() {
    if (!state.url) return;
    setShareError("");
    if (navigator.share) {
      try {
        await navigator.share({ title: t.shareTitle, text: t.shareText, url: state.url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyLink();
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
              {shareError ? <p className="field-help notice-error" role="alert">{shareError}</p> : null}
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
