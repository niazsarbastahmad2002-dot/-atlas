"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const copy = {
  en: "Finishing sign in…",
  ku: "چوونەژوورەوە تەواو دەکرێت…",
  bd: "چوونەژوور دهێتە تەمامکرن…",
  ar: "جارٍ إكمال تسجيل الدخول…",
} as const;

type EmailLocale = keyof typeof copy;

function safeNext(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard/select-clinic";
  return raw;
}

function readLocale(raw: string | null): EmailLocale {
  return raw === "ku" || raw === "bd" || raw === "ar" ? raw : "en";
}

export default function EmailCallbackPage() {
  const [message, setMessage] = useState(copy.en);

  useEffect(() => {
    let active = true;

    async function finishEmailSignIn() {
      const current = new URL(window.location.href);
      const locale = readLocale(current.searchParams.get("atlas_email_locale"));
      const next = safeNext(current.searchParams.get("next"));
      const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");
      const fragmentError = fragment.get("error") || fragment.get("error_description");

      if (active) setMessage(copy[locale]);

      // Remove bearer tokens from the visible URL as soon as we have read them.
      window.history.replaceState({}, "", `${current.pathname}${current.search}`);

      if (fragmentError || !accessToken || !refreshToken) {
        window.location.replace("/login?error=invalid_link");
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (!active) return;
      if (error) {
        window.location.replace("/login?error=invalid_link");
        return;
      }

      window.location.replace(`/auth/activate?next=${encodeURIComponent(next)}`);
    }

    void finishEmailSignIn();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
      <div role="status" aria-live="polite" style={{ textAlign: "center" }}>
        <strong style={{ display: "block", letterSpacing: "0.24em", marginBottom: "12px" }}>ATLAS</strong>
        <span>{message}</span>
      </div>
    </main>
  );
}
