"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { maskPhone, normalizeAuthPhone, normalizeOtpToken } from "@/lib/phone-auth";
import { createClient } from "@/lib/supabase/client";

const PHONE_SIGNUP_ENABLED = process.env.NEXT_PUBLIC_ATLAS_PHONE_SIGNUP_ENABLED === "true";
const WHATSAPP_OTP_ENABLED = process.env.NEXT_PUBLIC_ATLAS_WHATSAPP_OTP_ENABLED === "true";
const COOLDOWN_KEY = "atlas-join-phone-otp-cooldown";

type Delivery = "sms" | "whatsapp";

const copy = {
  en: {
    phoneHelp: "Verify your mobile number to accept this invitation. A new Atlas account is created only after successful verification.",
    phone: "Mobile number",
    send: "Send verification code",
    sending: "Sending code…",
    code: "Verification code",
    sent: "We sent a one-time code to",
    verify: "Verify and join clinic",
    verifying: "Verifying…",
    resend: "Resend code",
    another: "Use another number",
    sms: "SMS",
    whatsapp: "WhatsApp",
    delivery: "Send code by",
    passkey: "Use saved Face ID / passkey",
    invalidPhone: "Enter a valid mobile number, for example +9647501234567.",
    invalidCode: "Enter the verification code you received.",
    failed: "Atlas could not verify this sign-in. Check the newest code and try again.",
    notReady: PHONE_SIGNUP_ENABLED ? "Atlas could not send a code to that number." : "Phone signup is not open yet while existing Atlas accounts are being migrated.",
  },
  ku: {
    phoneHelp: "ژمارەی مۆبایلەکەت پشتڕاست بکەرەوە بۆ وەرگرتنی ئەم بانگهێشتە. هەژماری نوێی Atlas تەنها دوای پشتڕاستکردنەوە دروست دەکرێت.",
    phone: "ژمارەی مۆبایل",
    send: "کۆدی پشتڕاستکردنەوە بنێرە",
    sending: "کۆد دەنێردرێت…",
    code: "کۆدی پشتڕاستکردنەوە",
    sent: "کۆدێکی یەکجارەمان نارد بۆ",
    verify: "پشتڕاست بکەوە و بچۆ ناو کلینیک",
    verifying: "پشتڕاست دەکرێتەوە…",
    resend: "کۆد دووبارە بنێرە",
    another: "ژمارەیەکی تر بەکاربهێنە",
    sms: "SMS",
    whatsapp: "WhatsApp",
    delivery: "کۆد بنێرە بە",
    passkey: "Face ID / passkey ی پارێزراو بەکاربهێنە",
    invalidPhone: "ژمارەیەکی دروست بنووسە، وەک +9647501234567.",
    invalidCode: "کۆدی پشتڕاستکردنەوە بنووسە.",
    failed: "Atlas نەیتوانی چوونەژوورەوە پشتڕاست بکاتەوە. نوێترین کۆد بەکاربهێنە.",
    notReady: PHONE_SIGNUP_ENABLED ? "Atlas نەیتوانی کۆد بنێرێت." : "دروستکردنی هەژمار بە مۆبایل هێشتا نەکراوەتەوە تا هەژمارە کۆنەکان بگوازرێنەوە.",
  },
  bd: {
    phoneHelp: "ژمارا موبایلا خۆ پشتڕاست بکە بۆ وەرگرتنا ڤێ بانگهێشتێ. هەژمارەکا نوو یا Atlas تەنێ پشتی پشتڕاستکرنێ دهێتە دروستکرن.",
    phone: "ژمارا موبایلێ",
    send: "کۆدێ پشتڕاستکرنێ بهنێرە",
    sending: "کۆد دهێتە هنارتن…",
    code: "کۆدێ پشتڕاستکرنێ",
    sent: "مە کۆدەکێ ئێکجارە هنارت بۆ",
    verify: "پشتڕاست بکە و بچۆ ناڤ کلینیکێ",
    verifying: "دهێتە پشتڕاستکرن…",
    resend: "کۆد دووبارە بهنێرە",
    another: "ژمارەکا دی بکاربینە",
    sms: "SMS",
    whatsapp: "WhatsApp",
    delivery: "کۆد بهنێرە ب",
    passkey: "Face ID / passkey یا پاراستی بکاربینە",
    invalidPhone: "ژمارەکا دروست بنڤیسە، وەک +9647501234567.",
    invalidCode: "کۆدێ پشتڕاستکرنێ بنڤیسە.",
    failed: "Atlas نەشیا چوونەژوورێ پشتڕاست بکەت. نووترین کۆد بکاربینە.",
    notReady: PHONE_SIGNUP_ENABLED ? "Atlas نەشیا کۆدێ بهنێریت." : "دروستکرنا هەژمارێ ب موبایلێ هێشتا ڤەنەکرییە هەتا هەژمارێن کەڤن بهێنە گوهەستن.",
  },
  ar: {
    phoneHelp: "وثّق رقم موبايلك لقبول هذه الدعوة. لا يتم إنشاء حساب Atlas جديد إلا بعد نجاح التحقق.",
    phone: "رقم الموبايل",
    send: "إرسال رمز التحقق",
    sending: "جارٍ إرسال الرمز…",
    code: "رمز التحقق",
    sent: "أرسلنا رمزاً لمرة واحدة إلى",
    verify: "تحقق وانضم للعيادة",
    verifying: "جارٍ التحقق…",
    resend: "إعادة إرسال الرمز",
    another: "استخدام رقم آخر",
    sms: "SMS",
    whatsapp: "WhatsApp",
    delivery: "إرسال الرمز عبر",
    passkey: "استخدام Face ID / Passkey محفوظ",
    invalidPhone: "أدخل رقم موبايل صحيح، مثلاً +9647501234567.",
    invalidCode: "أدخل رمز التحقق الذي وصلك.",
    failed: "تعذر التحقق من تسجيل الدخول. استخدم أحدث رمز وحاول مرة ثانية.",
    notReady: PHONE_SIGNUP_ENABLED ? "تعذر إرسال الرمز لهذا الرقم." : "إنشاء الحساب برقم الهاتف غير مفتوح بعد أثناء ترحيل حسابات Atlas الحالية.",
  },
} as const;

