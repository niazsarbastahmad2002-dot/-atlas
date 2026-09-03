import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // The home page also checks the Supabase session and redirects signed-in
  // users to the dashboard. Run the refresh proxy there too so reopening Atlas
  // can renew a valid refresh-token session instead of presenting sign-in.
  matcher: ["/", "/dashboard/:path*", "/login", "/auth/:path*"],
};
