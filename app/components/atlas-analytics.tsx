"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { createAtlasClientErrorGate, shouldTrackAtlasWindowError } from "@/lib/analytics/client-errors";
import { classifyAtlasScreen, surfaceForScreen } from "@/lib/analytics/schema";
import { trackAtlasEvent } from "@/lib/analytics/client";

export function AtlasAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    const screen = classifyAtlasScreen(pathname);
    trackAtlasEvent("atlas_screen_viewed", { screen, surface: surfaceForScreen(screen) });
  }, [pathname]);

  useEffect(() => {
    const allowError = createAtlasClientErrorGate();
    const trackClientError = (kind: "window" | "unhandled_rejection") => {
      if (!allowError(kind)) return;
      trackAtlasEvent("atlas_client_error", { error_kind: kind, interaction: "system" });
    };

    const onWindowError = (event: ErrorEvent) => {
      if (!shouldTrackAtlasWindowError(event)) return;
      trackClientError("window");
    };
    const onUnhandledRejection = () => {
      trackClientError("unhandled_rejection");
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
