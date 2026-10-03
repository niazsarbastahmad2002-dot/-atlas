import type { NextRequest } from "next/server";
import { isUiLocale, uiLocaleCookie } from "@/lib/i18n/ui";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const requestedLocale = request.nextUrl.pathname === "/login"
    ? request.nextUrl.searchParams.get("lang")
    : null;

  if (isUiLocale(requestedLocale)) {
    // Make the URL-selected login locale visible to the root layout on this
    // same request, so server-rendered lang/dir match the localized content.
    request.cookies.set(uiLocaleCookie, requestedLocale);
  }

  const response = await updateSession(request);
  if (isUiLocale(requestedLocale)) {
    response.cookies.set(uiLocaleCookie, requestedLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    });
  }
  return response;
}

export const config = {
  // The home page also checks the Supabase session and redirects signed-in
  // users to the dashboard. Run the refresh proxy there too so reopening Atlas
  // can renew a valid refresh-token session instead of presenting sign-in.
  matcher: ["/", "/dashboard/:path*", "/login", "/auth/:path*"],
};
