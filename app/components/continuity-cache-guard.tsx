"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const CONTINUITY_DB = "atlas-continuity-v2";
const CONTINUITY_ACTIVE_MARKER = "atlas-continuity-active";

function clearBrowserContinuity() {
  try {
    window.localStorage.setItem(CONTINUITY_ACTIVE_MARKER, "0");
    if (!("indexedDB" in window)) return;
    const request = window.indexedDB.deleteDatabase(CONTINUITY_DB);
    request.onerror = () => undefined;
    request.onblocked = () => undefined;
  } catch {
    // Browser continuity is an optional fallback. Auth/logout must never depend on
    // browser storage being available.
  }
}

export function ContinuityCacheGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      pathname === "/login"
      || pathname.startsWith("/login/")
      || pathname.startsWith("/auth/")
      || pathname.startsWith("/onboarding/")
    ) {
      clearBrowserContinuity();
    }
  }, [pathname]);

  return null;
}
