"use client";

import { useEffect } from "react";

export function DashboardPreferenceMemory() {
  useEffect(() => {
    const clinicInput = document.querySelector<HTMLInputElement>('input[name="clinic_id"]');
    const doctorSelect = document.querySelector<HTMLSelectElement>("#doctor_id");
    const languageSelect = document.querySelector<HTMLSelectElement>("#reminder_language");
    const clinicId = clinicInput?.value;

    if (!clinicId || (!doctorSelect && !languageSelect)) return;

    const doctorKey = `atlas:last-doctor:${clinicId}`;
    const languageKey = `atlas:last-reminder-language:${clinicId}`;
    let restoredDoctor = false;

    if (doctorSelect) {
      const savedDoctor = window.localStorage.getItem(doctorKey);
      if (savedDoctor && Array.from(doctorSelect.options).some((option) => option.value === savedDoctor)) {
        doctorSelect.value = savedDoctor;
        restoredDoctor = true;
      }
    }

    if (languageSelect) {
      const savedLanguage = window.localStorage.getItem(languageKey);
      if (savedLanguage && Array.from(languageSelect.options).some((option) => option.value === savedLanguage)) {
        languageSelect.value = savedLanguage;
      }
    }

    const saveDoctor = () => {
      if (doctorSelect?.value) window.localStorage.setItem(doctorKey, doctorSelect.value);
    };
    const saveLanguage = () => {
      if (languageSelect?.value) window.localStorage.setItem(languageKey, languageSelect.value);
    };

    doctorSelect?.addEventListener("change", saveDoctor);
    languageSelect?.addEventListener("change", saveLanguage);

    if (restoredDoctor && doctorSelect) {
      window.setTimeout(() => doctorSelect.dispatchEvent(new Event("change")), 0);
    }

    return () => {
      doctorSelect?.removeEventListener("change", saveDoctor);
      languageSelect?.removeEventListener("change", saveLanguage);
    };
  }, []);

  return null;
}
