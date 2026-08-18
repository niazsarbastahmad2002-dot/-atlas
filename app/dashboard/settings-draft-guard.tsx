"use client";

import { useEffect } from "react";
import type { UiLocale } from "@/lib/i18n/ui";

const copy = {
  en: { changeName: "Change name" },
  ku: { changeName: "ناو بگۆڕە" },
  ar: { changeName: "تغيير الاسم" },
} as const;

export function SettingsDraftGuard({ locale }: { locale: UiLocale }) {
  useEffect(() => {
    const prepared = new WeakSet<HTMLInputElement>();

    const bind = (input: HTMLInputElement) => {
      if (prepared.has(input)) return;
      prepared.add(input);
      input.dataset.atlasCommittedValue = input.value;

      const form = input.form;
      const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (button) button.textContent = copy[locale].changeName;

      const syncDirty = () => {
        input.dataset.atlasDirty = String(input.value !== (input.dataset.atlasCommittedValue ?? ""));
      };

      input.addEventListener("input", syncDirty);
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        input.value = input.dataset.atlasCommittedValue ?? "";
        input.dataset.atlasDirty = "false";
        input.blur();
      });
      input.addEventListener("blur", () => {
        window.setTimeout(() => {
          if (input.dataset.atlasDirty !== "true") return;
          const active = document.activeElement;
          const isConfirming = Boolean(
            active
              && form?.contains(active)
              && active instanceof HTMLElement
              && active.matches('button[type="submit"], input[type="submit"]'),
          );
          if (isConfirming) return;

          // A typed name is only committed by the explicit Change name action.
          // If reception moves elsewhere, visibly return to the real saved value
          // so an uncommitted edit cannot look as though it succeeded.
          input.value = input.dataset.atlasCommittedValue ?? "";
          input.dataset.atlasDirty = "false";
        }, 0);
      });

      form?.addEventListener("submit", () => {
        input.dataset.atlasCommittedValue = input.value;
        input.dataset.atlasDirty = "false";
      });
    };

    const install = () => {
      const clinicName = document.querySelector<HTMLInputElement>('#clinic_name');
      if (clinicName) bind(clinicName);
      document.querySelectorAll<HTMLInputElement>('.doctor-name-form input[name="doctor_name"]').forEach(bind);
    };

    install();
    const observer = new MutationObserver(install);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [locale]);

  return null;
}
