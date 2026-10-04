"use client";

import { useState, type FormEvent } from "react";
import { AuthDeliverySelector } from "@/app/components/auth-delivery-selector";
import { OtpCodeField } from "@/app/components/otp-code-field";
import type { UiLocale } from "@/lib/i18n/ui";
import { maskPhone, normalizeAuthPhone, normalizeOtpToken } from "@/lib/phone-auth";
import { createEphemeralVerificationClient } from "@/lib/supabase/verification-client";

type Delivery = "sms" | "whatsapp";

const copy: Record<UiLocale, {
  phone: string;
  phoneHint: string;
  delivery: string;
  sms: string;
  whatsapp: string;
  send: string;
  sending: string;
  codeTitle: string;
  codeHelp: string;
  code: string;
  paste: string;
  pasteFailed: string;
  verify: string;
  verifying: string;
  resend: string;
  change: string;
  invalidPhone: string;
  invalidCode: string;
  incorrectCode: string;
  rateLimited: string;
  failed: string;
  notReady: string;
  privacy: string;
}> = {
  en: {
    phone: "Mobile number",
    phoneHint: "Use the same verified Iraqi mobile number you use for Atlas bookings.",
    delivery: "Receive the verification code by",
    sms: "SMS",
    whatsapp: "WhatsApp",
    send: "Sign in with mobile",
    sending: "Sending code…",
    codeTitle: "Enter the verification code",
    codeHelp: "Atlas sent a one-time code to",
    code: "Verification code",
    paste: "Paste code",
    pasteFailed: "Atlas could not paste a valid code. Enter it manually.",
    verify: "Open my appointments",
    verifying: "Verifying…",
    resend: "Send another code",
    change: "Change number",
    invalidPhone: "Enter a valid Iraqi mobile number.",
    invalidCode: "Enter the verification code you received.",
    incorrectCode: "That code is incorrect or expired. Use the newest code.",
    rateLimited: "Too many attempts. Wait a little and try again.",
    failed: "Atlas could not sign you in. Try again.",
    notReady: "Patient sign-in is not active yet. Care discovery still works; phone verification will be enabled only after the messaging provider is ready.",
    privacy: "This patient session is separate from any clinic/staff login on this device.",
  },
  ku: {
    phone: "ژمارەی مۆبایل",
    phoneHint: "هەمان ژمارەی عێراقی پشتڕاستکراوە بەکاربهێنە کە بۆ مەوعیدەکانی Atlas بەکاردەهێنیت.",
    delivery: "کۆدی پشتڕاستکردنەوە وەربگرە بە",
    sms: "SMS",
    whatsapp: "WhatsApp",
    send: "بە مۆبایل بچۆ ژوورەوە",
    sending: "کۆد دەنێردرێت…",
    codeTitle: "کۆدی پشتڕاستکردنەوە بنووسە",
    codeHelp: "Atlas کۆدێکی یەکجارەی نارد بۆ",
    code: "کۆدی پشتڕاستکردنەوە",
    paste: "کۆد دابنێ",
    pasteFailed: "Atlas نەیتوانی کۆدێکی دروست دابنێت. بە دەست بنووسە.",
    verify: "مەوعیدەکانم بکەرەوە",
    verifying: "پشتڕاست دەکرێتەوە…",
    resend: "کۆدێکی تر بنێرە",
    change: "ژمارە بگۆڕە",
    invalidPhone: "ژمارەیەکی دروستی مۆبایلی عێراقی بنووسە.",
    invalidCode: "کۆدی پشتڕاستکردنەوە بنووسە.",
    incorrectCode: "کۆدەکە هەڵەیە یان بەسەرچووە. نوێترین کۆد بەکاربهێنە.",
    rateLimited: "هەوڵەکان زۆر بوون. کەمێک چاوەڕێ بکە و دووبارە هەوڵبدەوە.",
    failed: "Atlas نەیتوانی بچێتە ژوورەوە. دووبارە هەوڵبدەوە.",
    notReady: "چوونەژوورەوەی نەخۆش هێشتا چالاک نییە. گەڕان بەدوای چارەسەردا کار دەکات؛ پشتڕاستکردنەوەی مۆبایل تەنها دوای ئامادەبوونی پێشکەشکاری نامە چالاک دەکرێت.",
    privacy: "ئەم دانیشتنەی نەخۆش جیاوازە لە هەر چوونەژوورەوەی کلینیک یان ستاف لەسەر ئەم ئامێرە.",
  },
  bd: {
    phone: "ژمارا موبایلێ",
    phoneHint: "هەمان ژمارا عێراقێ یا پشتڕاستکری بکاربینە کو بۆ وادەیێن Atlas بکار دئینی.",
    delivery: "کۆدێ پشتڕاستکرنێ وەربگرە ب",
    sms: "SMS",
    whatsapp: "WhatsApp",
    send: "ب موبایلێ بچۆ ژوور",
    sending: "کۆد دهێتە هنارتن…",
    codeTitle: "کۆدێ پشتڕاستکرنێ بنڤیسە",
    codeHelp: "Atlas کۆدەکێ ئێکجارە هنارت بۆ",
    code: "کۆدێ پشتڕاستکرنێ",
    paste: "کۆد دابنێ",
    pasteFailed: "Atlas نەشیا کۆدەکێ دروست دابنێت. ب دەستی بنڤیسە.",
    verify: "وادەیێن من بکەڤە",
    verifying: "دهێتە پشتڕاستکرن…",
    resend: "کۆدەکێ دی بهنێرە",
    change: "ژمارێ بگوهۆڕە",
    invalidPhone: "ژمارەکا دروستا موبایلا عێراقێ بنڤیسە.",
    invalidCode: "کۆدێ پشتڕاستکرنێ بنڤیسە.",
    incorrectCode: "کۆد خەلەتە یان دەمێ وی بەسەرچووە. نووترین کۆد بکاربینە.",
    rateLimited: "هەول زۆر بوون. کەمەک چاوەرێ بکە و جارەکا دی هەول بدە.",
    failed: "Atlas نەشیا تە بخەتە ژوور. جارەکا دی هەول بدە.",
    notReady: "چوونا ژوور یا نەخۆشی هێشتا چالاک نینە. گەڕانا چاڤدێریێ کار دکەت؛ پشتڕاستکرنا موبایلێ تەنێ پشتی ئامادەبوونا پێشکەشکارێ نامەیان چالاک دبیت.",
    privacy: "ئەڤ دانیشتنا نەخۆشی ژ هەر چوونا ژوورا کلینیک یان ستافی ل سەر ڤی ئامێری جودایە.",
  },
  ar: {
    phone: "رقم الموبايل",
    phoneHint: "استخدم نفس رقم الموبايل العراقي الموثق الذي تستخدمه لحجوزات Atlas.",
    delivery: "استلم رمز التحقق عبر",
    sms: "SMS",
    whatsapp: "WhatsApp",
    send: "دخول برقم الموبايل",
    sending: "جارٍ إرسال الرمز…",
    codeTitle: "أدخل رمز التحقق",
    codeHelp: "أرسل Atlas رمزاً لمرة واحدة إلى",
    code: "رمز التحقق",
    paste: "لصق الرمز",
    pasteFailed: "تعذر لصق رمز صالح. اكتبه يدوياً.",
    verify: "افتح مواعيدي",
    verifying: "جارٍ التحقق…",
    resend: "إرسال رمز آخر",
    change: "تغيير الرقم",
    invalidPhone: "اكتب رقم موبايل عراقي صحيح.",
    invalidCode: "أدخل رمز التحقق الذي وصلك.",
    incorrectCode: "الرمز غير صحيح أو منتهي. استخدم أحدث رمز.",
    rateLimited: "المحاولات كثيرة. انتظر قليلاً وحاول مرة ثانية.",
    failed: "تعذر على Atlas تسجيل دخولك. حاول مرة ثانية.",
    notReady: "دخول المرضى غير مفعّل بعد. البحث عن الرعاية يعمل الآن؛ وسيُفعّل توثيق الموبايل فقط بعد جاهزية مزود الرسائل.",
    privacy: "جلسة المريض هذه منفصلة عن أي دخول للعيادة أو الموظفين على هذا الجهاز.",
  },
};

