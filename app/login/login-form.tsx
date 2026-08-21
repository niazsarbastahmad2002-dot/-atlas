"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { maskPhone, normalizeAuthPhone, normalizeOtpToken, toAsciiPhoneDigits } from "@/lib/phone-auth";

type CountryMode = "+964" | "+90" | "+98" | "+962" | "+966" | "+971" | "+44" | "+1" | "international";

type StartResponse = {
  challengeId?: string;
  phone?: string;
  expiresAt?: string;
  resendAfterSeconds?: number;
  error?: string;
};

type VerifyResponse = { ok?: boolean; error?: string };

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

const copy = {
  en: {
    country: "Country / code",
    phone: "WhatsApp phone number",
    phoneHint: "Enter the mobile number you use on WhatsApp. Iraq numbers can be entered as 0750…",
    phonePlaceholder: "0750 123 4567",
    internationalPlaceholder: "+4915123456789",
    send: "Send code to WhatsApp",
    sending: "Sending to WhatsApp…",
    codeTitle: "Check your WhatsApp",
    codeHelp: "Atlas sent a 6-digit code to",
    codeHint: "Open WhatsApp, tap Copy Code, then paste or type the code here.",
    code: "WhatsApp verification code",
    verify: "Verify and open Atlas",
    verifying: "Opening Atlas…",
    resend: "Send another WhatsApp code",
    resendIn: "Send another code in",
    another: "Use another phone number",
    invalidPhone: "Enter a valid mobile number with its country code.",
    unavailable: "WhatsApp verification is not connected to an Atlas sender yet. No email is required; Atlas needs its WhatsApp Business sender connected before it can deliver this code.",
    delivery: "Atlas could not deliver the WhatsApp code. Check the number and try again.",
    rate: "Too many code requests. Wait a little and try again.",
    invalidCode: "Enter the 6-digit code from WhatsApp.",
    incorrect: "That code is incorrect. Use the newest code from WhatsApp.",
    expired: "That code expired. Request a new WhatsApp code.",
    session: "The phone was verified, but Atlas could not open the session. Try again.",
    network: "Atlas could not reach WhatsApp verification. Check your connection and try again.",
  },
  ku: {
    country: "وڵات / کۆد",
    phone: "ژمارەی WhatsApp",
    phoneHint: "ئەو ژمارەی مۆبایلە بنووسە کە لە WhatsApp بەکاری دەهێنیت. ژمارەی عێراق دەتوانیت وەک 0750… بنووسیت.",
    phonePlaceholder: "0750 123 4567",
    internationalPlaceholder: "+4915123456789",
    send: "کۆد بۆ WhatsApp بنێرە",
    sending: "بۆ WhatsApp دەنێردرێت…",
    codeTitle: "WhatsApp بپشکنە",
    codeHelp: "Atlas کۆدێکی ٦ ژمارەیی نارد بۆ",
    codeHint: "WhatsApp بکەرەوە، Copy Code دابگرە، پاشان کۆدەکە لێرە دابنێ یان بنووسە.",
    code: "کۆدی پشتڕاستکردنەوەی WhatsApp",
    verify: "پشتڕاست بکە و Atlas بکەرەوە",
    verifying: "Atlas دەکرێتەوە…",
    resend: "کۆدێکی تری WhatsApp بنێرە",
    resendIn: "کۆدێکی تر بنێرە دوای",
    another: "ژمارەیەکی تر بەکاربهێنە",
    invalidPhone: "ژمارەیەکی دروستی مۆبایل لەگەڵ کۆدی وڵات بنووسە.",
    unavailable: "نێرەری WhatsApp ـی Atlas هێشتا پەیوەست نەکراوە. هیچ ئیمەیڵێک پێویست نییە؛ بۆ گەیاندنی کۆد پێویستە WhatsApp Business ـی Atlas پەیوەست بکرێت.",
    delivery: "Atlas نەیتوانی کۆدی WhatsApp بگەیەنێت. ژمارەکە بپشکنە و دووبارە هەوڵ بدە.",
    rate: "داواکاری کۆد زۆر بووە. کەمێک چاوەڕێ بکە.",
    invalidCode: "کۆدی ٦ ژمارەیی WhatsApp بنووسە.",
    incorrect: "کۆدەکە هەڵەیە. نوێترین کۆدی WhatsApp بەکاربهێنە.",
    expired: "کۆدەکە بەسەرچووە. کۆدێکی نوێ داوا بکە.",
    session: "ژمارەکە پشتڕاست کرا، بەڵام Atlas نەیتوانی دانیشتنەکە بکاتەوە. دووبارە هەوڵ بدە.",
    network: "Atlas نەیتوانی پەیوەندی بە پشتڕاستکردنەوەی WhatsApp بکات.",
  },
  bd: {
    country: "وەلات / کۆد",
    phone: "ژمارا WhatsApp",
    phoneHint: "ژمارا موبایلێ یا کو ل WhatsApp بکار دئینی بنڤیسە. ژمارێن عێراقێ دشێی وەک 0750… بنڤیسی.",
    phonePlaceholder: "0750 123 4567",
    internationalPlaceholder: "+4915123456789",
    send: "کۆدێ بۆ WhatsApp بهنێرە",
    sending: "بۆ WhatsApp دهێتە هنارتن…",
    codeTitle: "WhatsApp بپشکنە",
    codeHelp: "Atlas کۆدەکێ ٦ ژمارەیی هنارت بۆ",
    codeHint: "WhatsApp ڤەکە، Copy Code بکە، پاشی کۆدی ل ڤێرێ دابنێ یان بنڤیسە.",
    code: "کۆدێ پشتڕاستکرنا WhatsApp",
    verify: "پشتڕاست بکە و Atlas ڤەکە",
    verifying: "Atlas ڤەدبیت…",
    resend: "کۆدەکێ دی یێ WhatsApp بهنێرە",
    resendIn: "کۆدەکێ دی بهنێرە پشتی",
    another: "ژمارەکا دی بکاربینە",
    invalidPhone: "ژمارەکا دروستا موبایلێ لگەل کۆدێ وەلاتی بنڤیسە.",
    unavailable: "نێرەرێ WhatsApp یێ Atlas هێشتا نەهاتییە گرێدان. ئیمەیل پێدڤی نینە؛ بۆ هنارتنا کۆدی پێدڤییە WhatsApp Business یێ Atlas بهێتە گرێدان.",
    delivery: "Atlas نەشیا کۆدێ WhatsApp بگەهینیت. ژمارێ بپشکنە و دیسان هەول بدە.",
    rate: "داخوازێن کۆدی زۆر بوون. کەمەک چاوەرێ بکە.",
    invalidCode: "کۆدێ ٦ ژمارەیی یێ WhatsApp بنڤیسە.",
    incorrect: "کۆد خەلەتە. نووترین کۆدێ WhatsApp بکاربینە.",
    expired: "دەمێ کۆدی بەسەرچووە. کۆدەکێ نوو بخوازە.",
    session: "ژمارە هاتە پشتڕاستکرن، لێ Atlas نەشیا دانیشتنێ ڤەکەت.",
    network: "Atlas نەشیا پەیوەندی ب پشتڕاستکرنا WhatsApp بکەت.",
  },
  ar: {
    country: "الدولة / الرمز",
    phone: "رقم واتساب",
    phoneHint: "اكتب رقم الموبايل اللي تستخدمه على واتساب. الرقم العراقي تقدر تكتبه مثل 0750…",
    phonePlaceholder: "0750 123 4567",
    internationalPlaceholder: "+4915123456789",
    send: "إرسال الكود إلى واتساب",
    sending: "جارٍ الإرسال إلى واتساب…",
    codeTitle: "افتح واتساب",
    codeHelp: "Atlas أرسل كود من 6 أرقام إلى",
    codeHint: "افتح واتساب، اضغط Copy Code، وبعدها الصق أو اكتب الكود هنا.",
    code: "كود التحقق من واتساب",
    verify: "تحقق وافتح Atlas",
    verifying: "جارٍ فتح Atlas…",
    resend: "إرسال كود واتساب جديد",
    resendIn: "إرسال كود جديد بعد",
    another: "استخدام رقم آخر",
    invalidPhone: "اكتب رقم موبايل صحيح مع رمز الدولة.",
    unavailable: "مرسل واتساب الخاص بـ Atlas غير مربوط بعد. ما تحتاج أي إيميل؛ Atlas يحتاج ربط WhatsApp Business حتى يقدر يرسل الكود.",
    delivery: "Atlas ما قدر يوصل كود واتساب. تأكد من الرقم وحاول مرة ثانية.",
    rate: "تم طلب أكواد كثيرة. انتظر شوي وحاول مرة ثانية.",
    invalidCode: "اكتب الكود المكوّن من 6 أرقام من واتساب.",
    incorrect: "الكود غير صحيح. استخدم أحدث كود وصلك على واتساب.",
    expired: "انتهت صلاحية الكود. اطلب كود واتساب جديد.",
    session: "تم توثيق الرقم لكن Atlas ما قدر يفتح الجلسة. حاول مرة ثانية.",
    network: "Atlas ما قدر يوصل لخدمة تحقق واتساب. تأكد من الاتصال وحاول مرة ثانية.",
  },
} as const;

