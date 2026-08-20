"use client";

import { useState, type FormEvent } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import type { AtlasSocialProviders } from "@/lib/auth-providers";
import { createClient } from "@/lib/supabase/client";

const copy = {
  en: {
    apple: "Continue with Apple",
    google: "Continue with Google",
    passkey: "Use Face ID / passkey",
    email: "Or use any email",
    emailLabel: "Email",
    emailButton: "Send secure sign-in link",
    sending: "Opening…",
    sent: "Check your email once to finish joining. After that, Face ID / passkey can bring you back quickly.",
    invalid: "Enter a valid email address.",
    failed: "Atlas could not start sign-in. Try another method.",
  },
  ku: {
    apple: "بە Apple بەردەوام بە",
    google: "بە Google بەردەوام بە",
    passkey: "Face ID / passkey بەکاربهێنە",
    email: "یان هەر ئیمەیڵێک بەکاربهێنە",
    emailLabel: "ئیمەیڵ",
    emailButton: "بەستەری پارێزراوی چوونەژوورەوە بنێرە",
    sending: "دەکرێتەوە…",
    sent: "تەنها ئەم جارە ئیمەیڵەکەت بپشکنە بۆ تەواوکردنی چوونەژوورەوە. دواتر Face ID / passkey دەتوانێت بە خێرایی بگەڕێنێتەوە.",
    invalid: "ئیمەیڵێکی دروست بنووسە.",
    failed: "Atlas نەیتوانی چوونەژوورەوە دەستپێبکات. ڕێگایەکی تر تاقی بکەرەوە.",
  },
  bd: {
    apple: "ب Apple بەردەوام بە",
    google: "ب Google بەردەوام بە",
    passkey: "Face ID / passkey بکاربینە",
    email: "یان هەر ئیمەیلەکێ بکاربینە",
    emailLabel: "ئیمەیل",
    emailButton: "لینکا پاراستی یا چوونەژوورێ بهنێرە",
    sending: "ڤەدبیت…",
    sent: "تەنێ ڤێ جارێ ئیمەیلا خۆ بپشکنە بۆ تەمامکرنا چوونەژوورێ. پاشی Face ID / passkey دکاریت ب خێرایی تە بگەڕینیتەڤە.",
    invalid: "ئیمەیلەکا دروست بنڤیسە.",
    failed: "Atlas نەشیا چوونەژوورێ دەست پێ بکەت. ڕێکەکا دی تاقی بکە.",
  },
  ar: {
    apple: "المتابعة باستخدام Apple",
    google: "المتابعة باستخدام Google",
    passkey: "استخدام Face ID / مفتاح المرور",
    email: "أو استخدم أي بريد إلكتروني",
    emailLabel: "البريد الإلكتروني",
    emailButton: "إرسال رابط دخول آمن",
    sending: "جارٍ الفتح…",
    sent: "افتح بريدك هذه المرة فقط لإكمال الانضمام. بعد ذلك يقدر Face ID / مفتاح المرور يرجعك بسرعة.",
    invalid: "أدخل بريد إلكتروني صحيح.",
    failed: "تعذر بدء تسجيل الدخول. جرّب طريقة ثانية.",
  },
} as const;

export function JoinClinicAuth({ token, locale, providers }: {
  token: string;
  locale: UiLocale;
  providers: AtlasSocialProviders;
}) {
  const t = copy[locale];
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const finishPath = `/join/${encodeURIComponent(token)}/finish`;

  async function social(provider: "apple" | "google") {
    if (busy) return;
    setBusy(provider);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(finishPath)}`,
        },
      });
      if (authError) setError(t.failed);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(null);
    }
  }

  async function passkey() {
    if (busy) return;
    setBusy("passkey");
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
      setBusy(null);
    }
  }

  async function emailSignIn(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError(t.invalid);
      return;
    }

    setBusy("email");
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(finishPath)}`,
        },
      });
      if (authError) {
        setError(t.failed);
        return;
      }
      setSent(true);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="settings-form">
      {providers.apple ? (
        <button className="button" type="button" disabled={Boolean(busy)} onClick={() => void social("apple")}>
          {busy === "apple" ? t.sending : t.apple}
        </button>
      ) : null}
      {providers.google ? (
        <button className="button button-ghost" type="button" disabled={Boolean(busy)} onClick={() => void social("google")}>
          {busy === "google" ? t.sending : t.google}
        </button>
      ) : null}
      <button className="button button-ghost" type="button" disabled={Boolean(busy)} onClick={() => void passkey()}>
        {busy === "passkey" ? t.sending : t.passkey}
      </button>

      <form className="settings-form" onSubmit={emailSignIn}>
        <p className="field-help">{t.email}</p>
        <label htmlFor="join-email">{t.emailLabel}</label>
        <input
          id="join-email"
          name="email"
          type="email"
          autoComplete="email"
          dir="ltr"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button className="button button-ghost" type="submit" disabled={Boolean(busy)}>
          {busy === "email" ? t.sending : t.emailButton}
        </button>
      </form>

      {sent ? <p className="notice notice-success" role="status">{t.sent}</p> : null}
      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
    </div>
  );
}
