"use client";

import { useEffect } from "react";
import { formatPhoneForDisplay } from "@/lib/phone-display";

/** Keeps legacy/raw account-phone text visually consistent until all server surfaces use the formatter. */
export function PhoneDisplayPolish() {
  useEffect(() => {
    const format = () => {
      document.querySelectorAll<HTMLElement>(".account-email").forEach((node) => {
        const value = node.textContent?.trim();
        if (!value || !/^\+?\d[\d\s-]+$/.test(value)) return;
        node.textContent = formatPhoneForDisplay(value);
        node.classList.add("atlas-phone-display");
        node.setAttribute("dir", "ltr");
      });
    };

    format();
    const observer = new MutationObserver(format);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
