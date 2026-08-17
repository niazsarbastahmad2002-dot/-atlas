"use client";

import { useEffect } from "react";
import { formatLeadTime, formatMinutes, toAsciiDigits } from "@/lib/i18n/format";
import type { UiLocale } from "@/lib/i18n/ui";

const copy = {
  en: {
    remove: "Remove",
    removed: "Removed doctors",
    hideRemoved: "Hide removed doctors",
    moveUp: "Move up",
    moveDown: "Move down",
  },
  ku: {
    remove: "لابردن",
    removed: "پزیشکە لابراوەکان",
    hideRemoved: "پزیشکە لابراوەکان بشارەوە",
    moveUp: "بەرەو سەرەوە",
    moveDown: "بەرەو خوارەوە",
  },
  ar: {
    remove: "إزالة",
    removed: "الأطباء المُزالون",
    hideRemoved: "إخفاء الأطباء المُزالين",
    moveUp: "لأعلى",
    moveDown: "لأسفل",
  },
} as const;

const reminderLanguageCopy = {
  en: { ku: "Kurdish (Sorani)", ar: "Arabic", en: "English" },
  ku: { ku: "کوردی (سۆرانی)", ar: "عەرەبی", en: "ئینگلیزی" },
  ar: { ku: "الكردية (السورانية)", ar: "العربية", en: "الإنجليزية" },
} as const;

function setOptionText(option: HTMLOptionElement, next: string) {
  if (option.textContent !== next) option.textContent = next;
}

