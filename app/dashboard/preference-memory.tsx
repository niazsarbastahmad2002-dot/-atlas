"use client";

import { useEffect } from "react";

export function DashboardPreferenceMemory() {
  useEffect(() => {
    const clinicInput = document.querySelector<HTMLInputElement>('input[name="clinic_id"]');
    const languageSelect = document.querySelector<HTMLSelectElement>("#reminder_language");
    const clinicId = clinicInput?.value;

    if (!clinicId || !languageSelect) return;

    // Doctor selection belongs to the schedule itself. Remembering a separate
    // form doctor could make reception view Dr A while silently creating a
    // patient under Dr B. Only the patient's reminder-language preference is
    // safe to remember independently.
    const languageKey = `atlas:last-reminder-language:${clinicId}`;
    const savedLanguage = window.localStorage.getItem(languageKey);
    if (savedLanguage && Array.from(languageSelect.options).some((option) => option.value === savedLanguage)) {
      languageSelect.value = savedLanguage;
    }

    const saveLanguage = () => {
      if (languageSelect.value) window.localStorage.setItem(languageKey, languageSelect.value);
    };

    languageSelect.addEventListener("change", saveLanguage);
    return () => languageSelect.removeEventListener("change", saveLanguage);
  }, []);

  return null;
}
