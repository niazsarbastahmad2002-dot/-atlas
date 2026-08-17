"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasskeyManager() {
  const [status, setStatus] = useState<"idle" | "working" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function register() {
    if (status === "working") return;
    setStatus("working");
    setMessage("Opening this device's security prompt…");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.registerPasskey();

      if (error) {
        const code = error.code ?? "";
        const text = error.message?.toLowerCase() ?? "";

        if (code === "passkey_disabled") {
          setMessage("Backup sign-in is temporarily unavailable. Your normal Atlas session is unchanged.");
        } else if (code === "webauthn_credential_exists" || text.includes("already") || text.includes("credential") && text.includes("exist")) {
          setMessage("Backup sign-in is already ready on this account. Atlas will still open normally while this device stays signed in.");
          setStatus("success");
          return;
        } else if (text.includes("cancel") || text.includes("notallowed") || text.includes("not allowed") || text.includes("timed out")) {
          setMessage("The device prompt was closed before it finished. Tap again if you want to set up backup sign-in.");
        } else {
          setMessage("Backup sign-in could not finish. Nothing changed, so you can safely try again later.");
        }
        setStatus("error");
        return;
      }

      setMessage(`Backup sign-in ready${data.friendly_name ? `: ${data.friendly_name}` : ""}. You will not be asked for it on normal everyday launches.`);
      setStatus("success");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "AbortError") {
        setMessage("The device prompt was closed before it finished. Tap again if you want to continue.");
      } else {
        setMessage("This device could not finish backup sign-in setup. Your Atlas session is unchanged.");
      }
      setStatus("error");
    }
  }

  return (
    <div className="settings-form">
      <p className="field-help">Everyday use: just open Atlas. No passkey prompt is needed while this device remains signed in.</p>
      <p className="field-help">To test email sign-in from the beginning, use Sign out above. Then choose “New device or recovery” and enter the work email again. You do not need to delete the email account.</p>
      <button className="button" type="button" onClick={register} disabled={status === "working"} aria-busy={status === "working"}>
        {status === "working" ? "Opening device security…" : status === "success" ? "Backup sign-in ready" : "Set up backup sign-in"}
      </button>
      {message ? (
        <p className={`notice ${status === "success" ? "notice-success" : status === "working" ? "" : "notice-error"}`} role={status === "error" ? "alert" : "status"}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