export function SettingsClientPolish({ locale }: { locale: UiLocale }) {
  useEffect(() => {
    let frame = 0;
    let defaultHourTimer = 0;

    const localizeSelectOptions = () => {
      const interval = document.querySelector<HTMLSelectElement>("#appointment_interval_minutes");
      if (interval) {
        for (const option of Array.from(interval.options)) {
          const minutes = Number(option.value);
          if (Number.isFinite(minutes)) setOptionText(option, formatMinutes(minutes, locale));
        }
      }

      const lead = document.querySelector<HTMLSelectElement>("#lead_minutes");
      if (lead) {
        for (const option of Array.from(lead.options)) {
          const minutes = Number(option.value);
          if (Number.isFinite(minutes)) setOptionText(option, formatLeadTime(minutes, locale));
        }
      }

      const reminderSelects = document.querySelectorAll<HTMLSelectElement>(
        'select[name="reminder_language"], select[name="default_reminder_language"]',
      );
      for (const select of Array.from(reminderSelects)) {
        for (const option of Array.from(select.options)) {
          const value = option.value as keyof typeof reminderLanguageCopy.en;
          const label = reminderLanguageCopy[locale][value];
          if (label) setOptionText(option, label);
        }
      }
    };

    const activeDoctorRows = (list: HTMLElement) => Array.from(
      list.querySelectorAll<HTMLElement>(".doctor-settings-row:not(.is-archived)"),
    );

    const syncMoveControls = (list: HTMLElement) => {
      const rows = activeDoctorRows(list);
      rows.forEach((row, index) => {
        const buttons = Array.from(row.querySelectorAll<HTMLButtonElement>(".compact-actions button"));
        for (const button of buttons) {
          const label = button.textContent?.trim();
          if (label === copy[locale].moveUp) {
            const unavailable = index === 0;
            button.disabled = unavailable;
            if (button.form) button.form.hidden = unavailable;
          } else if (label === copy[locale].moveDown) {
            const unavailable = index === rows.length - 1;
            button.disabled = unavailable;
            if (button.form) button.form.hidden = unavailable;
          }
        }
      });
    };

    const polishDoctors = () => {
      const list = document.querySelector<HTMLElement>(".doctor-settings-list");
      if (!list) return;

      const rows = Array.from(list.querySelectorAll<HTMLElement>(".doctor-settings-row"));
      const archived = rows.filter((row) => row.classList.contains("is-archived"));
      const active = rows.filter((row) => !row.classList.contains("is-archived"));

      for (const row of active) {
        const removeButton = row.querySelector<HTMLButtonElement>(".danger-link");
        if (removeButton && removeButton.textContent !== copy[locale].remove) {
          removeButton.textContent = copy[locale].remove;
        }
      }

      for (const row of archived) row.hidden = true;
      syncMoveControls(list);

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
        const next = open
          ? copy[locale].hideRemoved
          : `${copy[locale].removed} (${archived.length})`;
        if (button.textContent !== next) button.textContent = next;
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

    const selectOneOClock = () => {
      const doctor = document.querySelector<HTMLSelectElement>("#doctor_id");
      const root = document.querySelector<HTMLElement>(".localized-time-field");
      if (!doctor?.value || !root || root.querySelector(".custom-time-card")) return;

      const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>(".hour-grid button"));
      if (!buttons.length) return;
      const one = buttons.find((button) => {
        const digits = toAsciiDigits(button.textContent ?? "").replace(/\D/g, "");
        return digits === "01" && !button.disabled;
      });
      if (!one) return;

      const dateText = root.querySelector<HTMLElement>(".localized-field-trigger span")?.textContent ?? "";
      const key = `${doctor.value}|${dateText}`;
      if (!dateText || root.dataset.atlasDefaultHourKey === key) return;
      root.dataset.atlasDefaultHourKey = key;
      if (!one.classList.contains("is-selected")) one.click();
    };

    const queueOneOClock = () => {
      window.clearTimeout(defaultHourTimer);
      defaultHourTimer = window.setTimeout(selectOneOClock, 35);
    };

    const prepareLanguageApply = () => {
      const select = document.querySelector<HTMLSelectElement>("#locale");
      if (!select || select.dataset.atlasManualApply) return;
      select.dataset.atlasManualApply = "true";

      select.addEventListener("change", (event) => {
        event.stopImmediatePropagation();
      }, true);

      select.form?.addEventListener("submit", () => {
        const value = select.value as UiLocale;
        document.documentElement.lang = value === "ku" ? "ckb" : value;
        document.documentElement.dir = value === "en" ? "ltr" : "rtl";
      });
    };

    const prepareFastSettings = () => {
      prepareLanguageApply();

      const leadControl = document.querySelector<HTMLSelectElement>("#lead_minutes");
      const reminderForm = leadControl?.form ?? null;
      if (reminderForm && !reminderForm.dataset.atlasAutosave) {
        reminderForm.dataset.atlasAutosave = "true";
        for (const id of ["lead_minutes", "default_reminder_language", "enabled"]) {
          const control = reminderForm.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement | null;
          control?.addEventListener("change", () => reminderForm.requestSubmit());
        }
      }

      const doctor = document.querySelector<HTMLSelectElement>("#doctor_id");
      if (doctor && !doctor.dataset.atlasDefaultHourBound) {
        doctor.dataset.atlasDefaultHourBound = "true";
        doctor.addEventListener("change", () => {
          const root = document.querySelector<HTMLElement>(".localized-time-field");
          if (root) delete root.dataset.atlasDefaultHourKey;
          queueOneOClock();
        });
        queueOneOClock();
      }

      const calendar = document.querySelector<HTMLElement>(".calendar-grid");
      if (calendar && !calendar.dataset.atlasDefaultHourBound) {
        calendar.dataset.atlasDefaultHourBound = "true";
        calendar.addEventListener("click", () => {
          const root = document.querySelector<HTMLElement>(".localized-time-field");
          if (root) delete root.dataset.atlasDefaultHourKey;
          queueOneOClock();
        });
      }

      const list = document.querySelector<HTMLElement>(".doctor-settings-list");
      if (list && !list.dataset.atlasOptimisticActions) {
        list.dataset.atlasOptimisticActions = "true";
        list.addEventListener("submit", (event) => {
          const form = event.target as HTMLFormElement;
          const row = form.closest(".doctor-settings-row") as HTMLElement | null;
          const actions = row?.querySelector(".compact-actions") as HTMLElement | null;
          if (!row || !actions || !actions.contains(form)) return;

          const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
          const label = button?.textContent?.trim();
          if (!button || !label) return;

          if (label === copy[locale].moveUp || label === copy[locale].moveDown) {
            const rows = activeDoctorRows(list);
            const index = rows.indexOf(row);
            if (index < 0) return;

            if (label === copy[locale].moveUp && index > 0) {
              list.insertBefore(row, rows[index - 1]);
            } else if (label === copy[locale].moveDown && index < rows.length - 1) {
              rows[index + 1].after(row);
            }
            syncMoveControls(list);
            return;
          }

          if (button.classList.contains("danger-link") && !row.classList.contains("is-archived")) {
            row.style.opacity = "0";
            row.style.transform = "translateY(-4px)";
            row.style.transition = "opacity 120ms ease, transform 120ms ease";
            window.setTimeout(() => {
              row.hidden = true;
              syncMoveControls(list);
            }, 120);
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
    queueOneOClock();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(defaultHourTimer);
    };
  }, [locale]);

  const timeDirection = locale === "en" ? "ltr" : "rtl";

  return (
    <style jsx global>{`
      .atlas-removed-doctors-toggle {
        display: inline-flex;
        min-height: 42px;
        align-items: center;
        justify-content: center;
        margin: 12px 0 4px;
        border: 1px solid var(--line-strong);
        border-radius: 10px;
        padding: 9px 14px;
        background: var(--surface-soft);
        color: var(--ink-soft);
        font: inherit;
        font-size: 12px;
        font-weight: 750;
        cursor: pointer;
        touch-action: manipulation;
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
      .hour-grid,
      .minute-grid {
        direction: ${timeDirection} !important;
      }
      .compact-actions {
        gap: 6px !important;
        align-items: center;
      }
      .compact-actions form[hidden] {
        display: none !important;
      }
      .compact-actions button {
        min-height: 38px !important;
        min-width: 64px;
        padding: 8px 10px !important;
        border-radius: 9px !important;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }
      .settings-card-accent .settings-form-inline .button {
        min-height: 48px;
        padding-inline: 18px;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }
    `}</style>
  );
}