function composePhone(country: CountryMode, raw: string) {
  const ascii = toAsciiPhoneDigits(raw).trim();
  if (country === "international") return normalizeAuthPhone(ascii);
  const digits = ascii.replace(/\D/g, "");
  if (country === "+964") {
    const national = digits.startsWith("0") ? digits.slice(1) : digits;
    if (!/^7\d{9}$/.test(national)) return null;
    return normalizeAuthPhone(`+964${national}`);
  }
  const national = digits.replace(/^0+/, "");
  if (national.length < 6 || national.length > 12) return null;
  return normalizeAuthPhone(`${country}${national}`);
}

function errorMessage(locale: UiLocale, error: string | undefined) {
  const t = copy[locale];
  switch (error) {
    case "invalid_phone": return t.invalidPhone;
    case "whatsapp_not_configured": return t.unavailable;
    case "rate_limited": return t.rate;
    case "delivery_failed": return t.delivery;
    case "incorrect_code": return t.incorrect;
    case "expired_code": return t.expired;
    case "too_many_attempts": return t.rate;
    case "session_failed": return t.session;
    default: return t.network;
  }
}

export function LoginForm({ locale, nextPath = "/dashboard/select-clinic" }: { locale: UiLocale; nextPath?: string }) {
  const t = copy[locale];
  const [country, setCountry] = useState<CountryMode>("+964");
  const [phoneInput, setPhoneInput] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!cooldownUntil) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const seconds = useMemo(() => Math.max(0, Math.ceil((cooldownUntil - now) / 1000)), [cooldownUntil, now]);

  async function requestCode(event?: FormEvent) {
    event?.preventDefault();
    if (busy || seconds > 0) return;
    const phone = composePhone(country, phoneInput);
    if (!phone) {
      setError(t.invalidPhone);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/whatsapp/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const body = await response.json() as StartResponse;
      if (!response.ok || !body.challengeId || !body.phone) {
        setError(errorMessage(locale, body.error));
        return;
      }
      setVerifiedPhone(body.phone);
      setChallengeId(body.challengeId);
      setCode("");
      setCooldownUntil(Date.now() + (body.resendAfterSeconds ?? 60) * 1000);
      setNow(Date.now());
    } catch {
      setError(t.network);
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    const token = normalizeOtpToken(code);
    if (!/^\d{6}$/.test(token)) {
      setError(t.invalidCode);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/whatsapp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: verifiedPhone, challengeId, code: token }),
      });
      const body = await response.json() as VerifyResponse;
      if (!response.ok || !body.ok) {
        setError(errorMessage(locale, body.error));
        return;
      }
      window.location.assign(nextPath);
    } catch {
      setError(t.network);
    } finally {
      setBusy(false);
    }
  }

  if (challengeId && verifiedPhone) {
    return (
      <form className="stack-form" onSubmit={verify}>
        <div className="login-code-heading">
          <h2>{t.codeTitle}</h2>
          <p>{t.codeHelp} <strong dir="ltr">{maskPhone(verifiedPhone)}</strong>.</p>
          <p className="field-help">{t.codeHint}</p>
        </div>
        <label htmlFor="atlas-whatsapp-code">{t.code}</label>
        <input
          id="atlas-whatsapp-code"
          value={code}
          onChange={(event) => setCode(toAsciiPhoneDigits(event.target.value).replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          dir="ltr"
        />
        <button className="button" type="submit" disabled={busy}>{busy ? t.verifying : t.verify}</button>
        <div className="login-secondary-actions">
          <button className="button button-ghost button-small" type="button" disabled={busy || seconds > 0} onClick={() => void requestCode()}>
            {seconds > 0 ? `${t.resendIn} ${seconds}s` : t.resend}
          </button>
          <button className="button button-ghost button-small" type="button" disabled={busy} onClick={() => {
            setChallengeId("");
            setVerifiedPhone("");
            setCode("");
            setError("");
            setCooldownUntil(0);
          }}>{t.another}</button>
        </div>
        {error ? <p className="notice notice-error login-notice" role="alert">{error}</p> : null}
      </form>
    );
  }

  return (
    <form className="stack-form" onSubmit={(event) => void requestCode(event)}>
      <p className="field-help">{t.phoneHint}</p>
      <label htmlFor="atlas-country-code">{t.country}</label>
      <select id="atlas-country-code" value={country} onChange={(event) => {
        setCountry(event.target.value as CountryMode);
        setError("");
      }}>
        {countries.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      <label htmlFor="atlas-phone">{t.phone}</label>
      <input
        id="atlas-phone"
        value={phoneInput}
        onChange={(event) => {
          setPhoneInput(event.target.value);
          setError("");
        }}
        inputMode="tel"
        autoComplete="tel"
        placeholder={country === "international" ? t.internationalPlaceholder : t.phonePlaceholder}
        required
        dir="ltr"
      />
      <button className="button" type="submit" disabled={busy}>{busy ? t.sending : t.send}</button>
      {error ? <p className="notice notice-error login-notice" role="alert">{error}</p> : null}
    </form>
  );
}
