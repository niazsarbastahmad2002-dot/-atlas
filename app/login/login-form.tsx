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
  const [showEmail, setShowEmail] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deviceBusy, setDeviceBusy] = useState(false);
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

  async function openAtlasOnThisDevice() {
    if (deviceBusy || busy) return;
    setDeviceBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { data, error: passkeyError } = await supabase.auth.signInWithPasskey();
      if (passkeyError || !data.session) {
        const cancelled = passkeyError?.name === "NotAllowedError" || passkeyError?.message?.toLowerCase().includes("cancel");
        if (!cancelled) {
          setShowEmail(true);
          setError("This device could not open Atlas directly. Use the clinic email below instead.");
        }
        return;
      }
      window.location.replace("/dashboard");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message.toLowerCase() : "";
      if (!message.includes("cancel") && !message.includes("notallowed")) {
        setShowEmail(true);
        setError("This device could not open Atlas directly. Use the clinic email below instead.");
      }
    } finally {
      setDeviceBusy(false);
    }
  }

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
      const supabase = createMagicLinkClient();
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      setEmail(normalized);
      if (sendError) {
        if (sendError.code === "over_email_send_rate_limit") {
          // Never pretend an email was sent when Supabase rejected the request.
          setCooldown(60);
          setError("No new Atlas email was sent because email sign-in is temporarily limited. Try Open Atlas above, or wait a moment and request a fresh email.");
        } else {
          setError("Atlas could not send the sign-in email. Check the email address or ask the clinic administrator to add this account.");
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
          <strong>Fresh Atlas email sent.</strong><br />
          Open only the newest Atlas email and tap <strong>Open Atlas</strong>.
        </div>
        {inbox ? <a className="button" href={inbox} target="_blank" rel="noreferrer">Open newest Atlas email</a> : null}
        <button className="button button-ghost" type="button" disabled={deviceBusy} onClick={() => void openAtlasOnThisDevice()}>
          {deviceBusy ? "Opening…" : "Open Atlas on this device"}
        </button>
        <p className="login-method-help">Once this device is trusted, normal days open Atlas without another email.</p>
        {error ? <p className="notice notice-error login-notice" role="alert">{error}</p> : null}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button className="button button-ghost button-small" type="button" disabled={busy || cooldown > 0} onClick={() => void sendLink()}>
            {busy ? "Sending…" : cooldown > 0 ? `New email in ${cooldown}s` : "Send a fresh email"}
          </button>
          <button className="button button-ghost button-small" type="button" disabled={busy} onClick={() => { setSent(false); setShowEmail(true); setError(""); }}>Use another email</button>
        </div>
      </div>
    );
  }

  return (
    <div className="receptionist-login-flow">
      <button className="button" type="button" disabled={deviceBusy || busy} onClick={() => void openAtlasOnThisDevice()}>
        {deviceBusy ? "Opening Atlas…" : "Open Atlas"}
      </button>
      <p className="login-method-help">On a trusted clinic device, this opens the schedule directly with Face ID, Touch ID, or the device unlock.</p>

      {error ? <p className="notice notice-error login-notice" role="alert">{error}</p> : null}

      {!showEmail ? (
        <button className="button button-ghost" type="button" onClick={() => { setShowEmail(true); setError(""); }}>
          Use clinic email instead
        </button>
      ) : (
        <form className="stack-form login-email-form" onSubmit={sendLink}>
          <label htmlFor="email">{t.workEmail}</label>
          <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="reception@clinic.com" dir="ltr" required />
          <button className="button button-ghost" type="submit" disabled={busy || cooldown > 0}>
            {busy ? "Sending…" : cooldown > 0 ? `Try again in ${cooldown}s` : "Send fresh Atlas email"}
          </button>
        </form>
      )}
    </div>
  );
}
