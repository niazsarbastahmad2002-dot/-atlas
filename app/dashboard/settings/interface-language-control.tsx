"use client";

import { useEffect, useState } from "react";
import { isUiLocale, uiLocaleMeta, type UiLocale } from "@/lib/i18n/ui";
import { isUiTheme, type UiTheme } from "@/lib/i18n/ui-theme";

const failureCopy: Record<UiLocale, string> = {
  en: "Atlas could not change the language. Try again.",
  ku: "Atlas نەیتوانی زمانەکە بگۆڕێت. دووبارە هەوڵ بدەرەوە.",
  bd: "Atlas نەشیا زمانێ بگۆڕیت. جارەکا دی هەول بدە.",
  ar: "تعذر على Atlas تغيير اللغة. حاول مرة أخرى.",
};

const appearanceCopy: Record<UiLocale, {
  label: string;
  help: string;
  light: string;
  dark: string;
  system: string;
  failure: string;
}> = {
  en: {
    label: "Appearance",
    help: "Choose how Atlas looks on this device. Light overrides browser-forced dark mode.",
    light: "Light",
    dark: "Dark",
    system: "System",
    failure: "Atlas could not change the appearance. Try again.",
  },
  ku: {
    label: "ڕووکار",
    help: "ڕووکاری Atlas لەم ئامێرە هەڵبژێرە. ڕووناک ڕەنگی تاریکی زۆرەملێکراوی وێبگەڕ دەوەستێنێت.",
    light: "ڕووناک",
    dark: "تاریک",
    system: "بەپێی ئامێر",
    failure: "Atlas نەیتوانی ڕووکارەکە بگۆڕێت. دووبارە هەوڵ بدەرەوە.",
  },
  bd: {
    label: "ڕووکار",
    help: "ڕووکاری Atlas ل سەر ڤی ئامێری هەلبژێرە. ڕووناک تاریکیا زۆرەملێکری یا وێبگەڕی راوەستینیت.",
    light: "ڕووناک",
    dark: "تاریک",
    system: "ب گۆرەی ئامێری",
    failure: "Atlas نەشیا ڕووکارێ بگۆڕیت. جارەکا دی هەول بدە.",
  },
  ar: {
    label: "المظهر",
    help: "اختر شكل Atlas على هذا الجهاز. الوضع الفاتح يلغي التعتيم الإجباري من المتصفح.",
    light: "فاتح",
    dark: "داكن",
    system: "حسب الجهاز",
    failure: "تعذر على Atlas تغيير المظهر. حاول مرة أخرى.",
  },
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
  const [theme, setTheme] = useState<UiTheme>("light");
  const [themePending, setThemePending] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);
  const appearance = appearanceCopy[locale];

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (isUiTheme(current)) setTheme(current);
  }, []);

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

  async function applyTheme(nextTheme: UiTheme) {
    if (themePending) return;
    setThemeError(null);
    setThemePending(true);
    try {
      const response = await fetch("/api/ui-theme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ theme: nextTheme }),
      });
      if (!response.ok) throw new Error("theme_update_failed");
      document.documentElement.dataset.theme = nextTheme;
      setTheme(nextTheme);
      window.location.reload();
    } catch {
      setThemePending(false);
      setThemeError(appearance.failure);
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

      <div className="settings-form atlas-appearance-control">
        <div>
          <label htmlFor="atlas-theme"><strong>{appearance.label}</strong></label>
          <p className="field-help">{appearance.help}</p>
        </div>
        <select
          id="atlas-theme"
          name="atlas-theme"
          value={theme}
          disabled={themePending}
          onChange={(event) => {
            const nextTheme = event.currentTarget.value;
            if (!isUiTheme(nextTheme)) return;
            setTheme(nextTheme);
            void applyTheme(nextTheme);
          }}
        >
          <option value="light">{appearance.light}</option>
          <option value="dark">{appearance.dark}</option>
          <option value="system">{appearance.system}</option>
        </select>
      </div>
      {themeError ? <p className="notice notice-error" role="alert">{themeError}</p> : null}
    </>
  );
}
