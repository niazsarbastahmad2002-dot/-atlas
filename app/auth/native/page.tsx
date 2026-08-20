"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NativeAuthPage() {
  const [message, setMessage] = useState("Opening Atlas…");

  useEffect(() => {
    let cancelled = false;

    async function finishNativeAuth() {
      const supabase = createClient();
      try {
        const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const provider = params.get("provider");
        const token = params.get("id_token");
        const nonce = params.get("nonce");
        const authorizationCode = params.get("authorization_code");
        const fullName = params.get("full_name")?.trim() ?? "";

        // Remove Apple credentials from browser history before any network work.
        window.history.replaceState(null, "", "/auth/native");

        if (provider !== "apple" || !token || !nonce || !authorizationCode) {
          throw new Error("invalid_native_auth");
        }

        const { error } = await supabase.auth.signInWithIdToken({ provider: "apple", token, nonce });
        if (error) throw error;

        if (fullName) {
          await supabase.auth.updateUser({ data: { full_name: fullName } });
        }

        // Apple requires apps that offer account deletion to revoke Sign in with Apple.
        // The one-time authorization code is exchanged server-side; only the resulting
        // refresh token is retained, encrypted in Supabase Vault.
        const retainResponse = await fetch("/api/auth/apple/retain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authorizationCode }),
          credentials: "same-origin",
        });
        if (!retainResponse.ok) {
          await supabase.auth.signOut();
          throw new Error("apple_authorization_retention_failed");
        }

        if (!cancelled) window.location.replace("/auth/activate?next=/dashboard");
      } catch {
        if (!cancelled) {
          setMessage("Apple sign-in could not be completed. Open Atlas and try again.");
          window.setTimeout(() => window.location.replace("/login"), 1600);
        }
      }
    }

    void finishNativeAuth();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="app-brand"><span className="app-brand-mark">A</span><span>Atlas</span></div>
        <h1>{message}</h1>
        <p className="quiet">Secure native sign-in</p>
      </section>
    </main>
  );
}
