"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

function scheduleFormIsBusy() {
  const form = document.querySelector<HTMLFormElement>("form.appointment-form");
  if (!form) return false;
  const name = form.querySelector<HTMLInputElement>('input[name="patient_name"]')?.value.trim();
  const phone = form.querySelector<HTMLInputElement>('input[name="patient_phone"]')?.value.trim();
  const active = document.activeElement;
  return Boolean(name || phone || (active instanceof HTMLInputElement && form.contains(active)) || form.querySelector("[data-atlas-editor-open='true']"));
}

export function LivePageRefresh() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname.startsWith("/patient/")) {
      const timer = window.setInterval(() => {
        if (document.visibilityState === "visible") router.refresh();
      }, 15_000);
      return () => window.clearInterval(timer);
    }

    if (pathname !== "/dashboard") return;
    const refresh = () => {
      if (document.visibilityState !== "visible" || scheduleFormIsBusy()) return;
      router.refresh();
    };
    const timer = window.setInterval(refresh, 12_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [pathname, router]);

  useEffect(() => {
    if (pathname !== "/dashboard") return;
    const timer = window.setTimeout(() => {
      const loading = document.querySelector('main[aria-busy="true"][aria-label="Loading schedule"]');
      if (!loading) return;
      const key = "atlas:safari-stall-reload";
      const now = Date.now();
      const previous = Number(sessionStorage.getItem(key) ?? 0);
      if (now - previous < 60_000) return;
      sessionStorage.setItem(key, String(now));
      window.location.reload();
    }, 8_000);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
