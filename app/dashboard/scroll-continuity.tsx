"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const storageKey = "atlas:dashboard-scroll";

type SavedScroll = {
  scheduleKey: string;
  y: number;
  at: number;
};

function scheduleContextKey(pathname: string, search: string) {
  const params = new URLSearchParams(search);
  return [
    pathname,
    params.get("clinic") ?? "",
    params.get("doctor") ?? "",
    params.get("day") ?? "",
  ].join("|");
}

export function DashboardScrollContinuity() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  useEffect(() => {
    function rememberScroll(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!form.closest(".app-shell")) return;
      if (form.dataset.resetScroll === "true") return;

      const saved: SavedScroll = {
        scheduleKey: scheduleContextKey(window.location.pathname, window.location.search),
        y: window.scrollY,
        at: Date.now(),
      };
      window.sessionStorage.setItem(storageKey, JSON.stringify(saved));
    }

    document.addEventListener("submit", rememberScroll, true);
    return () => document.removeEventListener("submit", rememberScroll, true);
  }, []);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return;

    let saved: SavedScroll;
    try {
      saved = JSON.parse(raw) as SavedScroll;
    } catch {
      window.sessionStorage.removeItem(storageKey);
      return;
    }

    const currentScheduleKey = scheduleContextKey(pathname, searchKey);
    // Keep scroll through save/error feedback redirects, but never carry it
    // between clinic, doctor, or day schedules that share /dashboard.
    if (
      saved.scheduleKey !== currentScheduleKey
      || Date.now() - saved.at > 15_000
    ) {
      window.sessionStorage.removeItem(storageKey);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: saved.y, left: 0, behavior: "instant" });
      window.sessionStorage.removeItem(storageKey);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, searchKey]);

  return null;
}
