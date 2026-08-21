"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function LegacyLoginForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError("Enter the email already attached to your existing Atlas account.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings`,
        },
      });
      if (authError) {
        setError("Atlas could not send the migration sign-in link. Check the existing account email and try again.");
        return;
      }
      setEmail(normalized);
      setSent(true);
    } catch {
      setError("Atlas could not start migration sign-in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="stack-form">
        <p className="notice notice-success" role="status">
          Open the newest Atlas email for <span dir="ltr">{email}</span>. After sign-in, add and verify your phone number in Settings.
        </p>
        <button className="button button-ghost" type="button" onClick={() => { setSent(false); setError(""); }}>Use another existing email</button>
        {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      </div>
    );
  }

  return (
    <form className="stack-form" onSubmit={submit}>
      <label htmlFor="legacy-email">Existing Atlas email</label>
      <input id="legacy-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <button className="button" type="submit" disabled={busy}>{busy ? "Sending…" : "Send migration sign-in link"}</button>
      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
    </form>
  );
}
