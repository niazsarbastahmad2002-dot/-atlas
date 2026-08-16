import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

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
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        flowType: "pkce",
        experimental: { passkey: true },
      },
      cookieOptions,
    },
  );
}
