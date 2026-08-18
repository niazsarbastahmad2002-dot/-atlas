"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { classifyAtlasScreen, surfaceForScreen } from "@/lib/analytics/schema";
import { trackAtlasEvent } from "@/lib/analytics/client";

export function AtlasAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    const screen = classifyAtlasScreen(pathname);
    trackAtlasEvent("atlas_screen_viewed", { screen, surface: surfaceForScreen(screen) });
  }, [pathname]);

  useEffect(() => {
    const onWindowError = () => {
      trackAtlasEvent("atlas_client_error", { error_kind: "window", interaction: "system" });
    };
    const onUnhandledRejection = () => {
      trackAtlasEvent("atlas_client_error", { error_kind: "unhandled_rejection", interaction: "system" });
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
