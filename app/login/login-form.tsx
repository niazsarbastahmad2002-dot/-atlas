"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uiText, type UiLocale } from "@/lib/i18n/ui";

type Step = "email" | "code";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function LoginForm({ locale }: { locale: UiLocale }) {
  const t = uiText(locale);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;

    const normalized = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError("Enter your work email address.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: { shouldCreateUser: false },
      });

      if (sendError) {
        if (sendError.code === "over_email_send_rate_limit") {
          setError("A code was requested too recently. Wait a moment and try again.");
        } else {
          setError("Atlas could not send a sign-in code. Check the email or ask your clinic administrator to add this account.");
        }
        return;
      }

      setEmail(normalized);
      setStep("code");
      setMessage(`Enter the 6-digit code sent to ${normalized}.`);
    } catch {
      setError("Atlas could not start sign-in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    const token = code.replace(/\D/g, "");
    if (!/^\d{6}$/.test(token)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (verifyError) {
        setError("That code is incorrect or expired. Check the latest email and try again.");
        return;
      }

      window.location.replace("/dashboard");
    } catch {
      setError("Atlas could not finish sign-in. Try the code again.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "code") {
    return (
      <div className="receptionist-login-flow">
        {message ? <p className="notice notice-success login-notice" role="status">{message}</p> : null}
        {error ? <p className="notice notice-error login-notice" role="alert">{error}</p> : null}

        <form className="stack-form login-email-form" onSubmit={verifyCode}>
          <label htmlFor="email-code">Verification code</label>
          <input
            id="email-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            dir="ltr"
            autoFocus
            required
          />
          <button className="button" type="submit" disabled={busy || code.length !== 6}>
            {busy ? "Opening Atlas…" : "Open Atlas"}
          </button>
        </form>

        <div className="login-secondary-actions">
          <button className="text-button" type="button" disabled={busy} onClick={() => void sendCode()}>
            Send a new code
          </button>
          <button
            className="text-button"
            type="button"
            disabled={busy}
            onClick={() => {
              setStep("email");
              setCode("");
              setMessage("");
              setError("");
            }}
          >
            Use another email
          </button>
        </div>
        <p className="login-method-help">This verification is normally needed only when Atlas no longer has an active session on this device.</p>
      </div>
    );
  }

  return (
    <div className="receptionist-login-flow">
      {error ? <p className="notice notice-error login-notice" role="alert">{error}</p> : null}
      <form className="stack-form login-email-form" onSubmit={sendCode}>
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
          {busy ? "Sending code…" : "Continue"}
        </button>
      </form>
      <p className="login-method-help">First time on this device: enter your work email and one short verification code. After that, just open Atlas.</p>
    </div>
  );
}
