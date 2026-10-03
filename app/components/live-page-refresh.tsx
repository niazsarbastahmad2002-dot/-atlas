"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { scheduleFormIsBusy } from "@/app/dashboard/schedule-form-busy";

function reserveSafariStallReload(now: number) {
  const key = "atlas:safari-stall-reload";
  try {
    const previous = Number(window.sessionStorage.getItem(key) ?? 0);
    if (now - previous < 60_000) return false;
    window.sessionStorage.setItem(key, String(now));
    return true;
  } catch {
    // Without storage Atlas cannot safely throttle full-page recovery reloads.
    return false;
  }
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
      const loading = document.querySelector('main[aria-busy="true"][data-atlas-loading="schedule"]');
      if (!loading) return;
      if (!reserveSafariStallReload(Date.now())) return;
      window.location.reload();
    }, 8_000);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
