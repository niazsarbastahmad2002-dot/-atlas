"use client";

import { useEffect } from "react";
import { formatLeadTime, formatMinutes } from "@/lib/i18n/format";
import type { UiLocale } from "@/lib/i18n/ui";

const copy = {
  en: {
    remove: "Remove",
    removed: "Removed doctors",
    hideRemoved: "Hide removed doctors",
  },
  ku: {
    remove: "لابردن",
    removed: "پزیشکە لابراوەکان",
    hideRemoved: "پزیشکە لابراوەکان بشارەوە",
  },
  ar: {
    remove: "إزالة",
    removed: "الأطباء المُزالون",
    hideRemoved: "إخفاء الأطباء المُزالين",
  },
} as const;

export function SettingsClientPolish({ locale }: { locale: UiLocale }) {
  useEffect(() => {
    let frame = 0;

    const localizeSelectOptions = () => {
      const interval = document.querySelector<HTMLSelectElement>("#appointment_interval_minutes");
      if (interval) {
        for (const option of Array.from(interval.options)) {
          const minutes = Number(option.value);
          if (Number.isFinite(minutes)) option.textContent = formatMinutes(minutes, locale);
        }
      }

      const lead = document.querySelector<HTMLSelectElement>("#lead_minutes");
      if (lead) {
        for (const option of Array.from(lead.options)) {
          const minutes = Number(option.value);
          if (Number.isFinite(minutes)) option.textContent = formatLeadTime(minutes, locale);
        }
      }
    };

    const polishDoctors = () => {
      const list = document.querySelector<HTMLElement>(".doctor-settings-list");
      if (!list) return;

      const rows = Array.from(list.querySelectorAll<HTMLElement>(".doctor-settings-row"));
      const archived = rows.filter((row) => row.classList.contains("is-archived"));
      const active = rows.filter((row) => !row.classList.contains("is-archived"));

      for (const row of active) {
        const removeButton = row.querySelector<HTMLButtonElement>(".danger-link");
        if (removeButton) removeButton.textContent = copy[locale].remove;
      }

      for (const row of archived) row.hidden = true;

      const oldToggle = document.querySelector<HTMLButtonElement>("[data-atlas-removed-doctors]");
      if (archived.length === 0) {
        oldToggle?.remove();
        return;
      }

      const button = oldToggle ?? document.createElement("button");
      if (!oldToggle) {
        button.type = "button";
        button.className = "atlas-removed-doctors-toggle";
        button.dataset.atlasRemovedDoctors = "true";
        list.before(button);
      }

      const updateLabel = () => {
        const open = button.dataset.open === "true";
        button.textContent = open
          ? copy[locale].hideRemoved
          : `${copy[locale].removed} (${archived.length})`;
      };

      if (!button.dataset.bound) {
        button.dataset.bound = "true";
        button.addEventListener("click", () => {
          const open = button.dataset.open !== "true";
          button.dataset.open = String(open);
          for (const row of archived) row.hidden = !open;
          updateLabel();
        });
      }
      updateLabel();
    };

    const prepareFastSettings = () => {
      const reminderForm = document.querySelector<HTMLFormElement>("#lead_minutes")?.form;
      if (reminderForm && !reminderForm.dataset.atlasAutosave) {
        reminderForm.dataset.atlasAutosave = "true";
        for (const id of ["lead_minutes", "default_reminder_language", "enabled"]) {
          const control = reminderForm.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`);
          control?.addEventListener("change", () => reminderForm.requestSubmit());
        }
      }

      const list = document.querySelector<HTMLElement>(".doctor-settings-list");
      if (list && !list.dataset.atlasOptimisticArchive) {
        list.dataset.atlasOptimisticArchive = "true";
        list.addEventListener("submit", (event) => {
          const form = event.target as HTMLFormElement;
          const row = form.closest<HTMLElement>(".doctor-settings-row");
          const actions = row?.querySelector<HTMLElement>(".compact-actions");
          if (!row || !actions || !actions.contains(form)) return;
          const forms = Array.from(actions.querySelectorAll("form"));
          if (forms.at(-1) !== form) return;

          if (!row.classList.contains("is-archived")) {
            row.style.opacity = "0";
            row.style.transform = "translateY(-4px)";
            row.style.transition = "opacity 120ms ease, transform 120ms ease";
            window.setTimeout(() => { row.hidden = true; }, 120);
          }
        });
      }
    };

    const polish = () => {
      localizeSelectOptions();
      polishDoctors();
      prepareFastSettings();
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
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [locale]);

  return (
    <style jsx global>{`
      .atlas-removed-doctors-toggle {
        display: inline-flex;
        min-height: 38px;
        align-items: center;
        justify-content: center;
        margin: 12px 0 4px;
        border: 1px solid var(--line-strong);
        border-radius: 10px;
        padding: 8px 12px;
        background: var(--surface-soft);
        color: var(--ink-soft);
        font: inherit;
        font-size: 12px;
        font-weight: 750;
        cursor: pointer;
      }
      .calendar-weekdays {
        gap: 6px !important;
      }
      .calendar-weekdays span {
        min-width: 0;
        padding-inline: 1px !important;
        font-size: 8px !important;
        line-height: 1.15;
        white-space: nowrap;
      }
      .hour-grid {
        direction: ltr !important;
      }
    `}</style>
  );
}
