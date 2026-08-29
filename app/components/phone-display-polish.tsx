"use client";

import { useEffect } from "react";
import { formatPhoneForDisplay } from "@/lib/phone-display";

/** Keeps legacy/raw account-phone text visually consistent without observing/re-writing the DOM continuously. */
export function PhoneDisplayPolish() {
  useEffect(() => {
    document.querySelectorAll<HTMLElement>(".account-email").forEach((node) => {
      const value = node.textContent?.trim();
      if (!value || !/^\+?\d[\d\s-]+$/.test(value)) return;

      const formatted = formatPhoneForDisplay(value);
      if (formatted !== value) node.textContent = formatted;
      node.classList.add("atlas-phone-display");
      node.setAttribute("dir", "ltr");
    });
  }, []);

  return null;
}
