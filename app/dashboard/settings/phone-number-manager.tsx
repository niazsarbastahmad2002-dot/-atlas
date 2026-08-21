"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { maskPhone, normalizeAuthPhone, normalizeOtpToken } from "@/lib/phone-auth";
import type { UiLocale } from "@/lib/i18n/ui";

type Copy = {
  title: string;
  help: string;
  current: string;
  add: string;
  change: string;
  phone: string;
  send: string;
  sending: string;
  code: string;
  verify: string;
  verifying: string;
  cancel: string;
  invalidPhone: string;
  invalidCode: string;
  failed: string;
  verified: string;
};

const copyByLocale: Record<UiLocale, Copy> = {
  en: {
    title: "Sign-in phone",
    help: "Atlas verifies the new number before it replaces your current sign-in number. Your clinic ownership and user ID do not change.",
    current: "Verified phone",
    add: "Add phone number",
    change: "Change phone number",
    phone: "New mobile number",
    send: "Send verification code",
    sending: "Sending…",
    code: "Verification code",
    verify: "Verify phone",
    verifying: "Verifying…",
    cancel: "Cancel",
    invalidPhone: "Enter a valid mobile number, for example +9647501234567.",
    invalidCode: "Enter the verification code you received.",
    failed: "Atlas could not verify that phone number. Use the newest code and try again.",
    verified: "Phone number verified.",
  },
  ku: {
    title: "ژمارەی چوونەژوورەوە",
    help: "Atlas ژمارە نوێیەکە پشتڕاست دەکاتەوە پێش ئەوەی ببێتە ژمارەی چوونەژوورەوە. خاوەندارێتی کلینیک و ناسنامەی هەژمارەکەت ناگۆڕێت.",
    current: "ژمارەی پشتڕاستکراو",
    add: "ژمارە زیاد بکە",
    change: "ژمارە بگۆڕە",
    phone: "ژمارەی نوێی مۆبایل",
    send: "کۆدی پشتڕاستکردنەوە بنێرە",
    sending: "دەنێردرێت…",
    code: "کۆدی پشتڕاستکردنەوە",
    verify: "ژمارە پشتڕاست بکەرەوە",
    verifying: "پشتڕاست دەکرێتەوە…",
    cancel: "هەڵوەشاندنەوە",
    invalidPhone: "ژمارەیەکی دروست بنووسە، وەک +9647501234567.",
    invalidCode: "کۆدی پشتڕاستکردنەوە بنووسە.",
    failed: "Atlas نەیتوانی ژمارەکە پشتڕاست بکاتەوە. نوێترین کۆد بەکاربهێنە.",
    verified: "ژمارەی مۆبایل پشتڕاستکرایەوە.",
  },
  bd: {
    title: "ژمارا چوونەژوورێ",
    help: "Atlas ژمارا نوو پشتڕاست دکەت بەری کو ببیت ژمارا چوونەژوورێ. خاوەنداریا کلینیکێ و ناسناما هەژمارێ ناگوهەریت.",
    current: "ژمارا پشتڕاستکری",
    add: "ژمارە زێدە بکە",
    change: "ژمارە بگوهەرە",
    phone: "ژمارا نوو یا موبایلێ",
    send: "کۆدێ پشتڕاستکرنێ بهنێرە",
    sending: "دهێتە هنارتن…",
    code: "کۆدێ پشتڕاستکرنێ",
    verify: "ژمارێ پشتڕاست بکە",
    verifying: "دهێتە پشتڕاستکرن…",
    cancel: "هەلوەشاندن",
    invalidPhone: "ژمارەکا دروست بنڤیسە، وەک +9647501234567.",
    invalidCode: "کۆدێ پشتڕاستکرنێ بنڤیسە.",
    failed: "Atlas نەشیا ژمارێ پشتڕاست بکەت. نووترین کۆد بکاربینە.",
    verified: "ژمارا موبایلێ هاتە پشتڕاستکرن.",
  },
  ar: {
    title: "رقم تسجيل الدخول",
    help: "يتحقق Atlas من الرقم الجديد قبل استبدال رقم الدخول الحالي. ملكية العيادة ومعرّف حسابك لا يتغيران.",
    current: "الرقم الموثق",
    add: "إضافة رقم هاتف",
    change: "تغيير رقم الهاتف",
    phone: "رقم الموبايل الجديد",
    send: "إرسال رمز التحقق",
    sending: "جارٍ الإرسال…",
    code: "رمز التحقق",
    verify: "تحقق من الرقم",
    verifying: "جارٍ التحقق…",
    cancel: "إلغاء",
    invalidPhone: "أدخل رقم موبايل صحيح، مثلاً +9647501234567.",
    invalidCode: "أدخل رمز التحقق الذي وصلك.",
    failed: "تعذر التحقق من الرقم. استخدم أحدث رمز وحاول مرة ثانية.",
    verified: "تم توثيق رقم الهاتف.",
  },
};

export function PhoneNumberManager({ locale, currentPhone }: { locale: UiLocale; currentPhone: string | null }) {
  const copy = copyByLocale[locale];
  const router = useRouter();
  const [editing, setEditing] = useState(!currentPhone);
  const [phoneInput, setPhoneInput] = useState("");
  const [pendingPhone, setPendingPhone] = useState("");
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
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ phone });
      if (updateError) {
        setError(copy.failed);
        return;
      }
      setPendingPhone(phone);
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
    if (normalizedToken.length < 6) {
      setError(copy.invalidCode);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: pendingPhone,
        token: normalizedToken,
        type: "phone_change",
      });
      if (verifyError) {
        setError(copy.failed);
        return;
      }
      setNotice(copy.verified);
      setEditing(false);
      setStep("phone");
      setPhoneInput("");
      setPendingPhone("");
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
          <input id="account-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+9647501234567" value={phoneInput} onChange={(event) => setPhoneInput(event.target.value)} dir="ltr" required />
          <div className="compact-actions">
            <button className="button button-small" type="submit" disabled={busy}>{busy ? copy.sending : copy.send}</button>
            {currentPhone ? <button className="button button-ghost button-small" type="button" onClick={cancel}>{copy.cancel}</button> : null}
          </div>
        </form>
      ) : (
        <form className="settings-form" onSubmit={verifyChange}>
          <p className="field-help">{copy.code} · <span dir="ltr">{maskPhone(pendingPhone)}</span></p>
          <label htmlFor="account-phone-code">{copy.code}</label>
          <input id="account-phone-code" inputMode="numeric" autoComplete="one-time-code" value={token} onChange={(event) => setToken(normalizeOtpToken(event.target.value))} placeholder="123456" dir="ltr" required autoFocus />
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
