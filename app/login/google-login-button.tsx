"use client";

import { useState } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/client";

const copyByLocale = {
  en: { label: "Continue with Google", failed: "Google sign-in could not start. Please try again." },
  ku: { label: "بە Google بەردەوام بە", failed: "چوونەژوورەوە بە Google دەست پێ نەکرا. دووبارە هەوڵ بدە." },
  bd: { label: "ب Google بەردەوام بە", failed: "چوونەژوور ب Google دەست پێ نەکر. دیسان هەول بدە." },
  ar: { label: "المتابعة باستخدام Google", failed: "تعذر بدء تسجيل الدخول باستخدام Google. حاول مرة ثانية." },
} as const satisfies Record<UiLocale, { label: string; failed: string }>;

export function GoogleLoginButton({ locale }: { locale: UiLocale }) {
  const copy = copyByLocale[locale];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/select-clinic`,
        },
      });
      if (authError) setError(copy.failed);
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack-form">
      <button className="button" type="button" onClick={signIn} disabled={busy}>
        {copy.label}
      </button>
      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
    </div>
  );
}
