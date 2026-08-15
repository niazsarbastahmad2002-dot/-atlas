"use client";

import { useEffect, useState } from "react";
import { safeAuthDestination } from "@/lib/navigation";
import { createMagicLinkClient } from "@/lib/supabase/client";

export default function AuthFinishPage() {
  const [message, setMessage] = useState("Opening Atlas…");

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      const url = new URL(window.location.href);
      const next = safeAuthDestination(url.searchParams.get("next"));
      const hash = new URLSearchParams(window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash);
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const authError = hash.get("error") || hash.get("error_description");
      const supabase = createMagicLinkClient();

      if (authError) {
        window.history.replaceState(null, "", window.location.pathname);
        window.location.replace("/login?error=invalid_link");
        return;
      }

      // A browser may revisit this page after the fragment has already been
      // consumed. If a valid Atlas session exists, continue without showing an
      // error to the receptionist.
      if (!accessToken || !refreshToken) {
        const { data } = await supabase.auth.getSession();
        if (!cancelled && data.session) {
          window.location.replace(next);
          return;
        }
        window.location.replace("/login?error=invalid_link");
        return;
      }

      setMessage("Signing you in…");
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      // Remove credentials from the visible URL immediately after processing.
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);

      if (cancelled) return;
      if (error) {
        window.location.replace("/login?error=invalid_link");
        return;
      }

      setMessage("Opening your schedule…");
      window.location.replace(next);
    }

    void finishSignIn();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="login-page">
      <section className="login-card" style={{ minHeight: "100dvh", display: "grid", placeContent: "center" }}>
        <div className="login-copy" style={{ textAlign: "center" }}>
          <div className="eyebrow">Atlas</div>
          <h1>{message}</h1>
          <p>Just a moment.</p>
        </div>
      </section>
      <aside className="login-visual" aria-hidden="true" />
    </main>
  );
}