function cooldownRemaining() {
  try {
    const until = Number(window.localStorage.getItem(COOLDOWN_KEY) ?? "0");
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  } catch {
    return 0;
  }
}

function setCooldownStorage(seconds: number) {
  try {
    window.localStorage.setItem(COOLDOWN_KEY, String(Date.now() + seconds * 1000));
  } catch {
    // Server-side provider rate limiting still protects OTP delivery.
  }
}

export function JoinClinicAuth({ token, locale }: {
  token: string;
  locale: UiLocale;
}) {
  const t = copy[locale];
  const [busy, setBusy] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [delivery, setDelivery] = useState<Delivery>("sms");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => setCooldown(cooldownRemaining()), []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown(cooldownRemaining()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const finishPath = `/join/${encodeURIComponent(token)}/finish`;

  async function passkey() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPasskey();
      if (authError || !data.session) {
        setError(t.failed);
        return;
      }
      window.location.replace(finishPath);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    const wait = cooldownRemaining();
    if (wait > 0) {
      setCooldown(wait);
      return;
    }

    const normalized = normalizeAuthPhone(step === "code" ? phone : phoneInput);
    if (!normalized) {
      setError(t.invalidPhone);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        phone: normalized,
        options: {
          shouldCreateUser: PHONE_SIGNUP_ENABLED,
          ...(delivery === "whatsapp" ? { channel: "whatsapp" as const } : {}),
        },
      });
      if (authError) {
        setError(t.notReady);
        return;
      }
      setPhone(normalized);
      setPhoneInput(normalized);
      setOtp("");
      setStep("code");
      setCooldownStorage(60);
      setCooldown(60);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const tokenValue = normalizeOtpToken(otp);
    if (tokenValue.length < 6) {
      setError(t.invalidCode);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.verifyOtp({
        phone,
        token: tokenValue,
        type: "sms",
      });
      if (authError || !data.session) {
        setError(t.failed);
        return;
      }
      window.location.replace(finishPath);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-form">
      {step === "phone" ? (
        <form className="settings-form" onSubmit={sendCode}>
          <p className="field-help">{t.phoneHelp}</p>
          <label htmlFor="join-phone">{t.phone}</label>
          <input
            id="join-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="+9647501234567"
            value={phoneInput}
            onChange={(event) => setPhoneInput(event.target.value)}
            required
          />
          {WHATSAPP_OTP_ENABLED ? (
            <fieldset className="auth-delivery-options">
              <legend>{t.delivery}</legend>
              <label><input type="radio" name="delivery" value="sms" checked={delivery === "sms"} onChange={() => setDelivery("sms")} /> {t.sms}</label>
              <label><input type="radio" name="delivery" value="whatsapp" checked={delivery === "whatsapp"} onChange={() => setDelivery("whatsapp")} /> {t.whatsapp}</label>
            </fieldset>
          ) : null}
          <button className="button" type="submit" disabled={busy || cooldown > 0}>
            {busy ? t.sending : cooldown > 0 ? `${cooldown}s` : t.send}
          </button>
        </form>
      ) : (
        <form className="settings-form" onSubmit={verifyCode}>
          <p className="field-help">{t.sent} <span dir="ltr">{maskPhone(phone)}</span>.</p>
          <label htmlFor="join-otp">{t.code}</label>
          <input
            id="join-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            placeholder="123456"
            value={otp}
            onChange={(event) => setOtp(normalizeOtpToken(event.target.value))}
            required
            autoFocus
          />
          <button className="button" type="submit" disabled={busy}>{busy ? t.verifying : t.verify}</button>
          <div className="compact-actions">
            <button className="button button-ghost button-small" type="button" disabled={busy || cooldown > 0} onClick={() => void sendCode()}>
              {cooldown > 0 ? `${cooldown}s` : t.resend}
            </button>
            <button className="button button-ghost button-small" type="button" disabled={busy} onClick={() => { setStep("phone"); setOtp(""); setError(""); }}>
              {t.another}
            </button>
          </div>
        </form>
      )}

      <button className="button button-ghost" type="button" disabled={busy} onClick={() => void passkey()}>{t.passkey}</button>
      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
    </div>
  );
}
