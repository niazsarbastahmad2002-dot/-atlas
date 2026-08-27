export const atlasAnalyticsEvents = [
  "atlas_screen_viewed",
  "atlas_navigation",
  "atlas_appointment_created",
  "atlas_appointment_status_changed",
  "atlas_home_language_changed",
  "atlas_login_language_changed",
  "atlas_login_email_requested",
  "atlas_quick_signin",
  "atlas_patient_share",
  "atlas_client_error",
] as const;

export type AtlasAnalyticsEvent = (typeof atlasAnalyticsEvents)[number];

export const atlasScreens = [
  "login",
  "schedule",
  "settings",
  "clinic_access",
  "history",
  "reminders",
  "demo",
  "patient_appointment",
  "onboarding",
  "other",
] as const;

export type AtlasScreen = (typeof atlasScreens)[number];

const allowedValues = {
  screen: atlasScreens,
  target: atlasScreens,
  locale: ["en", "ku", "bd", "ar"],
  surface: ["clinic", "demo", "patient", "public"],
  direction: ["previous", "next"],
  relative_day: ["yesterday", "today", "tomorrow", "other"],
  outcome: ["success", "failure", "validation", "slot_taken", "cancelled"],
  status_action: ["confirm", "cancel", "complete", "no_show", "restore", "pending", "undo"],
  method: ["email", "passkey"],
  error_kind: ["window", "unhandled_rejection", "appointment_create", "status_change", "navigation"],
  interaction: ["topbar", "bottom_nav", "brand", "form", "system"],
} as const;

type AllowedKey = keyof typeof allowedValues;
export type AtlasAnalyticsProperties = Partial<Record<AllowedKey, string>> & {
  duration_ms?: number;
};

const eventSet = new Set<string>(atlasAnalyticsEvents);
const keySet = new Set<string>([...Object.keys(allowedValues), "duration_ms"]);

function isAllowedString(key: AllowedKey, value: unknown): value is string {
  return typeof value === "string" && (allowedValues[key] as readonly string[]).includes(value);
}

export function classifyAtlasScreen(pathname: string): AtlasScreen {
  if (pathname === "/" || pathname.startsWith("/login")) return "login";
  if (pathname === "/dashboard") return "schedule";
  if (pathname.startsWith("/dashboard/settings")) return "settings";
  if (pathname.startsWith("/dashboard/staff")) return "clinic_access";
  if (pathname.startsWith("/dashboard/history")) return "history";
  if (pathname.startsWith("/dashboard/reminders")) return "reminders";
  if (pathname.startsWith("/demo")) return "demo";
  if (pathname.startsWith("/patient/")) return "patient_appointment";
  if (pathname.startsWith("/onboarding")) return "onboarding";
  return "other";
}

export function surfaceForScreen(screen: AtlasScreen): AtlasAnalyticsProperties["surface"] {
  if (screen === "demo") return "demo";
  if (screen === "patient_appointment") return "patient";
  if (["schedule", "settings", "clinic_access", "history", "reminders"].includes(screen)) return "clinic";
  return "public";
}

export function sanitizeAtlasAnalyticsPayload(input: unknown): {
  event: AtlasAnalyticsEvent;
  session_id: string;
  properties: AtlasAnalyticsProperties;
} | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  const event = record.event;
  const sessionId = record.session_id;
  const rawProperties = record.properties;

  if (typeof event !== "string" || !eventSet.has(event)) return null;
  if (typeof sessionId !== "string" || !/^[A-Za-z0-9_-]{16,80}$/.test(sessionId)) return null;
  if (rawProperties != null && (typeof rawProperties !== "object" || Array.isArray(rawProperties))) return null;

  const properties: AtlasAnalyticsProperties = {};
  for (const [key, value] of Object.entries((rawProperties ?? {}) as Record<string, unknown>)) {
    if (!keySet.has(key)) continue;
    if (key === "duration_ms") {
      if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 60_000) {
        properties.duration_ms = Math.round(value);
      }
      continue;
    }
    if (isAllowedString(key as AllowedKey, value)) {
      properties[key as AllowedKey] = value;
    }
  }

  return { event: event as AtlasAnalyticsEvent, session_id: sessionId, properties };
}
