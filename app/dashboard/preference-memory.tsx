"use client";

import { useEffect } from "react";

function clinicIdFor(select: HTMLSelectElement) {
  return select.form?.querySelector<HTMLInputElement>('input[name="clinic_id"]')?.value ?? "";
}

export function DashboardPreferenceMemory() {
  useEffect(() => {
    const applySavedLanguage = (languageSelect: HTMLSelectElement) => {
      const clinicId = clinicIdFor(languageSelect);
      if (!clinicId) return;

      // Doctor selection belongs to the schedule itself. Remembering a separate
      // form doctor could make reception view Dr A while silently creating a
      // patient under Dr B. Only the patient's reminder-language preference is
      // safe to remember independently.
      const languageKey = `atlas:last-reminder-language:${clinicId}`;
      const savedLanguage = window.localStorage.getItem(languageKey);
      if (savedLanguage && Array.from(languageSelect.options).some((option) => option.value === savedLanguage)) {
        languageSelect.value = savedLanguage;
      }
    };

    const prepare = () => {
      document.querySelectorAll<HTMLSelectElement>('select#reminder_language').forEach(applySavedLanguage);
    };

    const saveLanguage = (event: Event) => {
      const languageSelect = event.target;
      if (!(languageSelect instanceof HTMLSelectElement) || languageSelect.id !== "reminder_language") return;
      const clinicId = clinicIdFor(languageSelect);
      if (!clinicId || !languageSelect.value) return;
      window.localStorage.setItem(`atlas:last-reminder-language:${clinicId}`, languageSelect.value);
    };

    prepare();
    document.addEventListener("change", saveLanguage);

    const root = document.querySelector(".app-content") ?? document.body;
    const observer = new MutationObserver(prepare);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["value"],
    });

    return () => {
      observer.disconnect();
      document.removeEventListener("change", saveLanguage);
    };
  }, []);

  return null;
}
