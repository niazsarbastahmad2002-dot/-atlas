"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { GoogleLoginButton } from "../google-login-button";

const copyByLocale = {
  en: {
    invalid: "Check the email address. It does not look valid or reachable.",
    failed: "Atlas could not send the sign-in link. Try again later.",
    rateLimited: "Atlas email is temporarily rate-limited. Wait a little, then try once.",
    notAuthorized: "This email cannot receive Atlas sign-in mail from the current Supabase mail service. Atlas needs custom SMTP for this address.",
    provider: "Atlas email sign-in is temporarily unavailable.",
    signupDisabled: "Public Atlas sign-up is currently disabled in Supabase. Email retries cannot fix this setting.",
    network: "Atlas could not start email sign-in. Check your connection and try again.",
    confirmTitle: "Is this email correct?",
    confirmHelp: "Check every letter before Atlas sends the sign-in link.",
    confirmSend: "Yes, send email",
    editEmail: "Edit email",
    sentBefore: "Atlas sent a verification link to",
    sentAfter: "If this mailbox exists, the message should arrive shortly.",
    openEmail: "Open newest email",
    another: "Use another email",
    label: "Email",
    sending: "Sending…",
    send: "Continue with email",
  },
  ku: {
    invalid: "ئیمەیڵەکە بپشکنە. وا دیارە دروست نییە یان ناتوانێت ئیمەیڵ وەربگرێت.",
    failed: "Atlas نەیتوانی لینکی چوونەژوورەوە بنێرێت. دواتر دووبارە هەوڵ بدە.",
    rateLimited: "ناردنی ئیمەیڵی Atlas کاتێکی کورت سنووردار کراوە. کەمێک چاوەڕێ بکە و تەنها جارێکی تر هەوڵ بدە.",
    notAuthorized: "ئەم ئیمەیڵە لە خزمەتگوزاری ئیمەیڵی ئێستای Supabase ناتوانێت ئیمەیڵی چوونەژوورەوە وەربگرێت. Atlas پێویستی بە SMTP تایبەت هەیە.",
    provider: "چوونەژوورەوە بە ئیمەیڵی Atlas کاتێکی کورت بەردەست نییە.",
    signupDisabled: "دروستکردنی هەژماری گشتی Atlas لە Supabase داخراوە. دووبارە هەوڵدان بە ئیمەیڵ ئەم ڕێکخستنە چارەسەر ناکات.",
    network: "Atlas نەیتوانی چوونەژوورەوە بە ئیمەیڵ دەست پێ بکات. ئینتەرنێتەکەت بپشکنە و دووبارە هەوڵ بدە.",
    confirmTitle: "ئەم ئیمەیڵە دروستە؟",
    confirmHelp: "پێش ناردنی لینکەکە، هەموو پیتەکانی ئیمەیڵەکە بپشکنە.",
    confirmSend: "بەڵێ، ئیمەیڵ بنێرە",
    editEmail: "ئیمەیڵەکە بگۆڕە",
    sentBefore: "Atlas لینکی پشتڕاستکردنەوەی نارد بۆ",
    sentAfter: "ئەگەر ئەم سندوقەی ئیمەیڵە بوونی هەبێت، نامەکە دەبێت بە زوویی بگات.",
    openEmail: "نوێترین ئیمەیڵ بکەرەوە",
    another: "ئیمەیڵێکی تر بەکاربهێنە",
    label: "ئیمەیڵ",
    sending: "دەنێردرێت…",
    send: "بە ئیمەیڵ بەردەوام بە",
  },
  bd: {
    invalid: "ئیمەیلێ بپشکنە. دیارە نە دروستە یان ناتوانیت ئیمەیلێ وەربگریت.",
    failed: "Atlas نەشیا لینکا چوونەژوورێ بهنێریت. پاشتر دیسان هەول بدە.",
    rateLimited: "هنارتنا ئیمەیلا Atlas بۆ دەمەکێ کورت سنووردار بوویە. هندەک راوەستە و تەنێ جارەکا دی هەول بدە.",
    notAuthorized: "ئەم ئیمەیلە ل سەر خزمەتا ئیمەیلا هەنووکە یا Supabase ناتوانیت ئیمەیلا چوونەژوورێ وەربگریت. Atlas پێدڤی ب SMTP یا تایبەت هەیە.",
    provider: "چوونەژوور ب ئیمەیلا Atlas بۆ دەمەکێ کورت بەردەست نینە.",
    signupDisabled: "دروستکرنا هەژمارێ گشتی یێ Atlas ل Supabase هاتیە داخستن. دیسان هەولدان ب ئیمەیلێ ئەڤ ڕێکخستنە چارەسەر ناکەت.",
    network: "Atlas نەشیا چوونەژوور ب ئیمەیلێ دەست پێ بکەت. ئینتەرنێتا خۆ بپشکنە و دیسان هەول بدە.",
    confirmTitle: "ئەم ئیمەیلە دروستە؟",
    confirmHelp: "بەری هنارتنا لینکێ، هەمی پیتێن ئیمەیلێ بپشکنە.",
    confirmSend: "بەلێ، ئیمەیلێ بهنێرە",
    editEmail: "ئیمەیلێ بگۆڕە",
    sentBefore: "Atlas لینکەکا پشتڕاستکرنێ هنارت بۆ",
    sentAfter: "ئەگەر ئەڤ سندوقا ئیمەیلێ هەبیت، نامە دێ ب زوویی بگەهیت.",
    openEmail: "نووترین ئیمەیل ڤەکە",
    another: "ئیمەیلەکا دی بکاربینە",
    label: "ئیمەیل",
    sending: "دهێتە هنارتن…",
    send: "ب ئیمەیلێ بەردەوام بە",
  },
  ar: {
    invalid: "تأكد من البريد الإلكتروني. يبدو غير صحيح أو غير قادر على استقبال الرسائل.",
    failed: "Atlas ما قدر يرسل رابط تسجيل الدخول. حاول مرة ثانية بعدين.",
    rateLimited: "إرسال إيميلات Atlas محدود مؤقتاً. انتظر شوي وحاول مرة وحدة بعدين.",
    notAuthorized: "هذا البريد ما يقدر يستلم رسالة دخول Atlas من خدمة Supabase الحالية. Atlas يحتاج SMTP مخصص لهذا البريد.",
    provider: "تسجيل الدخول بالبريد في Atlas غير متاح مؤقتاً.",
    signupDisabled: "إنشاء حسابات Atlas العامة متوقف حالياً في Supabase. إعادة محاولة الإيميل ما راح تصلح هذا الإعداد.",
    network: "Atlas ما قدر يبدأ تسجيل الدخول بالبريد. تأكد من الإنترنت وحاول مرة ثانية.",
    confirmTitle: "هل هذا البريد صحيح؟",
    confirmHelp: "راجع كل حرف قبل ما يرسل Atlas رابط الدخول.",
    confirmSend: "نعم، أرسل الإيميل",
    editEmail: "تعديل البريد",
    sentBefore: "أرسل Atlas رابط التحقق إلى",
    sentAfter: "إذا كان صندوق البريد موجوداً، المفروض توصل الرسالة قريباً.",
    openEmail: "فتح أحدث رسالة",
    another: "استخدام بريد آخر",
    label: "البريد الإلكتروني",
    sending: "جارٍ الإرسال…",
    send: "المتابعة بالبريد الإلكتروني",
  },
} as const satisfies Record<UiLocale, Record<string, string>>;

