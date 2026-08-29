"use client";

import { normalizeOtpToken } from "@/lib/phone-auth";

export function OtpCodeField({
  id,
  label,
  value,
  onChange,
  pasteLabel,
  autoFocus = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  pasteLabel: string;
  autoFocus?: boolean;
}) {
  async function pasteCode() {
    try {
      const text = await navigator.clipboard.readText();
      const code = normalizeOtpToken(text);
      if (code) onChange(code);
    } catch {
      // Clipboard access can be blocked; manual entry remains available.
    }
  }

  return (
    <div className="auth-otp-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-otp-row" dir="ltr">
        <input
          id={id}
          name={id}
          className="auth-otp-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={value}
          onChange={(event) => onChange(normalizeOtpToken(event.target.value))}
          onFocus={(event) => { if (event.currentTarget.value) event.currentTarget.select(); }}
          placeholder="123456"
          dir="ltr"
          lang="en"
          required
          autoFocus={autoFocus}
        />
        <button className="auth-paste-code" type="button" onClick={() => void pasteCode()}>{pasteLabel}</button>
      </div>
    </div>
  );
}
