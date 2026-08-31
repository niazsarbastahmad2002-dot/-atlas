"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { GoogleLoginButton } from "../google-login-button";

const copyByLocale = {
  en: {
    invalid: "Enter a valid email address.",
    failed: "Atlas could not send the sign-in link. Try again later.",
    rateLimited: "Atlas email is temporarily rate-limited. Wait a little, then try once.",
    notAuthorized: "This email cannot receive Atlas sign-in mail from the current Supabase mail service. Atlas needs custom SMTP for this address.",
    provider: "Atlas email sign-in is temporarily unavailable.",
    signupDisabled: "Public Atlas sign-up is currently disabled in Supabase. Email retries cannot fix this setting.",
    network: "Atlas could not start email sign-in. Check your connection and try again.",
    sentBefore: "Open the newest Atlas email for",
    sentAfter: "The link will sign you in to the fresh Atlas account.",
    emailArriving: "Your new Atlas email is arriving…",
    openEmail: "Open newest email",
    another: "Use another email",
    label: "Email",
    sending: "Sending…",
    send: "Continue with email",
  },
  ku: {
    invalid: "ئیمەیڵێکی دروست بنووسە.",
    failed: "Atlas نەیتوانی لینکی چوونەژوورەوە بنێرێت. دواتر دووبارە هەوڵ بدە.",
    rateLimited: "ناردنی ئیمەیڵی Atlas کاتێکی کورت سنووردار کراوە. کەمێک چاوەڕێ بکە و تەنها جارێکی تر هەوڵ بدە.",
    notAuthorized: "ئەم ئیمەیڵە لە خزمەتگوزاری ئیمەیڵی ئێستای Supabase ناتوانێت ئیمەیڵی چوونەژوورەوە وەربگرێت. Atlas پێویستی بە SMTP تایبەت هەیە.",
    provider: "چوونەژوورەوە بە ئیمەیڵی Atlas کاتێکی کورت بەردەست نییە.",
    signupDisabled: "دروستکردنی هەژماری گشتی Atlas لە Supabase داخراوە. دووبارە هەوڵدان بە ئیمەیڵ ئەم ڕێکخستنە چارەسەر ناکات.",
    network: "Atlas نەیتوانی چوونەژوورەوە بە ئیمەیڵ دەست پێ بکات. ئینتەرنێتەکەت بپشکنە و دووبارە هەوڵ بدە.",
    sentBefore: "نوێترین ئیمەیڵی Atlas بکەرەوە بۆ",
    sentAfter: "لینکەکە تۆ دەخاتە ناو هەژمارە تازەکەی Atlas.",
    emailArriving: "ئیمەیڵە نوێیەکەی Atlas دەگات…",
    openEmail: "نوێترین ئیمەیڵ بکەرەوە",
    another: "ئیمەیڵێکی تر بەکاربهێنە",
    label: "ئیمەیڵ",
    sending: "دەنێردرێت…",
    send: "بە ئیمەیڵ بەردەوام بە",
  },
  bd: {
    invalid: "ئیمەیلەکا دروست بنڤیسە.",
    failed: "Atlas نەشیا لینکا چوونەژوورێ بهنێریت. پاشتر دیسان هەول بدە.",
    rateLimited: "هنارتنا ئیمەیلا Atlas بۆ دەمەکێ کورت سنووردار بوویە. هندەک راوەستە و تەنێ جارەکا دی هەول بدە.",
    notAuthorized: "ئەم ئیمەیلە ل سەر خزمەتا ئیمەیلا هەنووکە یا Supabase ناتوانیت ئیمەیلا چوونەژوورێ وەربگریت. Atlas پێدڤی ب SMTP یا تایبەت هەیە.",
    provider: "چوونەژوور ب ئیمەیلا Atlas بۆ دەمەکێ کورت بەردەست نینە.",
    signupDisabled: "دروستکرنا هەژمارێ گشتی یێ Atlas ل Supabase هاتیە داخستن. دیسان هەولدان ب ئیمەیلێ ئەڤ ڕێکخستنە چارەسەر ناکەت.",
    network: "Atlas نەشیا چوونەژوور ب ئیمەیلێ دەست پێ بکەت. ئینتەرنێتا خۆ بپشکنە و دیسان هەول بدە.",
    sentBefore: "نووترین ئیمەیلا Atlas ڤەکە بۆ",
    sentAfter: "لینک دێ تە بخەتە ژوور هەژمارا نوو یا Atlas.",
    emailArriving: "ئیمەیلا نوو یا Atlas دهێتە گەهاندن…",
    openEmail: "نووترین ئیمەیل ڤەکە",
    another: "ئیمەیلەکا دی بکاربینە",
    label: "ئیمەیل",
    sending: "دهێتە هنارتن…",
    send: "ب ئیمەیلێ بەردەوام بە",
  },
  ar: {
    invalid: "اكتب بريد إلكتروني صحيح.",
    failed: "Atlas ما قدر يرسل رابط تسجيل الدخول. حاول مرة ثانية بعدين.",
    rateLimited: "إرسال إيميلات Atlas محدود مؤقتاً. انتظر شوي وحاول مرة وحدة بعدين.",
    notAuthorized: "هذا البريد ما يقدر يستلم رسالة دخول Atlas من خدمة Supabase الحالية. Atlas يحتاج SMTP مخصص لهذا البريد.",
    provider: "تسجيل الدخول بالبريد في Atlas غير متاح مؤقتاً.",
    signupDisabled: "إنشاء حسابات Atlas العامة متوقف حالياً في Supabase. إعادة محاولة الإيميل ما راح تصلح هذا الإعداد.",
    network: "Atlas ما قدر يبدأ تسجيل الدخول بالبريد. تأكد من الإنترنت وحاول مرة ثانية.",
    sentBefore: "افتح أحدث رسالة من Atlas المرسلة إلى",
    sentAfter: "الرابط يدخلك إلى حساب Atlas الجديد.",
    emailArriving: "رسالة Atlas الجديدة توصل الآن…",
    openEmail: "فتح أحدث رسالة",
    another: "استخدام بريد آخر",
    label: "البريد الإلكتروني",
    sending: "جارٍ الإرسال…",
    send: "المتابعة بالبريد الإلكتروني",
  },
} as const satisfies Record<UiLocale, Record<string, string>>;

