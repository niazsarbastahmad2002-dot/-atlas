"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
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
  register: string;
  sending: string;
  codeTitle: string;
  codeHelp: string;
  code: string;
  paste: string;
  pasteFailed: string;
  verify: string;
  verifyRegister: string;
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
  why: string;
  codeTip: string;
  resent: string;
  expiredCode: string;
  network: string;
  cooldownLabel: string;
}> = {
  en: {
    phone: "Mobile number",
    phoneHint: "Use the same verified Iraqi mobile number you use for Atlas bookings.",
    delivery: "Receive the verification code by",
    sms: "SMS",
    whatsapp: "WhatsApp",
    send: "Sign in with mobile",
    register: "Continue with mobile",
    sending: "Sending code…",
    codeTitle: "Enter the verification code",
    codeHelp: "Atlas sent a one-time code to",
    code: "Verification code",
    paste: "Paste code",
    pasteFailed: "Atlas could not paste a valid code. Enter it manually.",
    verify: "Open my appointments",
    verifyRegister: "Verify and open my account",
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
    why: "Verification protects your private appointments by confirming that this mobile number is yours.",
    codeTip: "Use the newest code. Never share it with anyone.",
    resent: "A new code was sent.",
    expiredCode: "This code has expired. Request a new code to continue.",
    network: "Connection interrupted. Check your internet and try again.",
    cooldownLabel: "Request another code in",
  },
  ku: {
    phone: "ژمارەی مۆبایل",
    phoneHint: "هەمان ژمارەی عێراقی پشتڕاستکراوە بەکاربهێنە کە بۆ مەوعیدەکانی Atlas بەکاردەهێنیت.",
    delivery: "کۆدی پشتڕاستکردنەوە وەربگرە بە",
    sms: "SMS",
    whatsapp: "WhatsApp",
    send: "بە مۆبایل بچۆ ژوورەوە",
    register: "بە ژمارەی مۆبایل بەردەوام بە",
    sending: "کۆد دەنێردرێت…",
    codeTitle: "کۆدی پشتڕاستکردنەوە بنووسە",
    codeHelp: "Atlas کۆدێکی یەکجارەی نارد بۆ",
    code: "کۆدی پشتڕاستکردنەوە",
    paste: "کۆد دابنێ",
    pasteFailed: "Atlas نەیتوانی کۆدێکی دروست دابنێت. بە دەست بنووسە.",
    verify: "مەوعیدەکانم بکەرەوە",
    verifyRegister: "پشتڕاست بکەرەوە و هەژمارەکەم بکەرەوە",
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
    why: "بۆ پاراستنی مەوعیدە تایبەتییەکانت، پێویستە دڵنیابین کە ئەم ژمارەی مۆبایلە هی تۆیە.",
    codeTip: "نوێترین کۆد بەکاربهێنە و بە هیچ کەسێکی مەدە.",
    resent: "کۆدێکی نوێ نێردرا.",
    expiredCode: "ماوەی ئەم کۆدە تەواو بووە. بۆ بەردەوامبوون کۆدێکی نوێ داوا بکە.",
    network: "پەیوەندی ئینتەرنێت پچڕا. ئینتەرنێتەکەت بپشکنە و دووبارە هەوڵ بدە.",
    cooldownLabel: "داواکردنی کۆدی تر دوای",
  },
  bd: {
    phone: "ژمارا موبایلێ",
    phoneHint: "هەمان ژمارا عێراقێ یا پشتڕاستکری بکاربینە کو بۆ وادەیێن Atlas بکار دئینی.",
    delivery: "کۆدێ پشتڕاستکرنێ وەربگرە ب",
    sms: "SMS",
    whatsapp: "WhatsApp",
    send: "ب موبایلێ بچۆ ژوور",
    register: "ب ژمارا موبایلێ بەردەوام بە",
    sending: "کۆد دهێتە هنارتن…",
    codeTitle: "کۆدێ پشتڕاستکرنێ بنڤیسە",
    codeHelp: "Atlas کۆدەکێ ئێکجارە هنارت بۆ",
    code: "کۆدێ پشتڕاستکرنێ",
    paste: "کۆد دابنێ",
    pasteFailed: "Atlas نەشیا کۆدەکێ دروست دابنێت. ب دەستی بنڤیسە.",
    verify: "وادەیێن من بکەڤە",
    verifyRegister: "پشتڕاست بکە و هەژمارا من ڤەکە",
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
    why: "بۆ پاراستنا وادەیێن تایبەت یێن تە، پێدڤییە پشتڕاست بکەین کو ئەڤ ژمارا موبایلێ یا تەیە.",
    codeTip: "نووترین کۆد بکاربینە و نەدە کەسەکی.",
    resent: "کۆدەکێ نوو هاتە هنارتن.",
    expiredCode: "دەمێ ڤی کۆدی بەسەر چوو. کۆدەکێ نوو بخوازە.",
    network: "پەیوەندیا ئینتەرنێتێ پچڕی. ئینتەرنێتا خۆ بپشکنە و جارەکا دی هەول بدە.",
    cooldownLabel: "داخوازکرنا کۆدەکێ دی پشتی",
  },
  ar: {
    phone: "رقم الموبايل",
    phoneHint: "استخدم نفس رقم الموبايل العراقي الموثق الذي تستخدمه لحجوزات Atlas.",
    delivery: "استلم رمز التحقق عبر",
    sms: "SMS",
    whatsapp: "WhatsApp",
    send: "دخول برقم الموبايل",
    register: "متابعة برقم الموبايل",
    sending: "جارٍ إرسال الرمز…",
    codeTitle: "أدخل رمز التحقق",
    codeHelp: "أرسل Atlas رمزاً لمرة واحدة إلى",
    code: "رمز التحقق",
    paste: "لصق الرمز",
    pasteFailed: "تعذر لصق رمز صالح. اكتبه يدوياً.",
    verify: "افتح مواعيدي",
    verifyRegister: "وثّق الرقم وافتح حسابي",
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
    why: "نتحقق من ملكية رقم الموبايل حتى نحمي مواعيدك الخاصة.",
    codeTip: "استخدم أحدث رمز ولا تشاركه مع أي شخص.",
    resent: "تم إرسال رمز جديد.",
    expiredCode: "انتهت صلاحية هذا الرمز. اطلب رمزاً جديداً للمتابعة.",
    network: "انقطع الاتصال. افحص الإنترنت وحاول مرة ثانية.",
    cooldownLabel: "تقدر تطلب رمزاً جديداً بعد",
  },
};

