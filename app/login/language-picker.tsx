"use client";

import { useState } from "react";
import { trackAtlasEvent } from "@/lib/analytics/client";
import type { UiLocale } from "@/lib/i18n/ui";

const choices: Array<{ value: UiLocale; label: string; detail: string }> = [
  { value: "ku", label: "کوردی", detail: "سۆرانی" },
  { value: "bd", label: "کوردی", detail: "بادینی" },
  { value: "ar", label: "العربية", detail: "العراقي" },
  { value: "en", label: "English", detail: "English" },
];

export function LoginLanguagePicker({ locale }: { locale: UiLocale }) {
  const [busy, setBusy] = useState(false);

  async function choose(value: UiLocale) {
    if (busy || value === locale) return;
    setBusy(true);
    try {
      const response = await fetch("/api/ui-language", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: value }),
      });
      trackAtlasEvent("atlas_login_language_changed", {
        locale: value,
        outcome: response.ok ? "success" : "failure",
        interaction: "form",
      });
      const url = new URL(window.location.href);
      url.searchParams.set("lang", value);
      window.location.assign(url.toString());
    } catch {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", value);
      window.location.assign(url.toString());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-language-picker" aria-label="Choose language">
      {choices.map((choice) => (
        <button
          type="button"
          key={choice.value}
          className={choice.value === locale ? "is-active" : ""}
          aria-pressed={choice.value === locale}
          disabled={busy}
          onClick={() => void choose(choice.value)}
        >
          <strong>{choice.label}</strong>
          <span>{choice.detail}</span>
        </button>
      ))}
    </div>
  );
}
