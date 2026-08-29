"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatPhoneForDisplay } from "@/lib/phone-display";
import { maskPhone, normalizeAuthPhone, normalizeOtpToken } from "@/lib/phone-auth";
import type { UiLocale } from "@/lib/i18n/ui";

type Copy = {
  title: string;
  help: string;
  current: string;
  phone: string;
  send: string;
  sending: string;
  code: string;
  verify: string;
  verifying: string;
  samePhone: string;
  invalidPhone: string;
  invalidCode: string;
  failed: string;
  verified: string;
};

const copyByLocale: Record<UiLocale, Copy> = {
  en: {
    title: "Change sign-in phone",
    help: "Use this only when you want to move your Atlas login to a different phone number. Your account, clinic access, ownership, and permissions stay the same.",
    current: "Current verified phone",
    phone: "New phone number",
    send: "Send verification code",
    sending: "Sending…",
    code: "Verification code",
    verify: "Verify and change phone",
    verifying: "Verifying…",
    samePhone: "This is already your current Atlas phone. Enter a new phone number.",
    invalidPhone: "Enter a valid new phone number.",
    invalidCode: "Enter the verification code you received.",
    failed: "Atlas could not start the phone-number change. Nothing was changed.",
    verified: "Your Atlas sign-in phone was changed successfully.",
  },
  ku: {
    title: "گۆڕینی ژمارەی چوونەژوورەوە",
    help: "تەنها کاتێک ئەمە بەکاربهێنە کە دەتەوێت چوونەژوورەوەی Atlas بگوازیتە ژمارەیەکی تر. هەژمارەکەت، دەسەڵاتی کلینیک، خاوەندارێتی و دەسەڵاتەکانت هەر وەک خۆیان دەمێننەوە.",
    current: "ژمارەی ئێستای پشتڕاستکراو",
    phone: "ژمارەی نوێ",
    send: "کۆدی پشتڕاستکردنەوە بنێرە",
    sending: "دەنێردرێت…",
    code: "کۆدی پشتڕاستکردنەوە",
    verify: "پشتڕاست بکەرەوە و ژمارەکە بگۆڕە",
    verifying: "پشتڕاست دەکرێتەوە…",
    samePhone: "ئەمە هەر ژمارەی ئێستای تۆیە. ژمارەیەکی نوێ بنووسە.",
    invalidPhone: "ژمارەیەکی نوێ و دروست بنووسە.",
    invalidCode: "کۆدی پشتڕاستکردنەوەی گەیشتوو بنووسە.",
    failed: "Atlas نەیتوانی گۆڕینی ژمارەکە دەستپێبکات. هیچ شتێک نەگۆڕا.",
    verified: "ژمارەی چوونەژوورەوەی Atlas بە سەرکەوتوویی گۆڕا.",
  },
  bd: {
    title: "گوهارتنا ژمارا چوونەژوورێ",
    help: "تەنێ دەمێ ئەڤێ بکاربینە کو تو دخوازیت چوونەژوورا Atlas بگوهێزیتە ژمارەکا دی. هەژمار، دەستهەلاتا کلینیکێ، خاوەنداری و دەستهەلاتێن تە هەر وەک خۆ دەمینن.",
    current: "ژمارا نوکە یا پشتڕاستکری",
    phone: "ژمارا نوو",
    send: "کۆدێ پشتڕاستکرنێ بهنێرە",
    sending: "دهێتە هنارتن…",
    code: "کۆدێ پشتڕاستکرنێ",
    verify: "پشتڕاست بکە و ژمارێ بگوهەرە",
    verifying: "دهێتە پشتڕاستکرن…",
    samePhone: "ئەڤە هەر ژمارا نوکە یا تەیە. ژمارەکا نوو بنڤیسە.",
    invalidPhone: "ژمارەکا نوو و دروست بنڤیسە.",
    invalidCode: "کۆدێ پشتڕاستکرنێ یێ گەهشتی بنڤیسە.",
    failed: "Atlas نەشیا گوهارتنا ژمارێ دەستپێبکەت. چ تشت نەهاتە گوهارتن.",
    verified: "ژمارا چوونەژوورا Atlas ب سەرکەفتی هاتە گوهارتن.",
  },
  ar: {
    title: "تغيير رقم تسجيل الدخول",
    help: "استخدم هذا فقط إذا تريد نقل دخول Atlas إلى رقم هاتف مختلف. حسابك وصلاحيات العيادة والملكية تبقى نفسها.",
    current: "رقمك الموثق الحالي",
    phone: "رقم الهاتف الجديد",
    send: "إرسال رمز التحقق",
    sending: "جارٍ الإرسال…",
    code: "رمز التحقق",
    verify: "تحقق وغيّر الرقم",
    verifying: "جارٍ التحقق…",
    samePhone: "هذا هو رقمك الحالي بالفعل. أدخل رقم هاتف جديداً.",
    invalidPhone: "أدخل رقم هاتف جديداً وصحيحاً.",
    invalidCode: "أدخل رمز التحقق الذي وصلك.",
    failed: "تعذر بدء تغيير رقم الهاتف. لم يتغير شيء.",
    verified: "تم تغيير رقم تسجيل الدخول في Atlas بنجاح.",
  },
};

export function PhoneChangeForm({ locale, currentPhone }: { locale: UiLocale; currentPhone: string | null }) {
  const copy = copyByLocale[locale];
  const router = useRouter();
  const normalizedCurrentPhone = currentPhone ? normalizeAuthPhone(currentPhone) : null;
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
    if (!phone) {
      setError(copy.invalidPhone);
      return;
    }
    if (normalizedCurrentPhone && phone === normalizedCurrentPhone) {
      setError(copy.samePhone);
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
      setPhoneInput("");
      setPendingPhone("");
      setToken("");
      setStep("phone");
      router.refresh();
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-form">
      <div>
        <h2>{copy.title}</h2>
        <p className="field-help">{copy.help}</p>
      </div>

      {currentPhone ? (
        <div className="settings-readonly-clinic">
          <span>{copy.current}</span>
          <strong className="atlas-phone-display" dir="ltr">{formatPhoneForDisplay(currentPhone)}</strong>
        </div>
      ) : null}

      {step === "phone" ? (
        <form className="settings-form" onSubmit={requestChange}>
          <label htmlFor="new-sign-in-phone">{copy.phone}</label>
          <input
            id="new-sign-in-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phoneInput}
            onChange={(event) => setPhoneInput(event.target.value)}
            dir="ltr"
            required
          />
          <button className="button" type="submit" disabled={busy}>{busy ? copy.sending : copy.send}</button>
        </form>
      ) : (
        <form className="settings-form" onSubmit={verifyChange}>
          <p className="field-help">{copy.code} · <span dir="ltr">{maskPhone(pendingPhone)}</span></p>
          <label htmlFor="sign-in-phone-code">{copy.code}</label>
          <input
            id="sign-in-phone-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={token}
            onChange={(event) => setToken(normalizeOtpToken(event.target.value))}
            placeholder="123456"
            dir="ltr"
            required
            autoFocus
          />
          <button className="button" type="submit" disabled={busy}>{busy ? copy.verifying : copy.verify}</button>
        </form>
      )}

      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      {notice ? <p className="notice notice-success" role="status">{notice}</p> : null}
    </div>
  );
}