function isRateLimitError(error: { code?: string; message?: string } | null) {
  const value = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return value.includes("rate") || value.includes("too many") || value.includes("over_sms_send_rate_limit");
}

export function PatientAccountLoginForm({
  locale,
  ready,
  whatsappOtpEnabled,
}: {
  locale: UiLocale;
  ready: boolean;
  whatsappOtpEnabled: boolean;
}) {
  const t = copy[locale];
  const [phoneInput, setPhoneInput] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [token, setToken] = useState("");
  const [delivery, setDelivery] = useState<Delivery>("sms");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!ready) {
    return (
      <div className="patient-account-not-ready">
        <p>{t.notReady}</p>
        <a className="button" href={`/care?lang=${locale}`}>Atlas Care</a>
        <p className="quiet">{t.privacy}</p>
      </div>
    );
  }

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    const phone = normalizeAuthPhone(phoneInput);
    if (!phone || !/^\+9647\d{9}$/.test(phone)) {
      setError(t.invalidPhone);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const supabase = createEphemeralVerificationClient();
      const { error: sendError } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: true,
          ...(delivery === "whatsapp" ? { channel: "whatsapp" as const } : {}),
        },
      });
      if (sendError) {
        setError(isRateLimitError(sendError) ? t.rateLimited : t.failed);
        return;
      }
      setVerifiedPhone(phone);
      setToken("");
      setStep("code");
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const normalizedToken = normalizeOtpToken(token);
    if (normalizedToken.length < 6) {
      setError(t.invalidCode);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const supabase = createEphemeralVerificationClient();
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: verifiedPhone,
        token: normalizedToken,
        type: "sms",
      });
      const accessToken = data.session?.access_token;
      if (verifyError || !accessToken) {
        setError(isRateLimitError(verifyError) ? t.rateLimited : t.incorrectCode);
        return;
      }

      const response = await fetch("/patient-account/api/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await response.json().catch(() => null) as { status?: string } | null;
      if (!response.ok || result?.status !== "ok") {
        setError(result?.status === "rate_limited" ? t.rateLimited : t.failed);
        return;
      }

      window.location.replace(`/patient-account?lang=${locale}`);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="patient-account-login-card">
      {step === "phone" ? (
        <form onSubmit={sendCode} className="patient-account-login-form">
          <label>
            <span>{t.phone}</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              value={phoneInput}
              onChange={(event) => { setPhoneInput(event.target.value); setError(""); }}
              placeholder="0750 123 4567"
              required
            />
            <small>{t.phoneHint}</small>
          </label>
          {whatsappOtpEnabled ? (
            <AuthDeliverySelector
              legend={t.delivery}
              value={delivery}
              onChange={setDelivery}
              smsLabel={t.sms}
              whatsappLabel={t.whatsapp}
              showSms
              showWhatsApp
              name="patient-account-delivery"
            />
          ) : null}
          <button className="button" type="submit" disabled={busy}>
            {busy ? t.sending : t.send}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="patient-account-login-form">
          <div className="patient-account-code-heading">
            <strong>{t.codeTitle}</strong>
            <p>{t.codeHelp} <span dir="ltr">{maskPhone(verifiedPhone)}</span>.</p>
          </div>
          <OtpCodeField
            id="patient-account-otp"
            label={t.code}
            value={token}
            onChange={(value) => { setToken(value); setError(""); }}
            pasteLabel={t.paste}
            onPasteFailure={() => setError(t.pasteFailed)}
            autoFocus
          />
          <button className="button" type="submit" disabled={busy}>
            {busy ? t.verifying : t.verify}
          </button>
          <div className="patient-account-login-actions">
            <button className="button button-ghost button-small" type="button" disabled={busy} onClick={() => void sendCode()}>
              {t.resend}
            </button>
            <button className="button button-ghost button-small" type="button" disabled={busy} onClick={() => { setStep("phone"); setToken(""); setError(""); }}>
              {t.change}
            </button>
          </div>
        </form>
      )}
      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      <p className="quiet">{t.privacy}</p>
    </section>
  );
}
