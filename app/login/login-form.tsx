"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { maskPhone, normalizeAuthPhone, normalizeOtpToken, toAsciiPhoneDigits } from "@/lib/phone-auth";
import type { UiLocale } from "@/lib/i18n/ui";

const COOLDOWN_KEY = "atlas-phone-otp-cooldown";
const PHONE_SIGNUP_ENABLED = process.env.NEXT_PUBLIC_ATLAS_PHONE_SIGNUP_ENABLED === "true";
const WHATSAPP_OTP_ENABLED = process.env.NEXT_PUBLIC_ATLAS_WHATSAPP_OTP_ENABLED === "true";
const POST_AUTH_DESTINATION = "/dashboard/select-clinic";

type Delivery = "sms" | "whatsapp";
type CountryMode = "+964" | "+90" | "+98" | "+962" | "+966" | "+971" | "+44" | "+1" | "international";

const countries: Array<{ value: CountryMode; label: string }> = [
  { value: "+964", label: "Iraq (+964)" },
  { value: "+90", label: "Türkiye (+90)" },
  { value: "+98", label: "Iran (+98)" },
  { value: "+962", label: "Jordan (+962)" },
  { value: "+966", label: "Saudi Arabia (+966)" },
  { value: "+971", label: "UAE (+971)" },
  { value: "+44", label: "United Kingdom (+44)" },
  { value: "+1", label: "US / Canada (+1)" },
  { value: "international", label: "Other international (+…)" },
];

