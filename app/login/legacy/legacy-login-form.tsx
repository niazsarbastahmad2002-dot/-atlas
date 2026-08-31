"use client";

import { useState, type FormEvent } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/client";

const copyByLocale = {
  en: {
    invalid: "Enter a valid email address.",
    failed: "Atlas could not send the sign-in link. Check the email and try again.",
    network: "Atlas could not start email sign-in. Check your connection and try again.",
    sentBefore: "Open the newest Atlas email for",
    sentAfter: "The link will sign you in, or create a fresh Atlas account if this email was deleted before.",
    another: "Use another email",
    label: "Email",
    sending: "Sending…",
    send: "Continue with email",
  },
  ku: {
    invalid: "ئیمەیڵێکی دروست بنووسە.",
    failed: "Atlas نەیتوانی لینکی چوونەژوورەوە بنێرێت. ئیمەیڵەکە بپشکنە و دووبارە هەوڵ بدە.",
    network: "Atlas نەیتوانی چوونەژوورەوە بە ئیمەیڵ دەست پێ بکات. ئینتەرنێتەکەت بپشکنە و دووبارە هەوڵ بدە.",
    sentBefore: "نوێترین ئیمەیڵی Atlas بکەرەوە بۆ",
    sentAfter: "لینکەکە دەچێتە ژوورەوە، یان ئەگەر پێشتر ئەم هەژمارەت سڕیوەتەوە هەژمارێکی نوێی Atlas دروست دەکات.",
    another: "ئیمەیڵێکی تر بەکاربهێنە",
    label: "ئیمەیڵ",
    sending: "دەنێردرێت…",
    send: "بە ئیمەیڵ بەردەوام بە",
  },
  bd: {
    invalid: "ئیمەیلەکا دروست بنڤیسە.",
    failed: "Atlas نەشیا لینکا چوونەژوورێ بهنێریت. ئیمەیلێ بپشکنە و دیسان هەول بدە.",
    network: "Atlas نەشیا چوونەژوور ب ئیمەیلێ دەست پێ بکەت. ئینتەرنێتا خۆ بپشکنە و دیسان هەول بدە.",
    sentBefore: "نووترین ئیمەیلا Atlas ڤەکە بۆ",
    sentAfter: "لینک دێ تە بخەتە ژوور، یان ئەگەر تە پێشتر هەژمار ژێبری هەژمارەکا نوو یا Atlas دروست دکەت.",
    another: "ئیمەیلەکا دی بکاربینە",
    label: "ئیمەیل",
    sending: "دهێتە هنارتن…",
    send: "ب ئیمەیلێ بەردەوام بە",
  },
  ar: {
    invalid: "اكتب بريد إلكتروني صحيح.",
    failed: "Atlas ما قدر يرسل رابط تسجيل الدخول. تأكد من البريد وحاول مرة ثانية.",
    network: "Atlas ما قدر يبدأ تسجيل الدخول بالبريد. تأكد من الإنترنت وحاول مرة ثانية.",
    sentBefore: "افتح أحدث رسالة من Atlas المرسلة إلى",
    sentAfter: "الرابط يسجل دخولك، أو ينشئ حساب Atlas جديد إذا كنت حاذف هذا الحساب من قبل.",
    another: "استخدام بريد آخر",
    label: "البريد الإلكتروني",
    sending: "جارٍ الإرسال…",
    send: "المتابعة بالبريد الإلكتروني",
  },
} as const satisfies Record<UiLocale, Record<string, string>>;

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
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard/select-clinic`,
        },
      });
      if (authError) {
        setError(copy.failed);
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
