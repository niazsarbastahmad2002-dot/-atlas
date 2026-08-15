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
          setMessage("Passkey recovery is temporarily unavailable in Atlas authentication settings.");
        } else if (code === "webauthn_credential_exists" || text.includes("already") || text.includes("credential") && text.includes("exist")) {
          setMessage("This account already has a saved Atlas passkey. Your normal signed-in session will still open Atlas directly.");
          setStatus("success");
          return;
        } else if (text.includes("cancel") || text.includes("notallowed") || text.includes("not allowed") || text.includes("timed out")) {
          setMessage("The device prompt was closed before it finished. Tap again and approve the Apple Passwords / device prompt.");
        } else {
          setMessage("Passkey setup could not finish. Your current Atlas session is unchanged, so you can safely try again later.");
        }
        setStatus("error");
        return;
      }

      setMessage(`Recovery passkey ready${data.friendly_name ? `: ${data.friendly_name}` : ""}. Atlas will keep opening directly while this device stays signed in.`);
      setStatus("success");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "AbortError") {
        setMessage("The device prompt was closed before it finished. Tap again and approve the device prompt.");
      } else {
        setMessage("This device could not finish passkey setup. Your Atlas session is unchanged; you can safely try again later.");
      }
      setStatus("error");
    }
  }

  return (
    <div className="settings-form">
      <p className="field-help">Atlas normally keeps this device signed in, so there is no Face ID, fingerprint, PIN, or passkey prompt on everyday launches. A saved passkey is only a fast recovery method if the session is ever lost.</p>
      <button className="button" type="button" onClick={register} disabled={status === "working"} aria-busy={status === "working"}>
        {status === "working" ? "Waiting for device…" : status === "success" ? "Recovery passkey ready" : "Set up recovery passkey"}
      </button>
      {message ? (
        <p className={`notice ${status === "success" ? "notice-success" : "notice-error"}`} role={status === "success" ? "status" : "alert"}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
