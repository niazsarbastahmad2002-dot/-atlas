import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { readAtlasSupabasePublicConfig } from "@/lib/supabase/runtime-config";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = readAtlasSupabasePublicConfig();
  if (!url || !publishableKey) throw new Error("Atlas Supabase server credentials are not configured.");

  return createServerClient<Database>(
    url,
    publishableKey,
    {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot write cookies; proxy.ts handles refreshes.
          }
        },
      },
    },
  );
}
