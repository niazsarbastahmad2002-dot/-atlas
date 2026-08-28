import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createPersonalSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_PERSONAL_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const publishableKey = process.env.NEXT_PUBLIC_PERSONAL_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  if (!url.startsWith("https://") || !publishableKey) {
    throw new Error("Personal Supabase OAuth configuration is missing.");
  }

  const cookieStore = await cookies();
  return createServerClient(url, publishableKey, {
    cookieOptions: { path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies; browser auth sets the login cookies.
        }
      },
    },
  });
}
