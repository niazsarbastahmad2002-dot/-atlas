"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const storageKey = "atlas:dashboard-scroll";

type SavedScroll = {
  path: string;
  search: string;
  y: number;
  at: number;
};

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
        path: window.location.pathname,
        search: window.location.search,
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

    const currentSearch = searchKey ? `?${searchKey}` : "";
    // Only restore a recent submission in the exact same schedule context.
    // A doctor/day/clinic change shares the /dashboard pathname but must land
    // naturally instead of inheriting the previous schedule's scroll position.
    if (
      saved.path !== pathname
      || saved.search !== currentSearch
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