type TemporaryEmailFailure = "invalid_email" | "rate_limited" | "not_authorized" | "provider" | "delivery";
type AuthReadiness = { supabaseGoogleEnabled?: boolean; signupDisabled?: boolean };

const ATLAS_GMAIL_QUERY = 'in:anywhere {subject:"Atlas — Sign in" subject:"Atlas — Confirm your email"} newer_than:1d';

function isGmailDomain(domain: string) {
  return domain === "gmail.com" || domain === "googlemail.com";
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isAndroidDevice() {
  return /Android/i.test(navigator.userAgent);
}

function isPlausibleEmail(email: string) {
  if (email.length > 320) return false;
  const separator = email.lastIndexOf("@");
  if (separator <= 0 || separator !== email.indexOf("@")) return false;

  const local = email.slice(0, separator);
  const domain = email.slice(separator + 1).toLowerCase();
  if (!local || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  if (!domain || domain.length > 253 || domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false;

  const labels = domain.split(".");
  if (labels.length < 2 || labels.at(-1)!.length < 2) return false;
  return labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
}

function emailWebInbox(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (isGmailDomain(domain)) {
    const query = encodeURIComponent(ATLAS_GMAIL_QUERY);
    return `https://mail.google.com/mail/u/0/#search/${query}`;
  }
  if (["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(domain)) return "https://outlook.live.com/mail/0/inbox";
  if (domain === "yahoo.com" || domain.endsWith(".yahoo.com")) return "https://mail.yahoo.com/d/folders/1";
  if (["icloud.com", "me.com", "mac.com"].includes(domain)) return "https://www.icloud.com/mail/";
  return "mailto:";
}

function openExternalApp(url: string, onFailure: () => void, delay = 1100) {
  let timer = 0;
  const cancelFallback = () => {
    if (!document.hidden) return;
    if (timer) window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", cancelFallback);
  };

  document.addEventListener("visibilitychange", cancelFallback);
  timer = window.setTimeout(() => {
    document.removeEventListener("visibilitychange", cancelFallback);
    if (!document.hidden) onFailure();
  }, delay);
  window.location.assign(url);
}

function openEmailInbox(email: string) {
  const fallback = () => window.location.assign(emailWebInbox(email));
  const domain = email.split("@")[1]?.toLowerCase() ?? "";

  if (isIOSDevice()) {
    const afterAppleMail = () => {
      if (isGmailDomain(domain)) {
        openExternalApp("googlegmail://", fallback, 1000);
        return;
      }
      fallback();
    };
    openExternalApp("message://", afterAppleMail, 1200);
    return;
  }

  if (isAndroidDevice() && isGmailDomain(domain)) {
    const browserFallback = encodeURIComponent(emailWebInbox(email));
    window.location.assign(`intent://mail.google.com/mail/u/0/#inbox#Intent;scheme=https;package=com.google.android.gm;S.browser_fallback_url=${browserFallback};end`);
    return;
  }

  fallback();
}

export function LegacyLoginForm({ locale }: { locale: UiLocale }) {
  const copy = copyByLocale[locale];
  const [email, setEmail] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
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

  function handleOpenEmail() {
    openEmailInbox(email);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || readiness?.signupDisabled === true) return;
    const normalized = email.trim().toLowerCase();
    if (!isPlausibleEmail(normalized)) {
      setError(copy.invalid);
      return;
    }
    setEmail(normalized);
    setError("");
    setConfirming(true);
  }

  async function sendConfirmedEmail() {
    if (busy || readiness?.signupDisabled === true) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/temporary-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; reason?: TemporaryEmailFailure } | null;
      if (!response.ok || result?.ok !== true) {
        if (result?.reason === "invalid_email") setError(copy.invalid);
        else if (result?.reason === "rate_limited") setError(copy.rateLimited);
        else if (result?.reason === "not_authorized") setError(copy.notAuthorized);
        else if (result?.reason === "provider") setError(copy.provider);
        else setError(copy.failed);
        return;
      }
      setConfirming(false);
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
          {copy.sentBefore} <strong dir="ltr">{email}</strong>. {copy.sentAfter}
        </p>
        <button className="button" type="button" onClick={handleOpenEmail}>{copy.openEmail}</button>
        <button className="button button-ghost" type="button" onClick={() => { setSent(false); setConfirming(false); setError(""); }}>{copy.another}</button>
        {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="stack-form atlas-email-confirm">
        <p className="notice" role="status"><strong>{copy.confirmTitle}</strong><br />{copy.confirmHelp}</p>
        <div className="atlas-email-confirm-address" dir="ltr">{email}</div>
        <button className="button" type="button" disabled={busy} onClick={sendConfirmedEmail}>{busy ? copy.sending : copy.confirmSend}</button>
        <button className="button button-ghost" type="button" disabled={busy} onClick={() => { setConfirming(false); setError(""); }}>{copy.editEmail}</button>
        {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      </div>
    );
  }

  return (
    <form className="stack-form" onSubmit={submit}>
      <label htmlFor="legacy-email">{copy.label}</label>
      <input
        id="legacy-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          if (error) setError("");
        }}
        aria-invalid={error === copy.invalid}
        required
      />
      <button className="button" type="submit" disabled={busy}>{copy.send}</button>
      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
    </form>
  );
}