const authCopy = {
  en: {
    phoneHint: "Choose a country code, then enter your mobile number. Iraq numbers may be entered as 0750…; Other international accepts a full +country-code number.",
    country: "Country / code",
    phoneLabel: "Mobile number",
    phonePlaceholder: "0750 123 4567",
    internationalPlaceholder: "+4915123456789",
    send: "Send verification code",
    sending: "Sending code…",
    codeTitle: "Enter your verification code",
    codeHelp: "We sent a one-time code to",
    codeLabel: "Verification code",
    verify: "Verify and continue",
    verifying: "Verifying…",
    resend: "Resend code",
    another: "Use another number",
    sms: "SMS",
    whatsapp: "WhatsApp",
    delivery: "Send code by",
    invalidPhone: "Enter a valid mobile number. Atlas stores verified numbers in international E.164 form, for example +9647501234567.",
    invalidCode: "Enter the verification code you received.",
    incorrectCode: "That code is incorrect or expired. Check the newest code and try again.",
    rateLimited: "Too many code requests. Wait for the countdown before requesting another code.",
    notReady: PHONE_SIGNUP_ENABLED
      ? "Atlas could not send a code to that number. Check the number and try again."
      : "This number is not linked to an Atlas account yet. Existing accounts must verify a phone number before open phone signup is enabled.",
    network: "Atlas could not reach the verification service. Check your connection and try again.",
    quick: "Use saved passkey",
    quickOpening: "Opening saved passkey…",
    quickHelp: "Optional on a trusted device where you previously saved a passkey.",
    quickCancelled: "Passkey sign-in was cancelled. Phone verification is still available.",
    quickUnavailable: "No usable Atlas passkey is saved on this device. Use your phone number.",
  },
  ku: {
    phoneHint: "کۆدی وڵات هەڵبژێرە، پاشان ژمارەی مۆبایل بنووسە. ژمارەی عێراق دەتوانرێت وەک 0750… بنووسرێت؛ بۆ وڵاتێکی تر ژمارەی تەواوی +کۆدی وڵات بنووسە.",
    country: "وڵات / کۆد",
    phoneLabel: "ژمارەی مۆبایل",
    phonePlaceholder: "0750 123 4567",
    internationalPlaceholder: "+4915123456789",
    send: "کۆدی پشتڕاستکردنەوە بنێرە",
    sending: "کۆد دەنێردرێت…",
    codeTitle: "کۆدی پشتڕاستکردنەوە بنووسە",
    codeHelp: "کۆدێکی یەکجارەمان نارد بۆ",
    codeLabel: "کۆدی پشتڕاستکردنەوە",
    verify: "پشتڕاست بکەوە و بەردەوام بە",
    verifying: "پشتڕاست دەکرێتەوە…",
    resend: "کۆد دووبارە بنێرە",
    another: "ژمارەیەکی تر بەکاربهێنە",
    sms: "SMS",
    whatsapp: "WhatsApp",
    delivery: "کۆد بنێرە بە",
    invalidPhone: "ژمارەیەکی دروست بنووسە. Atlas ژمارەی پشتڕاستکراو بە شێوەی نێودەوڵەتی E.164 هەڵدەگرێت، وەک +9647501234567.",
    invalidCode: "کۆدی پشتڕاستکردنەوە بنووسە.",
    incorrectCode: "کۆدەکە هەڵەیە یان بەسەرچووە. نوێترین کۆد بەکاربهێنە.",
    rateLimited: "داواکاری کۆد زۆر بووە. تا تەواوبوونی کاتژمێرەکە چاوەڕێ بکە.",
    notReady: PHONE_SIGNUP_ENABLED ? "Atlas نەیتوانی کۆد بنێرێت. ژمارەکە بپشکنە." : "ئەم ژمارەیە هێشتا بە هەژماری Atlas نەبەستراوەتەوە. هەژمارە کۆنەکان پێویستە سەرەتا ژمارەیەک پشتڕاست بکەنەوە.",
    network: "Atlas نەیتوانی پەیوەندی بە خزمەتگوزاری پشتڕاستکردنەوە بکات.",
    quick: "Passkey ی پارێزراو بەکاربهێنە",
    quickOpening: "Passkey دەکرێتەوە…",
    quickHelp: "ئارەزوومەندانەیە، ئەگەر پێشتر لەم ئامێرە Passkey ـت پاراستووە.",
    quickCancelled: "چوونەژوورەوە بە Passkey هەڵوەشێنرایەوە. ژمارەی مۆبایل هەر بەردەستە.",
    quickUnavailable: "Passkey ی Atlas لەم ئامێرە نییە. ژمارەی مۆبایل بەکاربهێنە.",
  },
  bd: {
    phoneHint: "کۆدێ وەلاتی هەلبژێرە، پاشی ژمارا موبایلێ بنڤیسە. ژمارێن عێراقێ دکارن وەک 0750… بهێنە نڤیسین؛ بۆ وەلاتەکێ دی ژمارا تەمام ب +کۆدێ وەلاتی بنڤیسە.",
    country: "وەلات / کۆد",
    phoneLabel: "ژمارا موبایلێ",
    phonePlaceholder: "0750 123 4567",
    internationalPlaceholder: "+4915123456789",
    send: "کۆدێ پشتڕاستکرنێ بهنێرە",
    sending: "کۆد دهێتە هنارتن…",
    codeTitle: "کۆدێ پشتڕاستکرنێ بنڤیسە",
    codeHelp: "مە کۆدەکێ ئێکجارە هنارت بۆ",
    codeLabel: "کۆدێ پشتڕاستکرنێ",
    verify: "پشتڕاست بکە و بەردەوام بە",
    verifying: "دهێتە پشتڕاستکرن…",
    resend: "کۆد دووبارە بهنێرە",
    another: "ژمارەکا دی بکاربینە",
    sms: "SMS",
    whatsapp: "WhatsApp",
    delivery: "کۆد بهنێرە ب",
    invalidPhone: "ژمارەکا دروست بنڤیسە. Atlas ژمارا پشتڕاستکری ب فۆرماتا نێودەولەتی E.164 پاراستن دکەت، وەک +9647501234567.",
    invalidCode: "کۆدێ پشتڕاستکرنێ بنڤیسە.",
    incorrectCode: "کۆد خەلەتە یان دەمێ وی بەسەرچووە. نووترین کۆد بکاربینە.",
    rateLimited: "داخوازێن کۆدی زۆر بوون. هەتا کاتژمێر دکەڤیت چاوەرێ بکە.",
    notReady: PHONE_SIGNUP_ENABLED ? "Atlas نەشیا کۆدێ بهنێریت. ژمارێ بپشکنە." : "ئەڤ ژمارە هێشتا ب هەژمارەکێ Atlas نەهاتییە گرێدان. هەژمارێن کەڤن پێدڤییە پێشدا ژمارەکێ پشتڕاست بکەن.",
    network: "Atlas نەشیا پەیوەندی ب خزمەتا پشتڕاستکرنێ بکەت.",
    quick: "Passkey یا پاراستی بکاربینە",
    quickOpening: "Passkey ڤەدبیت…",
    quickHelp: "ئارەزوومەندانەیە، ئەگەر پێشتر ل ڤی ئامێری Passkey پاراستییە.",
    quickCancelled: "چوونەژوور ب Passkey هاتە هەلوەشاندن. ژمارا موبایلێ هێشتا بەردەستە.",
    quickUnavailable: "Passkey یا Atlas ل ڤی ئامێری نینە. ژمارا موبایلێ بکاربینە.",
  },
  ar: {
    phoneHint: "اختار رمز الدولة وبعدها اكتب رقم الموبايل. الرقم العراقي ممكن تكتبه 0750…؛ وإذا الدولة مو موجودة بالقائمة اكتب الرقم الدولي الكامل مع +.",
    country: "الدولة / الرمز",
    phoneLabel: "رقم الموبايل",
    phonePlaceholder: "0750 123 4567",
    internationalPlaceholder: "+4915123456789",
    send: "إرسال رمز التحقق",
    sending: "جارٍ إرسال الرمز…",
    codeTitle: "أدخل رمز التحقق",
    codeHelp: "أرسلنا رمزاً لمرة واحدة إلى",
    codeLabel: "رمز التحقق",
    verify: "تحقق واستمر",
    verifying: "جارٍ التحقق…",
    resend: "إعادة إرسال الرمز",
    another: "استخدام رقم آخر",
    sms: "SMS",
    whatsapp: "WhatsApp",
    delivery: "إرسال الرمز عبر",
    invalidPhone: "أدخل رقم موبايل صحيح. Atlas يحفظ الرقم الموثق بصيغة E.164 الدولية، مثلاً +9647501234567.",
    invalidCode: "أدخل رمز التحقق الذي وصلك.",
    incorrectCode: "الرمز غير صحيح أو منتهي. استخدم أحدث رمز وحاول مرة ثانية.",
    rateLimited: "تم طلب رموز كثيرة. انتظر انتهاء العد التنازلي قبل طلب رمز جديد.",
    notReady: PHONE_SIGNUP_ENABLED ? "تعذر إرسال الرمز. تأكد من الرقم وحاول مرة ثانية." : "هذا الرقم غير مربوط بحساب Atlas بعد. الحسابات الحالية لازم تضيف وتتحقق من رقم الهاتف أولاً.",
    network: "تعذر الاتصال بخدمة التحقق. تأكد من الإنترنت وحاول مرة ثانية.",
    quick: "استخدام Passkey محفوظ",
    quickOpening: "جارٍ فتح Passkey…",
    quickHelp: "اختياري إذا كنت حفظت Passkey لهذا الحساب على هذا الجهاز.",
    quickCancelled: "تم إلغاء Passkey. التحقق برقم الهاتف ما زال متاحاً.",
    quickUnavailable: "لا يوجد Passkey صالح لـ Atlas على هذا الجهاز. استخدم رقم الهاتف.",
  },
} as const;

