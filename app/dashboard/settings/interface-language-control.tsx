"use client";

import { useState } from "react";
import { isUiLocale, uiLocaleMeta, type UiLocale } from "@/lib/i18n/ui";

const failureCopy: Record<UiLocale, string> = {
  en: "Atlas could not change the language. Try again.",
  ku: "Atlas نەیتوانی زمانەکە بگۆڕێت. دووبارە هەوڵ بدەرەوە.",
  bd: "Atlas نەشیا زمانێ بگۆڕیت. جارەکا دی هەول بدە.",
  ar: "تعذر على Atlas تغيير اللغة. حاول مرة أخرى.",
};

type InterfaceLanguageControlProps = {
  locale: UiLocale;
  label: string;
  savingLabel: string;
  applyLabel: string;
};

export function InterfaceLanguageControl({
  locale,
  label,
  savingLabel,
  applyLabel,
}: InterfaceLanguageControlProps) {
  const [selected, setSelected] = useState<UiLocale>(locale);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applyLanguage(nextLocale: UiLocale) {
    if (pending) return;
    setError(null);
    if (nextLocale === locale) return;

    setPending(true);
    try {
      const response = await fetch("/api/ui-language", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ locale: nextLocale }),
      });
      if (!response.ok) throw new Error("language_update_failed");
      window.location.reload();
    } catch {
      setPending(false);
      setError(failureCopy[locale]);
    }
  }

  return (
    <>
      <div className="settings-form settings-form-inline">
        <label className="sr-only" htmlFor="locale">{label}</label>
        <select
          id="locale"
          name="locale"
          value={selected}
          disabled={pending}
          onChange={(event) => {
            const nextLocale = event.currentTarget.value;
            if (!isUiLocale(nextLocale)) return;
            setSelected(nextLocale);
            void applyLanguage(nextLocale);
          }}
        >
          {Object.entries(uiLocaleMeta).map(([value, meta]) => (
            <option value={value} key={value}>{meta.nativeLabel}</option>
          ))}
        </select>
        <button
          className="button"
          type="button"
          disabled={pending || selected === locale}
          onClick={() => void applyLanguage(selected)}
        >
          {pending ? savingLabel : applyLabel}
        </button>
      </div>
      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
    </>
  );
}