function isRateLimitError(error: { code?: string; message?: string } | null) {
  const value = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return value.includes("rate") || value.includes("too many") || value.includes("over_sms_send_rate_limit");
}

function isExpiredCodeError(error: { code?: string; message?: string } | null) {
  const value = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return value.includes("expired");
}

export function PatientAccountLoginForm({
  locale,
  ready,
  allowSignup,
  whatsappOtpEnabled,
  registration = false,
}: {
  locale: UiLocale;
  ready: boolean;
  allowSignup: boolean;
  whatsappOtpEnabled: boolean;
  registration?: boolean;
}) {
  const t = copy[locale];
  const [phoneInput, setPhoneInput] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [token, setToken] = useState("");
  const [delivery, setDelivery] = useState<Delivery>("sms");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [codeExpired, setCodeExpired] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const requestInFlight = useRef(false);

  useEffect(() => {
    if (!cooldownUntil) return;
    const update = () => setCooldown(Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [cooldownUntil]);

  // UI feedback only. The verification provider and patient-session API enforce
  // the real send/verify rate limits; this timer is not a security boundary.
  function startResendCooldown() {
    setCooldownUntil(Date.now() + 60_000);
    setCooldown(60);
  }

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
    if (requestInFlight.current || busy || cooldownUntil > Date.now()) return;
    const phone = step === "code" ? verifiedPhone : normalizeAuthPhone(phoneInput);
    if (!phone || !/^\+9647\d{9}$/.test(phone)) {
      setError(t.invalidPhone);
      return;
    }

    const isResend = step === "code";
    requestInFlight.current = true;
    setBusy(true);
    setError("");
    setAnnouncement("");
    try {
      const supabase = createEphemeralVerificationClient();
      const { error: sendError } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: allowSignup,
          ...(delivery === "whatsapp" ? { channel: "whatsapp" as const } : {}),
        },
      });
      if (sendError) {
        if (isRateLimitError(sendError)) startResendCooldown();
        setError(isRateLimitError(sendError) ? t.rateLimited : t.failed);
        return;
      }
      setVerifiedPhone(phone);
      setToken("");
      setCodeExpired(false);
      setStep("code");
      startResendCooldown();
      if (isResend) setAnnouncement(t.resent);
    } catch {
      setError(t.network);
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (requestInFlight.current || busy) return;
    const normalizedToken = normalizeOtpToken(token);
    if (normalizedToken.length < 6) {
      setError(t.invalidCode);
      return;
    }

    requestInFlight.current = true;
    setBusy(true);
    setError("");
    setAnnouncement("");
    try {
      const supabase = createEphemeralVerificationClient();
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: verifiedPhone,
        token: normalizedToken,
        type: "sms",
      });
      const accessToken = data.session?.access_token;
      if (verifyError || !accessToken) {
        const expired = isExpiredCodeError(verifyError);
        setCodeExpired(expired);
        if (expired) setToken("");
        setError(isRateLimitError(verifyError) ? t.rateLimited : expired ? t.expiredCode : t.incorrectCode);
        return;
      }

      const response = await fetch("/patient-account/api/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await response.json().catch(() => null) as { status?: string } | null;
      if (!response.ok || result?.status !== "ok") {
        if (response.status === 429 || result?.status === "rate_limited") startResendCooldown();
        setError(response.status === 429 || result?.status === "rate_limited" ? t.rateLimited : t.failed);
        return;
      }

      window.location.replace(`/patient-account?lang=${locale}`);
    } catch {
      setError(t.network);
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="patient-account-login-card">
      {step === "phone" ? (
        <>
          <p className="patient-account-verification-why">{t.why}</p>
          <form onSubmit={sendCode} className="patient-account-login-form" aria-busy={busy}>
            <label>
              <span>{t.phone}</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                lang="en"
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
            <button className="button patient-account-primary-action" type="submit" disabled={busy || cooldown > 0}>
              {busy ? t.sending : registration ? t.register : t.send}
            </button>
          </form>
        </>
      ) : (
        <form onSubmit={verify} className="patient-account-login-form" aria-busy={busy}>
          <div className="patient-account-code-heading">
            <strong>{t.codeTitle}</strong>
            <p>{t.codeHelp} <bdi dir="ltr" lang="en">{maskPhone(verifiedPhone)}</bdi>.</p>
          </div>
          <OtpCodeField
            id="patient-account-otp"
            label={t.code}
            value={token}
            onChange={(value) => { setToken(value); setError(""); setCodeExpired(false); }}
            pasteLabel={t.paste}
            onPasteFailure={() => setError(t.pasteFailed)}
            autoFocus
          />
          <p className="patient-account-code-tip">{t.codeTip}</p>
          <button className="button patient-account-primary-action" type="submit" disabled={busy || codeExpired}>
            {busy ? t.verifying : registration ? t.verifyRegister : t.verify}
          </button>
          <div className="patient-account-login-actions">
            <button className="button button-ghost button-small" type="button" disabled={busy || cooldown > 0} onClick={() => void sendCode()}>
              {t.resend}
            </button>
            <button className="button button-ghost button-small" type="button" disabled={busy} onClick={() => { setStep("phone"); setVerifiedPhone(""); setToken(""); setCodeExpired(false); setAnnouncement(""); setError(""); }}>
              {t.change}
            </button>
          </div>
        </form>
      )}
      {cooldown > 0 ? <p className="patient-account-code-cooldown" role="status">{t.cooldownLabel} <bdi dir="ltr" lang="en">{cooldown}s</bdi></p> : null}
      {busy ? <p className="patient-account-progress" role="status">{step === "code" ? t.verifying : t.sending}</p> : announcement ? <p className="notice" role="status">{announcement}</p> : null}
      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      <p className="quiet patient-account-privacy">{t.privacy}</p>
    </section>
  );
}
