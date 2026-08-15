"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasskeyManager() {
  const [status, setStatus] = useState<"idle" | "working" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function register() {
    if (status === "working") return;
    setStatus("working");
    setMessage("");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.registerPasskey();

      if (error) {
        const code = error.code ?? "";
        const text = error.message?.toLowerCase() ?? "";

        if (code === "passkey_disabled") {
          setMessage("Passkeys need to be enabled in Atlas authentication settings.");
        } else if (text.includes("already") || text.includes("credential") && text.includes("exist")) {
          setMessage("A passkey for Atlas is already saved on this account. You can use it the next time you sign in.");
          setStatus("success");
          return;
        } else if (text.includes("cancel") || text.includes("notallowed") || text.includes("not allowed") || text.includes("timed out")) {
          setMessage("Passkey setup was closed before it finished. Tap Set up passkey and approve the Apple Passwords / device prompt.");
        } else {
          setMessage("Passkey setup could not finish. Tap Set up passkey once more and approve the device prompt. Your current Atlas session is still safe.");
        }
        setStatus("error");
        return;
      }

      setMessage(`Passkey ready${data.friendly_name ? `: ${data.friendly_name}` : ""}. Next time, sign in with Face ID, fingerprint, or your device PIN — no email link.`);
      setStatus("success");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "AbortError") {
        setMessage("Passkey setup was closed before it finished. Tap Set up passkey and approve the device prompt.");
      } else {
        setMessage("This device could not finish passkey setup. Your Atlas session is unchanged; you can safely try again.");
      }
      setStatus("error");
    }
  }

  return (
    <div className="settings-form">
      <p className="field-help">One-time setup on this account. Atlas will open your device's secure passkey prompt; approve it to finish.</p>
      <button className="button" type="button" onClick={register} disabled={status === "working"} aria-busy={status === "working"}>
        {status === "working" ? "Waiting for device…" : status === "success" ? "Passkey ready" : "Set up passkey"}
      </button>
      {message ? (
        <p className={`notice ${status === "success" ? "notice-success" : "notice-error"}`} role={status === "success" ? "status" : "alert"}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
