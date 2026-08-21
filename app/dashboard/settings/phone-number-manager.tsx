"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { maskPhone, normalizeAuthPhone, normalizeOtpToken } from "@/lib/phone-auth";
import type { UiLocale } from "@/lib/i18n/ui";

type Copy = {
  title: string; help: string; current: string; add: string; change: string; phone: string;
  send: string; sending: string; code: string; codeHelp: string; verify: string; verifying: string;
  cancel: string; invalidPhone: string; invalidCode: string; failed: string; verified: string;
  rate: string; inUse: string;
};

const copyByLocale: Record<UiLocale, Copy> = {
  en: {
    title: "WhatsApp sign-in number",
    help: "Atlas sends a code to the new WhatsApp number before replacing your sign-in number. Your clinic ownership and user ID stay the same.",
    current: "Verified WhatsApp number",
    add: "Add WhatsApp number",
    change: "Change WhatsApp number",
    phone: "New WhatsApp number",
    send: "Send code to WhatsApp",
    sending: "Sending to WhatsApp…",
    code: "WhatsApp verification code",
    codeHelp: "Open WhatsApp, copy the newest 6-digit Atlas code, and enter it here.",
    verify: "Verify and change number",
    verifying: "Verifying…",
    cancel: "Cancel",
    invalidPhone: "Enter a valid mobile number, for example 07501234567 or +9647501234567.",
    invalidCode: "Enter the 6-digit code from WhatsApp.",
    failed: "Atlas could not verify that WhatsApp number. Use the newest code and try again.",
    verified: "WhatsApp sign-in number changed successfully.",
    rate: "Too many verification requests. Wait a little and try again.",
    inUse: "That WhatsApp number already belongs to another Atlas account.",
  },
  ku: {
    title: "ژمارەی WhatsApp ـی چوونەژوورەوە",
    help: "Atlas کۆدێک بۆ ژمارە نوێیەکەی WhatsApp دەنێرێت پێش ئەوەی ببێتە ژمارەی چوونەژوورەوە. خاوەندارێتی کلینیک و ناسنامەی هەژمارەکەت ناگۆڕێت.",
    current: "ژمارەی WhatsApp ـی پشتڕاستکراو",
    add: "ژمارەی WhatsApp زیاد بکە",
    change: "ژمارەی WhatsApp بگۆڕە",
    phone: "ژمارەی نوێی WhatsApp",
    send: "کۆد بۆ WhatsApp بنێرە",
    sending: "بۆ WhatsApp دەنێردرێت…",
    code: "کۆدی پشتڕاستکردنەوەی WhatsApp",
    codeHelp: "WhatsApp بکەرەوە، نوێترین کۆدی ٦ ژمارەیی Atlas کۆپی بکە و لێرە بنووسە.",
    verify: "پشتڕاست بکە و ژمارە بگۆڕە",
    verifying: "پشتڕاست دەکرێتەوە…",
    cancel: "هەڵوەشاندنەوە",
    invalidPhone: "ژمارەیەکی دروست بنووسە، وەک 07501234567 یان +9647501234567.",
    invalidCode: "کۆدی ٦ ژمارەیی WhatsApp بنووسە.",
    failed: "Atlas نەیتوانی ژمارەکە پشتڕاست بکاتەوە. نوێترین کۆد بەکاربهێنە.",
    verified: "ژمارەی WhatsApp ـی چوونەژوورەوە بە سەرکەوتوویی گۆڕدرا.",
    rate: "داواکاری پشتڕاستکردنەوە زۆر بووە. کەمێک چاوەڕێ بکە.",
    inUse: "ئەم ژمارەی WhatsApp ـە پێشتر بە هەژمارێکی تری Atlas بەستراوەتەوە.",
  },
  bd: {
    title: "ژمارا WhatsApp یا چوونەژوورێ",
    help: "Atlas کۆدەکێ بۆ ژمارا نوو یا WhatsApp دهنێریت بەری کو ژمارا چوونەژوورێ بهێتە گوهارتن. خاوەنداریا کلینیکێ و ناسناما هەژمارێ ناگوهەریت.",
    current: "ژمارا WhatsApp یا پشتڕاستکری",
    add: "ژمارا WhatsApp زێدە بکە",
    change: "ژمارا WhatsApp بگوهەرە",
    phone: "ژمارا نوو یا WhatsApp",
    send: "کۆدێ بۆ WhatsApp بهنێرە",
    sending: "بۆ WhatsApp دهێتە هنارتن…",
    code: "کۆدێ پشتڕاستکرنا WhatsApp",
    codeHelp: "WhatsApp ڤەکە، نووترین کۆدێ ٦ ژمارەیی یێ Atlas کۆپی بکە و ل ڤێرێ بنڤیسە.",
    verify: "پشتڕاست بکە و ژمارێ بگوهەرە",
    verifying: "دهێتە پشتڕاستکرن…",
    cancel: "هەلوەشاندن",
    invalidPhone: "ژمارەکا دروست بنڤیسە، وەک 07501234567 یان +9647501234567.",
    invalidCode: "کۆدێ ٦ ژمارەیی یێ WhatsApp بنڤیسە.",
    failed: "Atlas نەشیا ژمارێ پشتڕاست بکەت. نووترین کۆد بکاربینە.",
    verified: "ژمارا WhatsApp یا چوونەژوورێ ب سەرکەفتن هاتە گوهارتن.",
    rate: "داخوازێن پشتڕاستکرنێ زۆر بوون. کەمەک چاوەرێ بکە.",
    inUse: "ئەڤ ژمارا WhatsApp پێشتر ب هەژمارەکا دی یا Atlas گرێدایە.",
  },
  ar: {
    title: "رقم واتساب لتسجيل الدخول",
    help: "Atlas يرسل كود إلى رقم واتساب الجديد قبل استبدال رقم الدخول الحالي. ملكية العيادة ومعرّف حسابك يبقون نفسهم.",
    current: "رقم واتساب الموثق",
    add: "إضافة رقم واتساب",
    change: "تغيير رقم واتساب",
    phone: "رقم واتساب الجديد",
    send: "إرسال الكود إلى واتساب",
    sending: "جارٍ الإرسال إلى واتساب…",
    code: "كود التحقق من واتساب",
    codeHelp: "افتح واتساب، انسخ أحدث كود Atlas المكوّن من 6 أرقام، واكتبه هنا.",
    verify: "تحقق وغيّر الرقم",
    verifying: "جارٍ التحقق…",
    cancel: "إلغاء",
    invalidPhone: "اكتب رقم موبايل صحيح، مثلاً 07501234567 أو +9647501234567.",
    invalidCode: "اكتب كود واتساب المكوّن من 6 أرقام.",
    failed: "Atlas ما قدر يوثق رقم واتساب. استخدم أحدث كود وحاول مرة ثانية.",
    verified: "تم تغيير رقم واتساب لتسجيل الدخول بنجاح.",
    rate: "تم طلب أكواد كثيرة. انتظر شوي وحاول مرة ثانية.",
    inUse: "رقم واتساب هذا مرتبط بحساب Atlas آخر.",
  },
};

