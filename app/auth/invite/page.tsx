"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ReceptionistInvitePage() {
  const [message, setMessage] = useState("Opening Atlas…");

  useEffect(() => {
    let cancelled = false;

    async function finishInvitation() {
      try {
        const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const supabase = createClient();

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error("missing_invitation_session");
        }

        if (!cancelled) window.location.replace("/auth/activate");
      } catch {
        if (!cancelled) {
          setMessage("This Atlas invitation is no longer valid. Ask the clinic to send a fresh invitation.");
          window.setTimeout(() => window.location.replace("/login?error=invalid_link"), 1800);
        }
      }
    }

    void finishInvitation();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="app-brand"><span className="app-brand-mark">A</span><span>Atlas</span></div>
        <h1>{message}</h1>
        <p className="quiet">Your clinic access will open automatically.</p>
      </section>
    </main>
  );
}
