"use client";

import { useEffect, useState } from "react";
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
        const fullName = params.get("full_name")?.trim() ?? "";

        // Remove the identity token from the visible browser history immediately.
        window.history.replaceState(null, "", "/auth/native");

        if (provider !== "apple" || !token) throw new Error("invalid_native_auth");
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithIdToken({ provider: "apple", token });
        if (error) throw error;

        if (fullName) {
          await supabase.auth.updateUser({ data: { full_name: fullName } });
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
