"use client";

import { useEffect } from "react";

function plainPrimaryClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function sameTopResetDestination(anchor: HTMLAnchorElement) {
  const currentPath = window.location.pathname;
  if (currentPath !== "/dashboard" && currentPath !== "/dashboard/settings") return null;

  const destination = new URL(anchor.href, window.location.origin);
  if (destination.hash || destination.pathname !== currentPath) return null;
  if (destination.search !== window.location.search) return null;

  return currentPath === "/dashboard" ? "schedule" : "settings";
}

export function ScheduleNavigationReset() {
  useEffect(() => {
    const handleActiveDestinationTap = (event: MouseEvent) => {
      if (!plainPrimaryClick(event)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>(
        ".app-top-actions a, .app-bottom-nav a, .app-brand",
      );
      if (!anchor || !sameTopResetDestination(anchor)) return;

      const destination = new URL(anchor.href, window.location.origin);
      event.preventDefault();
      event.stopImmediatePropagation();
      window.history.replaceState(
        window.history.state,
        "",
        `${destination.pathname}${destination.search}`,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    document.addEventListener("click", handleActiveDestinationTap, true);
    return () => document.removeEventListener("click", handleActiveDestinationTap, true);
  }, []);

  return null;
}
