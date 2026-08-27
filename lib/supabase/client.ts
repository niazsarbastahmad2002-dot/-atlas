import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { readAtlasSupabasePublicConfig } from "@/lib/supabase/runtime-config";

const cookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

/**
 * Atlas uses one browser auth client for both passkey sign-in and the standard
 * Supabase SSR/PKCE email recovery flow. Keeping one flow avoids the historical
 * implicit/PKCE split and ensures sessions are written to the same cookie store.
 */
export function createClient() {
  const { url, publishableKey } = readAtlasSupabasePublicConfig();
  if (!url || !publishableKey) throw new Error("Atlas Supabase browser credentials are not configured.");

  return createBrowserClient<Database>(url, publishableKey, {
    auth: {
      flowType: "pkce",
      experimental: { passkey: true },
    },
    cookieOptions,
  });
}
