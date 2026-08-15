"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasskeySignIn() {
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState("");

  async function signIn() {
    if (status === "working") return;
    setStatus("working");
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPasskey();
      if (error) {
        const disabled = error.code === "passkey_disabled";
        setMessage(disabled
          ? "Passkey recovery is temporarily unavailable."
          : "Passkey recovery did not finish. Try again or use the email recovery option below.");
        setStatus("error");
        return;
      }
      window.location.replace("/dashboard");
    } catch {
      setMessage("This browser could not use your saved passkey. Use the recovery option below.");
      setStatus("error");
    }
  }

  return (
    <div className="passkey-login">
      <button className="google-button" type="button" onClick={signIn} disabled={status === "working"}>
        <span aria-hidden="true" style={{ fontSize: 20 }}>⌁</span>
        <span>{status === "working" ? "Opening device security…" : "Use saved passkey"}</span>
      </button>
      <p className="login-method-help">You normally will not see this screen again. Atlas keeps the signed-in session on this device until you sign out or clear browser data.</p>
      {status === "error" ? <p className="notice notice-error login-notice" role="alert">{message}</p> : null}
    </div>
  );
}
