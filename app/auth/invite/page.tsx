"use client";

import { useEffect } from "react";
import { isUiLocale } from "@/lib/i18n/ui";

export default function ReceptionistInvitePage() {
  useEffect(() => {
    // This legacy email-era invitation route is intentionally retired.
    // Never consume its auth fragment or grant clinic access automatically.
    async function recover() {
      const currentParams = new URLSearchParams(window.location.search);
      const lang = currentParams.get("lang");
      const destination = new URL("/login", window.location.origin);
      destination.searchParams.set("error", "invalid_invite");

      if (isUiLocale(lang)) {
        destination.searchParams.set("lang", lang);
        try {
          await fetch("/api/ui-language", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ locale: lang }),
          });
        } catch {
          // The validated query parameter still keeps the recovery copy localized.
        }
      }

      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      window.location.replace(destination.pathname + destination.search);
    }

    void recover();
  }, []);

  return (
    <main className="center-page">
      <section className="auth-card" aria-label="Atlas">
        <div className="app-brand"><span className="app-brand-mark">A</span><span>Atlas</span></div>
      </section>
    </main>
  );
}
