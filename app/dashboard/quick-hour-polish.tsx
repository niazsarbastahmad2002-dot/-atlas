"use client";

import { useEffect } from "react";
import { toAsciiDigits } from "@/lib/i18n/format";

const quickAmHours = new Set(["08", "09", "10", "11"]);

function hourValue(button: HTMLButtonElement) {
  return toAsciiDigits(button.textContent ?? "").replace(/\D/g, "").padStart(2, "0");
}

export function QuickHourPolish() {
  useEffect(() => {
    let frame = 0;
    let correcting = false;

    const polish = () => {
      const picker = document.querySelector<HTMLElement>(".fast-time-picker");
      if (!picker) return;

      const periodButtons = Array.from(
        picker.querySelectorAll<HTMLButtonElement>(".period-toggle button"),
      );
      const hourButtons = Array.from(
        picker.querySelectorAll<HTMLButtonElement>(".hour-grid button"),
      );
      if (periodButtons.length < 2 || hourButtons.length === 0) return;

      const amButton = periodButtons[0];
      const pmButton = periodButtons[1];
      const amSelected = amButton.classList.contains("is-selected");

      if (!amSelected) {
        for (const button of hourButtons) {
          if (button.hidden) button.hidden = false;
        }
        return;
      }

      let firstAvailable: HTMLButtonElement | null = null;
      let selectedAllowed = false;

      for (const button of hourButtons) {
        const allowed = quickAmHours.has(hourValue(button));
        if (button.hidden === allowed) button.hidden = !allowed;
        if (!allowed) continue;
        if (!button.disabled && !firstAvailable) firstAvailable = button;
        if (!button.disabled && button.classList.contains("is-selected")) selectedAllowed = true;
      }

      if (selectedAllowed || correcting) return;

      correcting = true;
      if (firstAvailable) {
        firstAvailable.click();
      } else if (!pmButton.disabled) {
        pmButton.click();
      }
      window.requestAnimationFrame(() => {
        correcting = false;
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
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "disabled"],
    });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
