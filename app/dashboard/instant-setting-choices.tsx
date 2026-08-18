"use client";

import { useLayoutEffect } from "react";
import type { UiLocale } from "@/lib/i18n/ui";

export function InstantSettingChoices() {
  useLayoutEffect(() => {
    const prepared = new WeakSet<HTMLSelectElement>();

    const bind = (select: HTMLSelectElement, kind: "locale" | "interval" | "role") => {
      if (prepared.has(select)) return;
      prepared.add(select);

      select.addEventListener("change", (event) => {
        // These are direct choices: the selected value is the confirmation.
        // Handle the change before older enhancement listeners can turn it
        // back into a two-step Apply/Save interaction.
        event.stopImmediatePropagation();

        if (kind === "locale") {
          const value = select.value as UiLocale;
          document.documentElement.lang = value === "ku" ? "ckb" : value;
          document.documentElement.dir = value === "en" ? "ltr" : "rtl";
        }

        select.form?.requestSubmit();
      }, true);
    };

    const install = () => {
      const locale = document.querySelector<HTMLSelectElement>("#locale");
      if (locale) bind(locale, "locale");

      const interval = document.querySelector<HTMLSelectElement>("#appointment_interval_minutes");
      if (interval) bind(interval, "interval");

      document.querySelectorAll<HTMLSelectElement>(".staff-role-actions select[name='role']")
        .forEach((select) => bind(select, "role"));
    };

    install();
    const observer = new MutationObserver(install);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
