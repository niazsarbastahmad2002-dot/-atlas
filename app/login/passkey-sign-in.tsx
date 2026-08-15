"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasskeySignIn() {
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState("");

  async function signIn() {
    setStatus("working");
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPasskey();
      if (error) {
        const disabled = error.code === "passkey_disabled";
        setMessage(disabled
          ? "Passkey sign-in is not enabled for this Atlas project yet."
          : "Passkey sign-in did not complete. You can use the email fallback below.");
        setStatus("error");
        return;
      }
      window.location.assign("/dashboard");
    } catch {
      setMessage("This browser or device could not use a passkey. You can use the email fallback below.");
      setStatus("error");
    }
  }

  return (
    <div className="passkey-login">
      <button className="google-button" type="button" onClick={signIn} disabled={status === "working"}>
        <span aria-hidden="true" style={{ fontSize: 20 }}>⌁</span>
        <span>{status === "working" ? "Opening passkey…" : "Sign in with passkey"}</span>
      </button>
      <p className="login-method-help">Use Face ID, Touch ID, device PIN, or your password manager. No email link is needed after setup.</p>
      {status === "error" ? <p className="notice notice-error login-notice" role="alert">{message}</p> : null}
    </div>
  );
}
