"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useMemo, useState } from "react";

export default function LoginPage() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_PERSONAL_SUPABASE_URL ?? "";
    const key = process.env.NEXT_PUBLIC_PERSONAL_SUPABASE_PUBLISHABLE_KEY ?? "";
    return createBrowserClient(url, key);
  }, []);
  const [phone, setPhone] = useState("+964");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState("");

  async function sendCode() {
    setStatus("Sending code…");
    const { error } = await supabase.auth.signInWithOtp({ phone: phone.trim() });
    if (error) { setStatus(error.message); return; }
    setSent(true);
    setStatus("Code sent. Enter it below.");
  }

  async function verifyCode() {
    setStatus("Verifying…");
    const { error } = await supabase.auth.verifyOtp({ phone: phone.trim(), token: code.trim(), type: "sms" });
    if (error) { setStatus(error.message); return; }
    setStatus("Signed in. Restart the ChatGPT connection to continue authorization.");
  }

  return (
    <main style={{ maxWidth: 520, margin: "64px auto", padding: 24, fontFamily: "system-ui" }}>
      <p style={{ fontWeight: 700 }}>Personal WhatsApp Bridge</p>
      <h1>Sign in</h1>
      <p>This uses only the isolated WhatsApp Auth Test project, never Atlas production Auth.</p>
      <label style={{ display: "block", marginTop: 20 }}>Phone number</label>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: "100%", padding: 12, marginTop: 6 }} />
      {!sent ? (
        <button onClick={sendCode} style={{ marginTop: 14, padding: "10px 16px" }}>Send code</button>
      ) : (
        <>
          <label style={{ display: "block", marginTop: 20 }}>Verification code</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" style={{ width: "100%", padding: 12, marginTop: 6 }} />
          <button onClick={verifyCode} style={{ marginTop: 14, padding: "10px 16px" }}>Verify</button>
        </>
      )}
      {status ? <p style={{ marginTop: 18 }}>{status}</p> : null}
    </main>
  );
}
