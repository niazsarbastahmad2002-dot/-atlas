"use client";

import { useEffect } from "react";
import { localizeDigits, toAsciiDigits } from "@/lib/i18n/format";
import type { UiLocale } from "@/lib/i18n/ui";

function normalizeSoraniTimeText(value: string) {
  const ascii = toAsciiDigits(value);
  let next = value
    .replace(/ب\.ن/g, "پ.ن")
    .replace(/\bAM\b/g, "پ.ن")
    .replace(/\bPM\b/g, "د.ن");

  const clock = /(^|\s)0([1-9]):(\d{2})(?=\s|$)/.exec(ascii);
  if (clock) {
    const localized = localizeDigits(`${clock[2]}:${clock[3]}`, "ku");
    next = next.replace(/[٠0]([١-٩1-9]):([٠-٩0-9]{2})/, localized);
  }

  return next;
}

function normalizeHourButton(button: HTMLButtonElement, locale: UiLocale) {
  const value = toAsciiDigits(button.textContent ?? "").trim();
  const match = /^0?([1-9])$/.exec(value);
  if (!match) return;
  const next = localizeDigits(match[1], locale);
  if (button.textContent !== next) button.textContent = next;
}

function normalizeMinuteButton(button: HTMLButtonElement, locale: UiLocale) {
  const value = toAsciiDigits(button.textContent ?? "").trim();
  const match = /^0([0-9])$/.exec(value);
  if (!match) return;
  const next = localizeDigits(match[1], locale);
  if (button.textContent !== next) button.textContent = next;
}

export function AtlasTimePickerPolish({ locale }: { locale: UiLocale }) {
  useEffect(() => {
    if (locale !== "ku") return;

    let frame = 0;
    const polish = () => {
      document.querySelectorAll<HTMLButtonElement>(".atlas-hour-grid button").forEach((button) => normalizeHourButton(button, locale));
      document.querySelectorAll<HTMLButtonElement>(".atlas-minute-grid button").forEach((button) => normalizeMinuteButton(button, locale));
      document.querySelectorAll<HTMLElement>(".appointment-time-value, .atlas-selected-time strong").forEach((element) => {
        const current = element.textContent ?? "";
        const next = normalizeSoraniTimeText(current);
        if (next !== current) element.textContent = next;
      });
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        polish();
      });
    };

    polish();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [locale]);

  return (
    <style jsx global>{`
      .atlas-time-v2 button.is-selected::after {
        display: none !important;
      }
      .atlas-hour-grid button.is-selected,
      .atlas-minute-grid button.is-selected {
        border-color: var(--accent) !important;
        background: var(--accent) !important;
        color: #fff !important;
        box-shadow: 0 7px 18px rgba(8, 119, 90, .22) !important;
        font-weight: 900 !important;
        transform: translateY(-1px);
      }
      .atlas-period-tabs button.is-selected {
        border-color: rgba(8,119,90,.45) !important;
        background: #e3f6ef !important;
        color: var(--accent) !important;
        box-shadow: inset 0 0 0 1px rgba(8,119,90,.08), 0 4px 12px rgba(8,119,90,.09) !important;
        font-weight: 900 !important;
      }
    `}</style>
  );
}
