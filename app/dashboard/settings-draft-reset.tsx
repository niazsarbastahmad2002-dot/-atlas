"use client";

import { useEffect } from "react";
import type { UiLocale } from "@/lib/i18n/ui";

const copy = {
  en: "Change name",
  ku: "ناو بگۆڕە",
  bd: "ناڤ بگۆڕە",
  ar: "تغيير الاسم",
} as const;

function isNameInput(target: EventTarget | null): target is HTMLInputElement {
  return target instanceof HTMLInputElement
    && (target.id === "clinic_name" || (target.name === "doctor_name" && target.closest(".doctor-name-form") !== null));
}

export function SettingsDraftReset({ locale }: { locale: UiLocale }) {
  useEffect(() => {
    const committed = new WeakMap<HTMLInputElement, string>();
    let confirmingForm: HTMLFormElement | null = null;

    const prepare = (input: HTMLInputElement) => {
      if (!committed.has(input)) committed.set(input, input.value);
      const button = input.form?.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (button) button.textContent = copy[locale];
    };

    const onFocusIn = (event: FocusEvent) => {
      if (isNameInput(event.target)) prepare(event.target);
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest<HTMLButtonElement>('button[type="submit"]');
      confirmingForm = button?.form ?? null;
      window.setTimeout(() => { confirmingForm = null; }, 0);
    };

    const onFocusOut = (event: FocusEvent) => {
      if (!isNameInput(event.target)) return;
      const input = event.target;
      prepare(input);
      if (input.form && input.form === confirmingForm) return;
      const saved = committed.get(input);
      if (saved !== undefined && input.value !== saved) input.value = saved;
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form) return;
      const input = form.querySelector<HTMLInputElement>('input#clinic_name, input[name="doctor_name"]');
      if (input && isNameInput(input)) committed.set(input, input.value);
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("submit", onSubmit, true);

    document.querySelectorAll<HTMLInputElement>('#clinic_name, .doctor-name-form input[name="doctor_name"]').forEach(prepare);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [locale]);

  return null;
}
