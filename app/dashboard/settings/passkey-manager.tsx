"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasskeyManager() {
  const [status, setStatus] = useState<"idle" | "working" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function register() {
    setStatus("working");
    setMessage("");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.registerPasskey();
      if (error) {
        const disabled = error.code === "passkey_disabled";
        setMessage(disabled
          ? "Passkeys still need to be enabled once in Supabase Authentication settings."
          : "The passkey was not added. Try again and complete the device prompt.");
        setStatus("error");
        return;
      }

      setMessage(`Passkey ready${data.friendly_name ? `: ${data.friendly_name}` : ""}. You can use it next time instead of an email link.`);
      setStatus("success");
    } catch {
      setMessage("This browser or device could not create a passkey.");
      setStatus("error");
    }
  }

  return (
    <div className="settings-form">
      <p className="field-help">Set this up once on a trusted device. Future sign-ins can use Face ID, Touch ID, device PIN, or a synced password manager instead of opening email.</p>
      <button className="button" type="button" onClick={register} disabled={status === "working"}>
        {status === "working" ? "Opening device security…" : "Set up passkey"}
      </button>
      {message ? (
        <p className={`notice ${status === "success" ? "notice-success" : "notice-error"}`} role={status === "success" ? "status" : "alert"}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
