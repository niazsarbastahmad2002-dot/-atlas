"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const EMAIL_LOCALES = new Set(["en", "ku", "bd", "ar"]);

export default function EmailAuthCallbackPage() {
  const [message, setMessage] = useState("Opening Atlas…");

  useEffect(() => {
    let cancelled = false;

    async function finishEmailAuth() {
      try {
        const query = new URLSearchParams(window.location.search);
        const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const localeCandidate = query.get("atlas_email_locale");
        const requestedLocale = localeCandidate && EMAIL_LOCALES.has(localeCandidate) ? localeCandidate : null;
        const next = query.get("next") === "/dashboard/select-clinic"
          ? "/dashboard/select-clinic"
          : "/dashboard";
        const authError = fragment.get("error") || fragment.get("error_code");
        const accessToken = fragment.get("access_token");
        const refreshToken = fragment.get("refresh_token");

        // Remove tokens from visible browser history before any network call.
        window.history.replaceState(
          null,
          "",
          requestedLocale
            ? `/auth/email/callback?next=${encodeURIComponent(next)}&atlas_email_locale=${encodeURIComponent(requestedLocale)}`
            : `/auth/email/callback?next=${encodeURIComponent(next)}`,
        );

        if (authError || !accessToken || !refreshToken) {
          throw new Error("invalid_email_auth");
        }

        const supabase = createClient();
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;

        const metadataLocale = data.user?.user_metadata?.atlas_ui_language;
        const locale = requestedLocale
          ?? (typeof metadataLocale === "string" && EMAIL_LOCALES.has(metadataLocale) ? metadataLocale : "en");

        await fetch("/api/ui-language", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale }),
        }).catch(() => undefined);

        if (!cancelled) {
          window.location.replace(`/auth/activate?next=${encodeURIComponent(next)}`);
        }
      } catch {
        if (!cancelled) {
          setMessage("This Atlas sign-in link could not be completed.");
          window.setTimeout(() => window.location.replace("/login?error=invalid_link"), 1000);
        }
      }
    }

    void finishEmailAuth();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="app-brand"><span className="app-brand-mark">A</span><span>Atlas</span></div>
        <h1>{message}</h1>
        <p className="quiet">Secure email sign-in</p>
      </section>
    </main>
  );
}
