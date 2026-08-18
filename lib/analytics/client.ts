"use client";

import {
  classifyAtlasScreen,
  surfaceForScreen,
  type AtlasAnalyticsEvent,
  type AtlasAnalyticsProperties,
} from "./schema";

const SESSION_KEY = "atlas_analytics_session";

function randomSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `atlas_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 18)}`;
}

function getSessionId() {
  if (typeof window === "undefined") return "atlas_server_session";
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing && /^[A-Za-z0-9_-]{16,80}$/.test(existing)) return existing;
    const created = randomSessionId();
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return randomSessionId();
  }
}

export function currentAtlasAnalyticsContext(): AtlasAnalyticsProperties {
  if (typeof window === "undefined") return { screen: "other", surface: "public" };
  const screen = classifyAtlasScreen(window.location.pathname);
  return { screen, surface: surfaceForScreen(screen) };
}

export function trackAtlasEvent(event: AtlasAnalyticsEvent, properties: AtlasAnalyticsProperties = {}) {
  if (typeof window === "undefined") return;
  const payload = {
    event,
    session_id: getSessionId(),
    properties: {
      ...currentAtlasAnalyticsContext(),
      ...properties,
    },
  };

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "same-origin",
    keepalive: true,
    cache: "no-store",
  }).catch(() => undefined);
}
