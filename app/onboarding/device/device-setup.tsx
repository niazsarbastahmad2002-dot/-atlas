"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function DeviceSetup() {
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState("");

  async function secureDevice() {
    if (status === "working") return;
    setStatus("working");
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.registerPasskey();

      if (!error || error.code === "webauthn_credential_exists" || error.code === "too_many_passkeys") {
        window.location.replace("/dashboard");
        return;
      }

      const text = error.message?.toLowerCase() ?? "";
      if (text.includes("cancel") || text.includes("notallowed") || text.includes("not allowed") || text.includes("timed out")) {
        setMessage("The device prompt was closed before it finished. Tap again and approve the prompt.");
      } else if (error.code === "passkey_disabled") {
        setMessage("Device security is temporarily unavailable. You can continue because your Atlas session is already protected.");
      } else {
        setMessage("Your device could not finish the security step. Try once more, or continue with this protected session.");
      }
      setStatus("error");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "AbortError") {
        setMessage("The device prompt was closed before it finished. Tap again and approve the prompt.");
      } else {
        setMessage("This browser could not finish device security. You can continue with your protected Atlas session.");
      }
      setStatus("error");
    }
  }

  return (
    <div className="settings-form">
      <button className="button" type="button" onClick={secureDevice} disabled={status === "working"} aria-busy={status === "working"}>
        {status === "working" ? "Waiting for your device…" : "Secure this device"}
      </button>
      <p className="field-help">Your iPhone, iPad, Android device, or password manager decides whether to use Face ID, fingerprint, PIN, or another local security method.</p>

      {status === "error" ? (
        <div className="notice notice-error" role="alert">
          <p>{message}</p>
          <div style={{ marginTop: 10 }}>
            <a className="button button-ghost button-small" href="/dashboard">Continue to Atlas</a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
