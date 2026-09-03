"use client";

import { useEffect } from "react";

function plainPrimaryClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function sameResettableDestination(anchor: HTMLAnchorElement) {
  const currentPath = window.location.pathname;
  if (currentPath !== "/dashboard" && currentPath !== "/dashboard/settings") return false;
  const destination = new URL(anchor.href, window.location.origin);
  if (destination.pathname !== currentPath || destination.hash) return false;
  return destination.search === window.location.search;
}

export function ScheduleNavigationReset() {
  useEffect(() => {
    const handleCoreNavigationTap = (event: MouseEvent) => {
      if (!plainPrimaryClick(event)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>(
        ".app-top-actions a, .app-bottom-nav a, .app-brand",
      );
      if (!anchor || !sameResettableDestination(anchor)) return;

      const destination = new URL(anchor.href, window.location.origin);
      if (destination.pathname !== "/dashboard" && destination.pathname !== "/dashboard/settings") return;

      event.preventDefault();
      event.stopImmediatePropagation();
      window.history.replaceState(
        window.history.state,
        "",
        `${destination.pathname}${destination.search}`,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    document.addEventListener("click", handleCoreNavigationTap, true);
    return () => document.removeEventListener("click", handleCoreNavigationTap, true);
  }, []);

  return null;
}