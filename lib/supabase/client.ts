import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { readAtlasSupabasePublicConfig } from "@/lib/supabase/runtime-config";

const cookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

const META_TEST_WINDOW_KEY = "atlas-meta-test-window-confirmed-until";

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function metaTestWindowConfirmed() {
  try {
    const until = Number(window.localStorage.getItem(META_TEST_WINDOW_KEY) ?? "0");
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

function createIsolatedAuthFetch(supabaseUrl: string): typeof fetch {
  const supabaseOrigin = new URL(supabaseUrl).origin;

  return async (input, init) => {
    let target: URL | null = null;
    try {
      target = new URL(requestUrl(input));
    } catch {
      return fetch(input, init);
    }

    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const authAction = target.origin === supabaseOrigin && target.pathname === "/auth/v1/otp"
      ? "otp"
      : target.origin === supabaseOrigin && target.pathname === "/auth/v1/verify"
        ? "verify"
        : null;

    if (!authAction || method !== "POST") return fetch(input, init);

    let body = init?.body;
    if (body == null && input instanceof Request) body = await input.clone().text();

    const sourceHeaders = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    const response = await fetch(`/api/auth/test-supabase?path=${authAction}`, {
      method: "POST",
      headers: {
        "content-type": sourceHeaders.get("content-type") ?? "application/json",
        ...(authAction === "otp" && metaTestWindowConfirmed()
          ? { "x-atlas-meta-test-window-confirmed": "true" }
          : {}),
      },
      body,
      credentials: "same-origin",
      cache: "no-store",
    });

    return response;
  };
}

/**
 * Atlas uses one browser auth client for both passkey sign-in and the standard
 * Supabase SSR/PKCE recovery flow. In the isolated WhatsApp test Preview only,
 * phone OTP send/verify requests are relayed through Atlas same-origin server
 * code so browser CSP/CORS or an old Preview origin cannot prevent Supabase
 * from generating and verifying the test OTP. Production keeps the normal
 * direct Supabase browser transport.
 */
export function createClient() {
  const { url, publishableKey, isolatedTest } = readAtlasSupabasePublicConfig();
  if (!url || !publishableKey) throw new Error("Atlas Supabase browser credentials are not configured.");

  return createBrowserClient<Database>(url, publishableKey, {
    auth: {
      flowType: "pkce",
      experimental: { passkey: true },
    },
    ...(isolatedTest ? { global: { fetch: createIsolatedAuthFetch(url) } } : {}),
    cookieOptions,
  });
}
