"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient, createMagicLinkClient } from "@/lib/supabase/client";
import { uiText, type UiLocale } from "@/lib/i18n/ui";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function inboxUrl(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (domain === "gmail.com" || domain === "googlemail.com") return "https://mail.google.com/mail/u/0/#search/Atlas";
  if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com") return "https://outlook.live.com/mail/0/inbox";
  if (domain === "yahoo.com") return "https://mail.yahoo.com/";
  return null;
}

export function LoginForm({ locale }: { locale: UiLocale }) {
  const t = uiText(locale);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!sent) return;
    let cancelled = false;
    const supabase = createClient();
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) window.location.replace("/dashboard");
    };
    void checkSession();
    const timer = window.setInterval(() => void checkSession(), 1500);
    const onFocus = () => void checkSession();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [sent]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function sendLink(event?: FormEvent) {
    event?.preventDefault();
    if (busy || cooldown > 0) return;
    const normalized = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError("Enter your work email address.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      // First-access email links intentionally use the implicit flow. That lets
      // a fresh link finish sign-in even when an email app opens it in a browser
      // context that does not have the original Atlas tab's PKCE verifier.
      const supabase = createMagicLinkClient();
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          shouldCreateUser: false,
          // Keep using the callback URL already approved in Supabase. For the
          // implicit flow the callback forwards the URL fragment to /auth/finish.
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      setEmail(normalized);
      if (sendError) {
        if (sendError.code === "over_email_send_rate_limit") {
          setSent(true);
          setCooldown(60);
          setError("");
        } else {
          setError("Atlas could not send the sign-in link. Check the email or ask the clinic administrator to add this account.");
        }
        return;
      }
      setSent(true);
      setCooldown(60);
    } catch {
      setError("Atlas could not start sign-in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    const inbox = inboxUrl(email);
    return (
      <div className="receptionist-login-flow">
        <div className="notice notice-success login-notice" role="status">
          <strong>One last tap.</strong><br />
          Open the newest Atlas email and tap <strong>Open Atlas</strong>. It will take you straight to the schedule.
        </div>
        {inbox ? <a className="button" href={inbox} target="_blank" rel="noreferrer">Open newest Atlas email</a> : null}
        <p className="login-method-help">After this first sign-in, this device normally opens Atlas directly.</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button className="button button-ghost button-small" type="button" disabled={busy || cooldown > 0} onClick={() => void sendLink()}>
            {busy ? "Sending…" : cooldown > 0 ? `New link in ${cooldown}s` : "Send a new link"}
          </button>
          <button className="button button-ghost button-small" type="button" disabled={busy} onClick={() => { setSent(false); setError(""); }}>Use another email</button>
        </div>
      </div>
    );
  }

  return (
    <div className="receptionist-login-flow">
      {error ? <p className="notice notice-error login-notice" role="alert">{error}</p> : null}
      <form className="stack-form login-email-form" onSubmit={sendLink}>
        <label htmlFor="email">{t.workEmail}</label>
        <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="reception@clinic.com" dir="ltr" required />
        <button className="button" type="submit" disabled={busy}>{busy ? "Sending…" : "Continue"}</button>
      </form>
      <p className="login-method-help">Enter the clinic email once. Atlas remembers this device after sign-in.</p>
    </div>
  );
}
