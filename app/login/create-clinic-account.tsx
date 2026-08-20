"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UiLocale } from "@/lib/i18n/ui";

type Copy = {
  title: string;
  help: string;
  email: string;
  send: string;
  sending: string;
  sent: string;
  sentHelp: string;
  google: string;
  apple: string;
  invalid: string;
  failed: string;
  divider: string;
};

const copyByLocale: Record<UiLocale, Copy> = {
  en: {
    title: "New to Atlas? Create your clinic",
    help: "Use Apple or Google when available for the fastest setup. Any email also works.",
    email: "Your email",
    send: "Create my Atlas clinic",
    sending: "Sending…",
    sent: "Check your email",
    sentHelp: "Open the newest Atlas email and tap Open Atlas. You will then create your own clinic.",
    google: "Continue with Google",
    apple: "Continue with Apple",
    invalid: "Enter a valid email address.",
    failed: "Atlas could not start account creation. Try again.",
    divider: "or",
  },
  ku: {
    title: "تازەی بۆ Atlas؟ کلینیکەکەت دروست بکە",
    help: "کاتێک بەردەستن Apple یان Google بەکاربهێنە بۆ خێراترین ڕێکخستن. هەر ئیمەیڵێکیش کار دەکات.",
    email: "ئیمەیڵەکەت",
    send: "کلینیکی Atlas ـەکەم دروست بکە",
    sending: "دەنێردرێت…",
    sent: "ئیمەیڵەکەت بپشکنە",
    sentHelp: "نوێترین ئیمەیڵی Atlas بکەرەوە و Open Atlas دابگرە. پاشان کلینیکی خۆت دروست دەکەیت.",
    google: "بە Google بەردەوام بە",
    apple: "بە Apple بەردەوام بە",
    invalid: "ئیمەیڵێکی دروست بنووسە.",
    failed: "Atlas نەیتوانی دروستکردنی هەژمار دەستپێبکات. دووبارە هەوڵ بدە.",
    divider: "یان",
  },
  bd: {
    title: "تازەی بۆ Atlas؟ کلینیکا خۆ دروست بکە",
    help: "دەمێ بەردەستن Apple یان Google بکاربینە بۆ خێراترین ڕێکخستن. هەر ئیمەیلەک ژی کار دکەت.",
    email: "ئیمەیلا تە",
    send: "کلینیکا Atlas یا من دروست بکە",
    sending: "دهێتە هنارتن…",
    sent: "ئیمەیلا خۆ بپشکنە",
    sentHelp: "نووترین ئیمەیلا Atlas ڤەکە و Open Atlas بکە. پاشی کلینیکا خۆ دروست دکەی.",
    google: "ب Google بەردەوام بە",
    apple: "ب Apple بەردەوام بە",
    invalid: "ئیمەیلەکا دروست بنڤیسە.",
    failed: "Atlas نەشیا دروستکرنا هەژمارێ دەست پێ بکەت. دووبارە هەول بدە.",
    divider: "یان",
  },
  ar: {
    title: "جديد على Atlas؟ أنشئ عيادتك",
    help: "استخدم Apple أو Google لما يكونون متاحين لأسرع دخول. وأي بريد إلكتروني يشتغل أيضاً.",
    email: "بريدك الإلكتروني",
    send: "إنشاء عيادتي على Atlas",
    sending: "جارٍ الإرسال…",
    sent: "افتح بريدك",
    sentHelp: "افتح أحدث رسالة من Atlas واضغط Open Atlas. بعدها تنشئ عيادتك الخاصة.",
    google: "المتابعة باستخدام Google",
    apple: "المتابعة باستخدام Apple",
    invalid: "أدخل بريد إلكتروني صحيح.",
    failed: "تعذر بدء إنشاء الحساب. حاول مرة ثانية.",
    divider: "أو",
  },
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function CreateClinicAccount({ locale }: { locale: UiLocale }) {
  const copy = copyByLocale[locale];
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<"google" | "apple" | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [providers, setProviders] = useState({ google: false, apple: false });

  useEffect(() => {
    let cancelled = false;
    async function loadProviders() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) return;
      try {
        const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, { headers: { apikey: key } });
        if (!response.ok) return;
        const settings = await response.json() as { external?: Record<string, boolean | undefined> };
        const embeddedIos = window.navigator.userAgent.includes("Atlas-iOS/");
        if (!cancelled) {
          setProviders({
            // Google explicitly blocks OAuth authorization in WKWebView. The
            // native shell will add Google through its iOS client once issued.
            google: !embeddedIos && settings.external?.google === true,
            apple: settings.external?.apple === true,
          });
        }
      } catch {
        // Email remains a safe fallback when provider discovery is unavailable.
      }
    }
    void loadProviders();
    return () => { cancelled = true; };
  }, []);

  async function createWithEmail(event: FormEvent) {
    event.preventDefault();
    if (busy || oauthBusy) return;
    const normalized = normalizeEmail(email);
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
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (authError) {
        setError(copy.failed);
        return;
      }
      setEmail(normalized);
      setSent(true);
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  async function continueWith(provider: "google" | "apple") {
    if (busy || oauthBusy) return;
    setOauthBusy(provider);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (authError) setError(copy.failed);
    } catch {
      setError(copy.failed);
    } finally {
      setOauthBusy(null);
    }
  }

  return (
    <section className="auth-alternative" aria-label={copy.title}>
      <div>
        <strong>{copy.title}</strong>
        <p className="login-method-help">{copy.help}</p>
      </div>

      {providers.apple ? (
        <button className="button" type="button" disabled={busy || Boolean(oauthBusy)} onClick={() => void continueWith("apple")}>
          {oauthBusy === "apple" ? copy.sending : copy.apple}
        </button>
      ) : null}
      {providers.google ? (
        <button className="button button-ghost" type="button" disabled={busy || Boolean(oauthBusy)} onClick={() => void continueWith("google")}>
          {oauthBusy === "google" ? copy.sending : copy.google}
        </button>
      ) : null}

      {(providers.google || providers.apple) ? <div className="login-method-help" aria-hidden="true">{copy.divider}</div> : null}

      {sent ? (
        <div className="notice notice-success login-notice" role="status">
          <strong>{copy.sent}</strong><br />
          {copy.sentHelp}
        </div>
      ) : (
        <form className="stack-form login-email-form" onSubmit={createWithEmail}>
          <label htmlFor="new-clinic-email">{copy.email}</label>
          <input
            id="new-clinic-email"
            name="new-clinic-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            dir="ltr"
            required
          />
          <button className="button button-ghost" type="submit" disabled={busy || Boolean(oauthBusy)}>
            {busy ? copy.sending : copy.send}
          </button>
        </form>
      )}

      {error ? <p className="notice notice-error login-notice" role="alert">{error}</p> : null}
    </section>
  );
}
