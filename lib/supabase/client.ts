import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

const cookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        experimental: { passkey: true },
      },
      cookieOptions,
    },
  );
}

/**
 * Magic links can be opened by an email app in a browser context that does not
 * have the PKCE verifier created by the original Atlas tab. For first-access
 * email sign-in we deliberately use Supabase's supported implicit flow, then
 * move the returned session into Atlas cookies on /auth/finish.
 */
export function createMagicLinkClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: false,
        persistSession: true,
      },
      cookieOptions,
    },
  );
}
