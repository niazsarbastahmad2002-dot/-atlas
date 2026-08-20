"use client";

import { useEffect, useState } from "react";
import { safeAuthDestination } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NativeAuthPage() {
  const [message, setMessage] = useState("Opening Atlas…");

  useEffect(() => {
    let cancelled = false;

    async function finishNativeAuth() {
      try {
        const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const provider = params.get("provider");
        const token = params.get("id_token");
        const authorizationCode = params.get("authorization_code");
        const nonce = params.get("nonce");
        const fullName = params.get("full_name")?.trim() ?? "";
        const next = safeAuthDestination(params.get("next"));

        // Remove every Apple credential and the invite destination from browser
        // history before making any network request.
        window.history.replaceState(null, "", "/auth/native");

        if (provider !== "apple" || !token || !authorizationCode || !nonce) {
          throw new Error("invalid_native_auth");
        }

        const supabase = createClient();
        const { error } = await supabase.auth.signInWithIdToken({ provider: "apple", token, nonce });
        if (error) throw error;

        // Apple authorization codes are short-lived and single-use. Exchange the
        // code immediately on Atlas's server and retain only the refresh token in
        // Supabase Vault so account deletion can revoke Apple authorization.
        const linkResponse = await fetch("/api/auth/apple/link", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ authorization_code: authorizationCode }),
        });
        if (!linkResponse.ok) {
          await supabase.auth.signOut().catch(() => undefined);
          throw new Error("apple_revocation_link_failed");
        }

        if (fullName) {
          await supabase.auth.updateUser({ data: { full_name: fullName } });
        }

        if (!cancelled) window.location.replace(`/auth/activate?next=${encodeURIComponent(next)}`);
      } catch {
        if (!cancelled) {
          setMessage("Apple sign-in could not be completed securely. Open Atlas and try again.");
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
