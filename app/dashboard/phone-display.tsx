"use client";

import { useEffect } from "react";
import { formatIraqiMobile } from "@/lib/appointments";

export function PhoneDisplayFormatting() {
  useEffect(() => {
    document.querySelectorAll<HTMLElement>('bdi[dir="ltr"]').forEach((element) => {
      const raw = element.textContent?.trim();
      if (!raw) return;
      const formatted = formatIraqiMobile(raw);
      if (formatted !== raw) element.textContent = formatted;
    });
  }, []);

  return null;
}
