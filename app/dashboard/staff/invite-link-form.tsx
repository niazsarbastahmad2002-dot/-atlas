"use client";

import { useActionState, useEffect, useState } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { createReceptionistInviteLink, type InviteLinkState } from "./invite-actions";

const initialState: InviteLinkState = { status: "idle", message: "" };
const STATIC_DIRECT_WHATSAPP_INVITES = process.env.NEXT_PUBLIC_ATLAS_WHATSAPP_DIRECT_INVITES_ENABLED === "true";
type DoctorOption = { id: string; name: string };

const copy = {
  en: {
    title: "Share a secure join link",
    help: "Choose the receptionist's doctor and create a one-use invitation. When direct WhatsApp invitations are enabled, Atlas can send the secure link for you. The receptionist verifies their phone before Atlas grants this clinic membership.",
    doctor: "Receptionist's doctor",
    choose: "Choose one doctor",
    phone: "Recipient mobile number",
    phoneHelp: "Optional. In Meta test mode, Meta only delivers to recipient numbers registered for the test account.",
    phonePlaceholder: "0750 123 4567",
    create: "Create secure join link",
    send: "Create and send on WhatsApp",
    creating: "Creating…",
    copy: "Copy link",
    copied: "Copied",
    share: "Share",
  },
  ku: {
    title: "بەستەری پارێزراوی چوونەژوورەوە بنێرە",
    help: "دکتۆری ستافی ڕیسێپشن هەڵبژێرە و بانگهێشتێکی یەکجارە دروست بکە. کاتێک ناردنی ڕاستەوخۆی WhatsApp چالاکە، Atlas دەتوانێت لینکە پارێزراوەکە بۆت بنێرێت. ستافەکە ژمارەی مۆبایلەکەی پشتڕاست دەکاتەوە پێش ئەوەی Atlas ئەندامێتی ئەم کلینیکە بدات.",
    doctor: "دکتۆری ستافی ڕیسێپشن",
    choose: "یەک دکتۆر هەڵبژێرە",
    phone: "ژمارەی مۆبایلی وەرگر",
    phoneHelp: "ئارەزوومەندانە. لە دۆخی تاقیکردنەوەی Meta تەنها ژمارە تۆمارکراوەکانی تاقیکردنەوە پەیام وەردەگرن.",
    phonePlaceholder: "0750 123 4567",
    create: "بەستەری پارێزراو دروست بکە",
    send: "دروست بکە و بە WhatsApp بنێرە",
    creating: "دروست دەکرێت…",
    copy: "بەستەر کۆپی بکە",
    copied: "کۆپی کرا",
    share: "بنێرە",
  },
  bd: {
    title: "لینکا پاراستی یا چوونەژوورێ بهنێرە",
    help: "دکتۆرێ ستافێ ڕیسێپشنێ هەلبژێرە و بانگهێشتەکا ئێکجارە دروست بکە. دەمێ هنارتنا ڕاستەوخۆ یا WhatsApp چالاک بیت، Atlas دشێت لینکێ پاراستی بۆ تە بهنێریت. ستاف ژمارا موبایلا خۆ پشتڕاست دکەت بەری کو Atlas ئەندامەتیا ڤێ کلینیکێ بدەت.",
    doctor: "دکتۆرێ ستافێ ڕیسێپشنێ",
    choose: "ئێک دکتۆر هەلبژێرە",
    phone: "ژمارا موبایلا وەرگری",
    phoneHelp: "ئارەزوومەندانە. د مودا تاقیکرنێ یا Meta دا تنێ ژمارێن تۆمارکری یێن تاقیکرنێ پەیام وەردگرن.",
    phonePlaceholder: "0750 123 4567",
    create: "لینکا پاراستی دروست بکە",
    send: "دروست بکە و ب WhatsApp بهنێرە",
    creating: "دهێتە دروستکرن…",
    copy: "لینکێ کۆپی بکە",
    copied: "هاتە کۆپیکرن",
    share: "بهنێرە",
  },
  ar: {
    title: "شارك رابط انضمام آمن",
    help: "اختر طبيب موظف الاستقبال وأنشئ دعوة تستخدم مرة واحدة. عند تفعيل الإرسال المباشر عبر WhatsApp يقدر Atlas يرسل الرابط الآمن عنك. الموظف يوثق رقم موبايله قبل ما Atlas يمنحه عضوية هذه العيادة.",
    doctor: "طبيب موظف الاستقبال",
    choose: "اختر طبيباً واحداً",
    phone: "رقم موبايل المستلم",
    phoneHelp: "اختياري. بوضع اختبار Meta الرسائل توصل فقط للأرقام المسجلة كمستلمين للاختبار.",
    phonePlaceholder: "0750 123 4567",
    create: "إنشاء رابط انضمام آمن",
    send: "إنشاء وإرسال عبر WhatsApp",
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
  const [recipientPhone, setRecipientPhone] = useState("");
  const [directWhatsAppInvites, setDirectWhatsAppInvites] = useState(STATIC_DIRECT_WHATSAPP_INVITES);

  useEffect(() => {
    if (STATIC_DIRECT_WHATSAPP_INVITES) return;
    let active = true;
    void fetch("/api/whatsapp/test/health", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ ok?: unknown }> : null)
      .then((body) => {
        if (active && body?.ok === true) setDirectWhatsAppInvites(true);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

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
        {directWhatsAppInvites ? (
          <>
            <label htmlFor="invite_recipient_phone">{t.phone}</label>
            <input
              id="invite_recipient_phone"
              name="recipient_phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t.phonePlaceholder}
              value={recipientPhone}
              onChange={(event) => setRecipientPhone(event.target.value)}
            />
            <div className="field-help">{t.phoneHelp}</div>
          </>
        ) : null}
        <button className="button" type="submit" disabled={pending || doctors.length === 0}>
          {pending ? t.creating : directWhatsAppInvites && recipientPhone.trim() ? t.send : t.create}
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