type TemporaryEmailFailure = "rate_limited" | "not_authorized" | "provider" | "delivery";
type AuthReadiness = { supabaseGoogleEnabled?: boolean; signupDisabled?: boolean };

function emailWebInbox(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const query = encodeURIComponent('subject:"Atlas — Sign in" newer_than:1d');
    return `https://mail.google.com/mail/u/0/#search/${query}`;
  }
  if (["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(domain)) return "https://outlook.live.com/mail/0/inbox";
  if (domain === "yahoo.com" || domain.endsWith(".yahoo.com")) return "https://mail.yahoo.com/d/folders/1";
  if (["icloud.com", "me.com", "mac.com"].includes(domain)) return "https://www.icloud.com/mail/";
  return "mailto:";
}

function openEmailInbox(email: string) {
  const fallback = emailWebInbox(email);
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIOS) {
    let timer = 0;
    const cancelFallback = () => {
      if (document.hidden && timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", cancelFallback);
    };

    document.addEventListener("visibilitychange", cancelFallback);
    timer = window.setTimeout(() => {
      document.removeEventListener("visibilitychange", cancelFallback);
      if (!document.hidden) window.location.assign(fallback);
    }, 1200);

    window.location.assign("message://");
    return;
  }

  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (/Android/i.test(userAgent) && (domain === "gmail.com" || domain === "googlemail.com")) {
    const browserFallback = encodeURIComponent(fallback);
    window.location.assign(`intent://mail.google.com/mail/u/0/#inbox#Intent;scheme=https;package=com.google.android.gm;S.browser_fallback_url=${browserFallback};end`);
    return;
  }

  window.location.assign(fallback);
}

export function LegacyLoginForm({ locale }: { locale: UiLocale }) {
  const copy = copyByLocale[locale];
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailReady, setEmailReady] = useState(false);
  const [error, setError] = useState("");
  const [readiness, setReadiness] = useState<AuthReadiness | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/readiness", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => { if (active && result) setReadiness(result as AuthReadiness); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!sent) {
      setEmailReady(false);
      return;
    }

    const timer = window.setTimeout(() => setEmailReady(true), 2500);
    return () => window.clearTimeout(timer);
  }, [sent]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || readiness?.signupDisabled === true) return;
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError(copy.invalid);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/temporary-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, locale }),
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; reason?: TemporaryEmailFailure } | null;
      if (!response.ok || result?.ok !== true) {
        if (result?.reason === "rate_limited") setError(copy.rateLimited);
        else if (result?.reason === "not_authorized") setError(copy.notAuthorized);
        else if (result?.reason === "provider") setError(copy.provider);
        else setError(copy.failed);
        return;
      }

      setEmail(normalized);
      setSent(true);
    } catch {
      setError(copy.network);
    } finally {
      setBusy(false);
    }
  }

  if (readiness?.signupDisabled === true) {
    return <p className="notice notice-error" role="alert">{copy.signupDisabled}</p>;
  }

  if (readiness?.supabaseGoogleEnabled === true) {
    return <GoogleLoginButton locale={locale} />;
  }

  if (sent) {
    return (
      <div className="stack-form">
        <p className="notice notice-success" role="status">
          {copy.sentBefore} <span dir="ltr">{email}</span>. {copy.sentAfter}
        </p>
        <button className="button" type="button" disabled={!emailReady} onClick={() => openEmailInbox(email)}>
          {emailReady ? copy.openEmail : copy.emailArriving}
        </button>
        <button className="button button-ghost" type="button" onClick={() => { setSent(false); setEmailReady(false); setError(""); }}>{copy.another}</button>
        {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      </div>
    );
  }

  return (
    <form className="stack-form" onSubmit={submit}>
      <label htmlFor="legacy-email">{copy.label}</label>
      <input id="legacy-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <button className="button" type="submit" disabled={busy}>{busy ? copy.sending : copy.send}</button>
      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
    </form>
  );
}
