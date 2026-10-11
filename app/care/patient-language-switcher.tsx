"use client";

import { useState } from "react";
import type { UiLocale } from "@/lib/i18n/ui";

const languages: Record<UiLocale, string> = {
  ku: "سۆرانی",
  bd: "بادینی",
  ar: "العربية",
  en: "English",
};
const label: Record<UiLocale, string> = {
  ku: "زمان",
  bd: "زمان",
  ar: "اللغة",
  en: "Language",
};

export function PatientLanguageSwitcher({ locale }: { locale: UiLocale }) {
  const [busy, setBusy] = useState(false);

  async function change(next: UiLocale) {
    if (busy || next === locale) return;
    setBusy(true);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    try {
      await fetch("/api/ui-language", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
    } catch {
      // Explicit URL locale is authoritative even when the cookie update fails.
    }
    window.location.assign(url.toString());
  }

  return (
    <label className="atlas-patient-language" dir="auto">
      <span>{label[locale]}</span>
      <select
        aria-label={label[locale]}
        value={locale}
        disabled={busy}
        onChange={(event) => void change(event.target.value as UiLocale)}
      >
        {Object.entries(languages).map(([code, name]) => (
          <option key={code} value={code}>{name}</option>
        ))}
      </select>
    </label>
  );
}
