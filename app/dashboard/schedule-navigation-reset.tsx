"use client";

import { useEffect } from "react";

function plainPrimaryClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function sameScheduleDestination(anchor: HTMLAnchorElement) {
  if (window.location.pathname !== "/dashboard") return false;
  const destination = new URL(anchor.href, window.location.origin);
  if (destination.pathname !== "/dashboard" || destination.hash) return false;
  return destination.search === window.location.search;
}

export function ScheduleNavigationReset() {
  useEffect(() => {
    const handleScheduleTap = (event: MouseEvent) => {
      if (!plainPrimaryClick(event)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>(
        ".app-top-actions a, .app-bottom-nav a, .app-brand",
      );
      if (!anchor || !sameScheduleDestination(anchor)) return;

      const destination = new URL(anchor.href, window.location.origin);
      if (destination.pathname !== "/dashboard") return;

      event.preventDefault();
      event.stopImmediatePropagation();
      window.history.replaceState(
        window.history.state,
        "",
        `${destination.pathname}${destination.search}`,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    document.addEventListener("click", handleScheduleTap, true);
    return () => document.removeEventListener("click", handleScheduleTap, true);
  }, []);

  return null;
}