type ApiBody = { challengeId?: string; phone?: string; resendAfterSeconds?: number; ok?: boolean; error?: string };

function apiError(copy: Copy, code?: string) {
  if (code === "rate_limited" || code === "too_many_attempts") return copy.rate;
  if (code === "phone_in_use") return copy.inUse;
  return copy.failed;
}

export function PhoneNumberManager({ locale, currentPhone }: { locale: UiLocale; currentPhone: string | null }) {
  const copy = copyByLocale[locale];
  const router = useRouter();
  const [editing, setEditing] = useState(!currentPhone);
  const [phoneInput, setPhoneInput] = useState("");
  const [pendingPhone, setPendingPhone] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function requestChange(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const phone = normalizeAuthPhone(phoneInput);
    if (!phone || phone === currentPhone) {
      setError(copy.invalidPhone);
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/whatsapp/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const body = await response.json() as ApiBody;
      if (!response.ok || !body.challengeId || !body.phone) {
        setError(apiError(copy, body.error));
        return;
      }
      setPendingPhone(body.phone);
      setChallengeId(body.challengeId);
      setToken("");
      setStep("code");
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  async function verifyChange(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const normalizedToken = normalizeOtpToken(token);
    if (!/^\d{6}$/.test(normalizedToken)) {
      setError(copy.invalidCode);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/whatsapp/change-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: pendingPhone, challengeId, code: normalizedToken }),
      });
      const body = await response.json() as ApiBody;
      if (!response.ok || !body.ok) {
        setError(apiError(copy, body.error));
        return;
      }
      setNotice(copy.verified);
      setEditing(false);
      setStep("phone");
      setPhoneInput("");
      setPendingPhone("");
      setChallengeId("");
      setToken("");
      router.refresh();
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setEditing(false);
    setStep("phone");
    setPhoneInput("");
    setPendingPhone("");
    setChallengeId("");
    setToken("");
    setError("");
  }

  return (
    <div className="settings-form">
      <div>
        <strong>{copy.title}</strong>
        <p className="field-help">{copy.help}</p>
      </div>
      {currentPhone ? (
        <div className="settings-readonly-clinic">
          <span>{copy.current}</span>
          <strong dir="ltr">{currentPhone}</strong>
        </div>
      ) : null}

      {!editing ? (
        <button className="button button-ghost button-small" type="button" onClick={() => { setEditing(true); setNotice(""); }}>
          {currentPhone ? copy.change : copy.add}
        </button>
      ) : step === "phone" ? (
        <form className="settings-form" onSubmit={requestChange}>
          <label htmlFor="account-phone">{copy.phone}</label>
          <input id="account-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0750 123 4567" value={phoneInput} onChange={(event) => setPhoneInput(event.target.value)} dir="ltr" required />
          <div className="compact-actions">
            <button className="button button-small" type="submit" disabled={busy}>{busy ? copy.sending : copy.send}</button>
            {currentPhone ? <button className="button button-ghost button-small" type="button" onClick={cancel}>{copy.cancel}</button> : null}
          </div>
        </form>
      ) : (
        <form className="settings-form" onSubmit={verifyChange}>
          <p className="field-help">{copy.codeHelp} <span dir="ltr">{maskPhone(pendingPhone)}</span></p>
          <label htmlFor="account-phone-code">{copy.code}</label>
          <input id="account-phone-code" inputMode="numeric" autoComplete="one-time-code" value={token} onChange={(event) => setToken(normalizeOtpToken(event.target.value))} placeholder="123456" maxLength={6} dir="ltr" required autoFocus />
          <div className="compact-actions">
            <button className="button button-small" type="submit" disabled={busy}>{busy ? copy.verifying : copy.verify}</button>
            <button className="button button-ghost button-small" type="button" onClick={() => { setStep("phone"); setError(""); }}>{copy.cancel}</button>
          </div>
        </form>
      )}

      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      {notice ? <p className="notice notice-success" role="status">{notice}</p> : null}
    </div>
  );
}
