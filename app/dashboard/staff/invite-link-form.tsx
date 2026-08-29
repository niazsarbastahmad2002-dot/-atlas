"use client";

import { useActionState, useEffect, useState } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { createReceptionistInviteLink, type InviteLinkState } from "./invite-actions";

const initialState: InviteLinkState = { status: "idle", message: "" };
const STATIC_DIRECT_WHATSAPP_INVITES = process.env.NEXT_PUBLIC_ATLAS_WHATSAPP_DIRECT_INVITES_ENABLED === "true";
type DoctorOption = { id: string; name: string };

const copy = {
  en: {
    title: "Send a secure join link",
    help: "Choose the receptionist's doctor and send a one-use WhatsApp invitation. Atlas binds the invitation to that mobile number, and the receptionist must verify the same number before clinic membership is granted.",
    doctor: "Receptionist's doctor",
    choose: "Choose one doctor",
    phone: "Recipient mobile number",
    phoneHelp: "Required. In Meta test mode, Meta only delivers to recipient numbers registered for the test account.",
    phonePlaceholder: "0750 123 4567",
    create: "WhatsApp invitations are not ready here yet",
    send: "Create and send on WhatsApp",
    creating: "Creating…",
    unavailable: "Secure direct WhatsApp invitations are not enabled in this environment yet.",
    checking: "Checking WhatsApp sender…",
    copy: "Copy link",
    copied: "Copied",
    share: "Share",
  },
  ku: {
    title: "بەستەری پارێزراوی چوونەژوورەوە بنێرە",
    help: "دکتۆری ستافی ڕیسێپشن هەڵبژێرە و بانگهێشتێکی یەکجارە بە WhatsApp بنێرە. Atlas بانگهێشتەکە بە هەمان ژمارەی مۆبایل دەبەستێتەوە و ستافەکە دەبێت هەمان ژمارە پشتڕاست بکاتەوە پێش وەرگرتنی ئەندامێتی کلینیک.",
    doctor: "دکتۆری ستافی ڕیسێپشن",
    choose: "یەک دکتۆر هەڵبژێرە",
    phone: "ژمارەی مۆبایلی وەرگر",
    phoneHelp: "پێویستە. لە دۆخی تاقیکردنەوەی Meta تەنها ژمارە تۆمارکراوەکانی تاقیکردنەوە پەیام وەردەگرن.",
    phonePlaceholder: "0750 123 4567",
    create: "بانگهێشتی WhatsApp هێشتا ئامادە نییە",
    send: "دروست بکە و بە WhatsApp بنێرە",
    creating: "دروست دەکرێت…",
    unavailable: "بانگهێشتی پارێزراوی ڕاستەوخۆی WhatsApp هێشتا لەم ژینگەیە چالاک نییە.",
    checking: "نێرەری WhatsApp پشکنین دەکرێت…",
    copy: "بەستەر کۆپی بکە",
    copied: "کۆپی کرا",
    share: "بنێرە",
  },
  bd: {
    title: "لینکا پاراستی یا چوونەژوورێ بهنێرە",
    help: "دکتۆرێ ستافێ ڕیسێپشنێ هەلبژێرە و بانگهێشتەکا ئێکجارە ب WhatsApp بهنێرە. Atlas بانگهێشتێ ب هەمان ژمارا موبایلێ گرێددەت و ستاف دڤێت هەمان ژمارە پشتڕاست بکەت بەری وەرگرتنا ئەندامەتیا کلینیکێ.",
    doctor: "دکتۆرێ ستافێ ڕیسێپشنێ",
    choose: "ئێک دکتۆر هەلبژێرە",
    phone: "ژمارا موبایلا وەرگری",
    phoneHelp: "پێدڤییە. د مودا تاقیکرنێ یا Meta دا تنێ ژمارێن تۆمارکری یێن تاقیکرنێ پەیام وەردگرن.",
    phonePlaceholder: "0750 123 4567",
    create: "بانگهێشتا WhatsApp هێشتا ئامادە نینە",
    send: "دروست بکە و ب WhatsApp بهنێرە",
    creating: "دهێتە دروستکرن…",
    unavailable: "بانگهێشتا پاراستی یا ڕاستەوخۆ ب WhatsApp هێشتا د ڤێ ژینگەهێ دا چالاک نینە.",
    checking: "نێرەرێ WhatsApp دهێتە پشکنین…",
    copy: "لینکێ کۆپی بکە",
    copied: "هاتە کۆپیکرن",
    share: "بهنێرە",
  },
  ar: {
    title: "أرسل رابط انضمام آمن",
    help: "اختر طبيب موظف الاستقبال وأرسل دعوة WhatsApp تستخدم مرة واحدة. Atlas يربط الدعوة بنفس رقم الموبايل، ولا تُمنح عضوية العيادة إلا بعد توثيق الموظف لهذا الرقم نفسه.",
    doctor: "طبيب موظف الاستقبال",
    choose: "اختر طبيباً واحداً",
    phone: "رقم موبايل المستلم",
    phoneHelp: "مطلوب. بوضع اختبار Meta الرسائل توصل فقط للأرقام المسجلة كمستلمين للاختبار.",
    phonePlaceholder: "0750 123 4567",
    create: "دعوات WhatsApp غير جاهزة هنا بعد",
    send: "إنشاء وإرسال عبر WhatsApp",
    creating: "جارٍ الإنشاء…",
    unavailable: "دعوات WhatsApp المباشرة والآمنة غير مفعلة في هذه البيئة بعد.",
    checking: "جارٍ التحقق من مُرسل WhatsApp…",
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
  const [directWhatsAppInvites, setDirectWhatsAppInvites] = useState(STATIC_DIRECT_WHATSAPP_INVITES);
  const [transportChecked, setTransportChecked] = useState(STATIC_DIRECT_WHATSAPP_INVITES);

  useEffect(() => {
    if (STATIC_DIRECT_WHATSAPP_INVITES) return;
    let active = true;
    void fetch("/api/whatsapp/test/health", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ ok?: unknown }> : null)
      .then((body) => {
        if (!active) return;
        if (body?.ok === true) setDirectWhatsAppInvites(true);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setTransportChecked(true);
      });
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

        <label htmlFor="invite_recipient_phone">{t.phone}</label>
        <input
          id="invite_recipient_phone"
          name="recipient_phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          placeholder={t.phonePlaceholder}
          required
          aria-describedby="invite_recipient_phone_help"
        />
        <div id="invite_recipient_phone_help" className="field-help">
          {!transportChecked ? t.checking : directWhatsAppInvites ? t.phoneHelp : t.unavailable}
        </div>

        <button
          className="button"
          type="submit"
          disabled={pending || doctors.length === 0 || !directWhatsAppInvites}
        >
          {pending ? t.creating : directWhatsAppInvites ? t.send : t.create}
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
