"use client";

import { useEffect } from "react";

export function DashboardPreferenceMemory() {
  useEffect(() => {
    let activeSelect: HTMLSelectElement | null = null;
    let activeKey: string | null = null;
    let saveLanguage: (() => void) | null = null;
    let prepareFrame = 0;

    const detach = () => {
      if (activeSelect && saveLanguage) activeSelect.removeEventListener("change", saveLanguage);
      activeSelect = null;
      activeKey = null;
      saveLanguage = null;
    };

    const prepare = () => {
      prepareFrame = 0;
      const clinicInput = document.querySelector<HTMLInputElement>('input[name="clinic_id"]');
      const nextSelect = document.querySelector<HTMLSelectElement>("#reminder_language");
      const clinicId = clinicInput?.value;

      if (!clinicId || !nextSelect) {
        detach();
        return;
      }

      // Doctor selection belongs to the schedule itself. Remembering a separate
      // form doctor could make reception view Dr A while silently creating a
      // patient under Dr B. Only the patient's reminder-language preference is
      // safe to remember independently.
      const languageKey = `atlas:last-reminder-language:${clinicId}`;
      if (activeSelect === nextSelect && activeKey === languageKey) return;

      detach();
      activeSelect = nextSelect;
      activeKey = languageKey;

      try {
        const savedLanguage = window.localStorage.getItem(languageKey);
        if (savedLanguage && Array.from(nextSelect.options).some((option) => option.value === savedLanguage)) {
          nextSelect.value = savedLanguage;
        }
      } catch {
        // Storage can be unavailable in restrictive/private browser contexts.
        // Appointment entry must remain usable without preference memory.
      }

      saveLanguage = () => {
        if (!nextSelect.value) return;
        try {
          window.localStorage.setItem(languageKey, nextSelect.value);
        } catch {
          // Preference memory is optional; never block appointment entry.
        }
      };
      nextSelect.addEventListener("change", saveLanguage);
    };

    const schedulePrepare = () => {
      if (prepareFrame) return;
      prepareFrame = window.requestAnimationFrame(prepare);
    };

    prepare();
    const root = document.querySelector(".app-content") ?? document.body;
    const observer = new MutationObserver(schedulePrepare);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (prepareFrame) window.cancelAnimationFrame(prepareFrame);
      detach();
    };
  }, []);

  return null;
}
