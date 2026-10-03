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
      let timer: number | null = null;
      const stop = () => {
        if (timer === null) return;
        window.clearInterval(timer);
        timer = null;
      };
      const start = () => {
        if (document.visibilityState !== "visible" || timer !== null) return;
        timer = window.setInterval(() => router.refresh(), 15_000);
      };
      const onVisibilityChange = () => {
        if (document.visibilityState !== "visible") {
          stop();
          return;
        }
        router.refresh();
        start();
      };

      start();
      document.addEventListener("visibilitychange", onVisibilityChange);
      return () => {
        stop();
        document.removeEventListener("visibilitychange", onVisibilityChange);
      };
    }

    if (pathname !== "/dashboard") return;
    const refresh = () => {
      if (document.visibilityState !== "visible" || scheduleFormIsBusy()) return;
      router.refresh();
    };
    let timer: number | null = null;
    const stop = () => {
      if (timer === null) return;
      window.clearInterval(timer);
      timer = null;
    };
    const start = () => {
      if (document.visibilityState !== "visible" || timer !== null) return;
      timer = window.setInterval(refresh, 12_000);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        stop();
        return;
      }
      refresh();
      start();
    };

    start();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pathname, router]);

  useEffect(() => {
    if (pathname !== "/dashboard") return;

    let timer: number | null = null;
    const stop = () => {
      if (timer === null) return;
      window.clearTimeout(timer);
      timer = null;
    };
    const checkStall = () => {
      timer = null;
      if (document.visibilityState !== "visible") return;
      const loading = document.querySelector('main[aria-busy="true"][data-atlas-loading="schedule"]');
      if (!loading) return;
      if (!reserveSafariStallReload(Date.now())) return;
      window.location.reload();
    };
    const schedule = () => {
      if (document.visibilityState !== "visible" || timer !== null) return;
      timer = window.setTimeout(checkStall, 8_000);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        stop();
        return;
      }
      schedule();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pathname]);

  return null;
}
