"use client";

import { useState, type FormEvent } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/client";

const copyByLocale = {
  en: {
    invalid: "Enter the email already attached to your existing Atlas account.",
    missing: "That email is not an existing Atlas account. If you deleted the account, that email can no longer be used for migration sign-in.",
    failed: "Atlas could not send the migration sign-in link. Check the existing account email and try again.",
    network: "Atlas could not start migration sign-in. Check your connection and try again.",
    sentBefore: "Open the newest Atlas email for",
    sentAfter: "After sign-in, add and verify your phone number in Settings.",
    another: "Use another existing email",
    label: "Existing Atlas email",
    sending: "Sending…",
    send: "Send migration sign-in link",
  },
  ku: {
    invalid: "ئیمەیڵەکەی هەژماری Atlas ـە کۆنەکەت بە دروستی بنووسە.",
    missing: "ئەم ئیمەیڵە چیتر هەژمارێکی بوونی هەی Atlas نییە. ئەگەر هەژمارەکەت سڕیوەتەوە، ناتوانیت بەو ئیمەیڵە دووبارە لە ڕێگای گواستنەوە بچیتە ژوورەوە.",
    failed: "Atlas نەیتوانی لینکی چوونەژوورەوەی گواستنەوە بنێرێت. ئیمەیڵی هەژمارە کۆنەکەت بپشکنە و دووبارە هەوڵ بدە.",
    network: "Atlas نەیتوانی چوونەژوورەوەی گواستنەوە دەست پێ بکات. ئینتەرنێتەکەت بپشکنە و دووبارە هەوڵ بدە.",
    sentBefore: "نوێترین ئیمەیڵی Atlas بکەرەوە بۆ",
    sentAfter: "دوای چوونەژوورەوە، لە ڕێکخستنەکان ژمارەی مۆبایل زیاد بکە و پشتڕاستی بکەرەوە.",
    another: "ئیمەیڵێکی کۆنی تر بەکاربهێنە",
    label: "ئیمەیڵی هەژماری Atlas ـی کۆن",
    sending: "دەنێردرێت…",
    send: "لینکی چوونەژوورەوەی گواستنەوە بنێرە",
  },
  bd: {
    invalid: "ئیمەیلا هەژمارا Atlas یا کەڤن یا خۆ ب دروستی بنڤیسە.",
    missing: "ئەڤ ئیمەیلە دیگر هەژمارەکا Atlas یا هەی نینە. ئەگەر تە هەژمارا خۆ ژێبری، ناتوانی ب وێ ئیمەیلێ دیسان ب ڕێکا گوهەستنێ بچیە ژوور.",
    failed: "Atlas نەشیا لینکا چوونەژوورا گوهەستنێ بهنێریت. ئیمەیلا هەژمارا کەڤن بپشکنە و دیسان هەول بدە.",
    network: "Atlas نەشیا چوونەژوورا گوهەستنێ دەست پێ بکەت. ئینتەرنێتا خۆ بپشکنە و دیسان هەول بدە.",
    sentBefore: "نووترین ئیمەیلا Atlas ڤەکە بۆ",
    sentAfter: "پشتی چوونەژوورێ، ل ڕێکخستنان ژمارا موبایلێ زێدە بکە و پشتڕاست بکە.",
    another: "ئیمەیلەکا کەڤن یا دی بکاربینە",
    label: "ئیمەیلا هەژمارا Atlas یا کەڤن",
    sending: "دهێتە هنارتن…",
    send: "لینکا چوونەژوورا گوهەستنێ بهنێرە",
  },
  ar: {
    invalid: "اكتب البريد الإلكتروني المرتبط بحساب Atlas الحالي بشكل صحيح.",
    missing: "هذا البريد لم يعد مرتبطاً بحساب Atlas موجود. إذا حذفت الحساب، ما تقدر تستخدم نفس البريد لتسجيل دخول النقل مرة ثانية.",
    failed: "Atlas ما قدر يرسل رابط تسجيل دخول النقل. تأكد من بريد الحساب الحالي وحاول مرة ثانية.",
    network: "Atlas ما قدر يبدأ تسجيل دخول النقل. تأكد من الإنترنت وحاول مرة ثانية.",
    sentBefore: "افتح أحدث رسالة من Atlas المرسلة إلى",
    sentAfter: "بعد تسجيل الدخول، أضف رقم الموبايل وحققه من الإعدادات.",
    another: "استخدام بريد حساب حالي آخر",
    label: "بريد حساب Atlas الحالي",
    sending: "جارٍ الإرسال…",
    send: "إرسال رابط تسجيل دخول النقل",
  },
} as const satisfies Record<UiLocale, Record<string, string>>;

function isMissingLegacyAccount(error: { code?: string; message?: string } | null) {
  const text = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return text.includes("otp_disabled") || text.includes("signups not allowed");
}

export function LegacyLoginForm({ locale }: { locale: UiLocale }) {
  const copy = copyByLocale[locale];
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError(copy.invalid);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings`,
        },
      });
      if (authError) {
        setError(isMissingLegacyAccount(authError) ? copy.missing : copy.failed);
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

  if (sent) {
    return (
      <div className="stack-form">
        <p className="notice notice-success" role="status">
          {copy.sentBefore} <span dir="ltr">{email}</span>. {copy.sentAfter}
        </p>
        <button className="button button-ghost" type="button" onClick={() => { setSent(false); setError(""); }}>{copy.another}</button>
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