function remainingCooldown() {
  try {
    const until = Number(window.localStorage.getItem(COOLDOWN_KEY) ?? "0");
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  } catch {
    return 0;
  }
}

function rememberCooldown(seconds: number) {
  try {
    window.localStorage.setItem(COOLDOWN_KEY, String(Date.now() + seconds * 1000));
  } catch {
    // Supabase/provider rate limiting still protects OTP delivery.
  }
}

function isRateLimitError(error: { code?: string; message?: string } | null) {
  const text = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return text.includes("rate") || text.includes("too many") || text.includes("over_sms_send_rate_limit");
}

function phoneCandidate(mode: CountryMode, input: string) {
  const cleaned = toAsciiPhoneDigits(input.trim());
  if (mode === "international") return cleaned;
  if (!cleaned || cleaned.startsWith("+")) return cleaned;

  const digits = cleaned.replace(/\D/g, "");
  if (mode === "+964") {
    if (/^07\d{9}$/.test(digits)) return digits;
    if (/^7\d{9}$/.test(digits)) return digits;
    return cleaned;
  }

  const national = digits.startsWith("0") ? digits.slice(1) : digits;
  if (national.length < 7 || national.length > 12) return cleaned;
  return `${mode}${national}`;
}

export function LoginForm({ locale }: { locale: UiLocale }) {
  const copy = authCopy[locale];
  const [countryMode, setCountryMode] = useState<CountryMode>("+964");
  const [phoneInput, setPhoneInput] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [token, setToken] = useState("");
  const [delivery, setDelivery] = useState<Delivery>("sms");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [quickBusy, setQuickBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => setCooldown(remainingCooldown()), []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown(remainingCooldown()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function quickSignIn() {
    if (quickBusy || busy) return;
    setQuickBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { data, error: quickError } = await supabase.auth.signInWithPasskey();
      if (!quickError && data.session) {
        window.location.replace(POST_AUTH_DESTINATION);
        return;
      }
      const text = `${quickError?.name ?? ""} ${quickError?.message ?? ""}`.toLowerCase();
      const cancelled = text.includes("notallowed") || text.includes("not allowed") || text.includes("cancel") || text.includes("abort");
      setError(cancelled ? copy.quickCancelled : copy.quickUnavailable);
    } catch (caught) {
      const text = caught instanceof Error ? `${caught.name} ${caught.message}`.toLowerCase() : "";
      const cancelled = text.includes("notallowed") || text.includes("not allowed") || text.includes("cancel") || text.includes("abort");
      setError(cancelled ? copy.quickCancelled : copy.quickUnavailable);
    } finally {
      setQuickBusy(false);
    }
  }

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    const wait = remainingCooldown();
    if (busy || wait > 0) {
      setCooldown(wait);
      return;
    }

    const phone = step === "code"
      ? normalizeAuthPhone(verifiedPhone)
      : normalizeAuthPhone(phoneCandidate(countryMode, phoneInput));
    if (!phone) {
      setError(copy.invalidPhone);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: sendError } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: PHONE_SIGNUP_ENABLED,
          ...(delivery === "whatsapp" ? { channel: "whatsapp" as const } : {}),
        },
      });
      if (sendError) {
        if (isRateLimitError(sendError)) {
          rememberCooldown(60);
          setCooldown(60);
          setError(copy.rateLimited);
        } else {
          setError(copy.notReady);
        }
        return;
      }

      setVerifiedPhone(phone);
      setToken("");
      setStep("code");
      rememberCooldown(60);
      setCooldown(60);
    } catch {
      setError(copy.network);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent) {
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
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: verifiedPhone,
        token: normalizedToken,
        type: "sms",
      });
      if (verifyError || !data.session) {
        setError(isRateLimitError(verifyError) ? copy.rateLimited : copy.incorrectCode);
        return;
      }
      window.location.replace(POST_AUTH_DESTINATION);
    } catch {
      setError(copy.network);
    } finally {
      setBusy(false);
    }
  }

  if (step === "code") {
    return (
      <div className="receptionist-login-flow">
        <form className="stack-form login-email-form" onSubmit={verifyCode}>
          <div>
            <strong>{copy.codeTitle}</strong>
            <p className="field-help">{copy.codeHelp} <span dir="ltr">{maskPhone(verifiedPhone)}</span>.</p>
          </div>
          <label htmlFor="phone-otp">{copy.codeLabel}</label>
          <input
            id="phone-otp"
            name="phone-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={token}
            onChange={(event) => setToken(normalizeOtpToken(event.target.value))}
            placeholder="123456"
            dir="ltr"
            required
            autoFocus
          />
          <button className="button login-primary-action" type="submit" disabled={busy}>
            {busy ? copy.verifying : copy.verify}
          </button>
        </form>
        {error ? <p className="notice notice-error login-notice" role="alert">{error}</p> : null}
        <div className="login-secondary-actions">
          <button className="button button-ghost button-small" type="button" disabled={busy || cooldown > 0} onClick={() => void sendCode()}>
            {cooldown > 0 ? `${cooldown}s` : copy.resend}
          </button>
          <button className="button button-ghost button-small" type="button" disabled={busy} onClick={() => { setStep("phone"); setToken(""); setError(""); }}>
            {copy.another}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="receptionist-login-flow">
      <form className="stack-form login-email-form" onSubmit={sendCode}>
        <p className="field-help login-email-help">{copy.phoneHint}</p>
        <label htmlFor="phone-country">{copy.country}</label>
        <select
          id="phone-country"
          value={countryMode}
          onChange={(event) => {
            setCountryMode(event.target.value as CountryMode);
            setError("");
          }}
        >
          {countries.map((country) => <option value={country.value} key={country.value}>{country.label}</option>)}
        </select>
        <label htmlFor="phone">{copy.phoneLabel}</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phoneInput}
          onChange={(event) => setPhoneInput(event.target.value)}
          placeholder={countryMode === "international" ? copy.internationalPlaceholder : copy.phonePlaceholder}
          dir="ltr"
          required
        />
        {WHATSAPP_OTP_ENABLED ? (
          <fieldset className="auth-delivery-options">
            <legend>{copy.delivery}</legend>
            <label><input type="radio" name="delivery" value="sms" checked={delivery === "sms"} onChange={() => setDelivery("sms")} /> {copy.sms}</label>
            <label><input type="radio" name="delivery" value="whatsapp" checked={delivery === "whatsapp"} onChange={() => setDelivery("whatsapp")} /> {copy.whatsapp}</label>
          </fieldset>
        ) : null}
        <button className="button login-primary-action" type="submit" disabled={busy || quickBusy || cooldown > 0}>
          {busy ? copy.sending : cooldown > 0 ? `${cooldown}s` : copy.send}
        </button>
      </form>

      {error ? <p className="notice notice-error login-notice" role="alert">{error}</p> : null}

      <div className="auth-alternative login-quick-signin">
        <button className="button button-ghost" type="button" disabled={quickBusy || busy} onClick={() => void quickSignIn()}>
          {quickBusy ? copy.quickOpening : copy.quick}
        </button>
        <p className="login-method-help">{copy.quickHelp}</p>
      </div>
    </div>
  );
}
