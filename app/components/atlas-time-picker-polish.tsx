"use client";

import { useEffect } from "react";
import { localizeDigits, toAsciiDigits } from "@/lib/i18n/format";
import type { UiLocale } from "@/lib/i18n/ui";

function normalizeTimeText(value: string, locale: UiLocale) {
  let next = value;

  if (locale === "ku") {
    next = next
      .replace(/ب\.ن/g, "پ.ن")
      .replace(/\bAM\b/g, "پ.ن")
      .replace(/\bPM\b/g, "د.ن");
  }

  // Human-facing 12-hour clocks should read 5:05, not 05:05.
  // Keep the underlying stored/input values zero-padded for correctness.
  return next.replace(/(^|[\s(])[٠0]([١-٩1-9])(?=:)/g, "$1$2");
}

function normalizePickerButton(button: HTMLButtonElement, locale: UiLocale) {
  const value = toAsciiDigits(button.textContent ?? "").trim();
  const match = /^0?([0-9])$/.exec(value);
  if (!match) return;
  const next = localizeDigits(match[1], locale);
  if (button.textContent !== next) button.textContent = next;
}

export function AtlasTimePickerPolish({ locale }: { locale: UiLocale }) {
  useEffect(() => {
    let frame = 0;
    const polish = () => {
      document
        .querySelectorAll<HTMLButtonElement>(
          ".atlas-hour-grid button, .atlas-minute-grid button, .fast-time-picker .hour-grid button, .fast-time-picker .minute-grid button",
        )
        .forEach((button) => normalizePickerButton(button, locale));

      document
        .querySelectorAll<HTMLElement>(
          ".appointment-time-value, .atlas-selected-time strong, .patient-time-value bdi, .edit-datetime-trigger > span:first-child, .edit-time-preview",
        )
        .forEach((element) => {
          const current = element.textContent ?? "";
          const next = normalizeTimeText(current, locale);
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
