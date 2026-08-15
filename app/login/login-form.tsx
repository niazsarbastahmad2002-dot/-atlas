"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { uiText, type UiLocale } from "@/lib/i18n/ui";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function LoginForm({ locale }: { locale: UiLocale }) {
  const t = uiText(locale);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  async function sendLink(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;

    const normalized = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError("Enter your work email address.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (sendError) {
        if (sendError.code === "over_email_send_rate_limit") {
          setError("A sign-in link was requested too recently. Wait a moment and try again.");
        } else {
          setError("Atlas could not send the sign-in link. Check the email or ask the clinic administrator to add this account.");
        }
        return;
      }

      setEmail(normalized);
      setSent(true);
    } catch {
      setError("Atlas could not start sign-in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="receptionist-login-flow">
        <div className="notice notice-success login-notice" role="status">
          <strong>One last tap.</strong><br />
          We sent a secure Atlas sign-in button to <bdi dir="ltr">{email}</bdi>.
        </div>

        <a className="button" href="mailto:">Open email</a>
        <p className="login-method-help">
          Tap the Atlas sign-in button in the newest email. Atlas opens the schedule automatically and keeps this device signed in.
        </p>

        {error ? <p className="notice notice-error login-notice" role="alert">{error}</p> : null}

        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button className="button button-ghost button-small" type="button" disabled={busy} onClick={() => void sendLink()}>
            {busy ? "Sending…" : "Send again"}
          </button>
          <button
            className="button button-ghost button-small"
            type="button"
            disabled={busy}
            onClick={() => {
              setSent(false);
              setError("");
            }}
          >
            Use another email
          </button>
        </div>
        <p className="login-method-help">Normally this is needed only once on this device. Returning receptionists open Atlas straight into the schedule.</p>
      </div>
    );
  }

  return (
    <div className="receptionist-login-flow">
      {error ? <p className="notice notice-error login-notice" role="alert">{error}</p> : null}
      <form className="stack-form login-email-form" onSubmit={sendLink}>
        <label htmlFor="email">{t.workEmail}</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="reception@clinic.com"
          dir="ltr"
          required
        />
        <button className="button" type="submit" disabled={busy}>
          {busy ? "Sending…" : "Continue"}
        </button>
      </form>
      <p className="login-method-help">First time on this device: enter the clinic email and tap one secure link. After that, just open Atlas.</p>
    </div>
  );
}
