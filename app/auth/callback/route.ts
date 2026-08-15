import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAuthDestination } from "@/lib/navigation";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const authError = requestUrl.searchParams.get("error");
  const next = safeAuthDestination(requestUrl.searchParams.get("next"));

  if (authError) {
    const errorUrl = new URL("/login", requestUrl.origin);
    errorUrl.searchParams.set("error", "invalid_link");
    return NextResponse.redirect(errorUrl);
  }

  // Keep supporting existing PKCE links and any future PKCE/OAuth providers.
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    const errorUrl = new URL("/login", requestUrl.origin);
    errorUrl.searchParams.set("error", "invalid_link");
    return NextResponse.redirect(errorUrl);
  }

  // First-access email sign-in now uses the implicit flow. Supabase returns the
  // session in the URL fragment, which is intentionally not visible to this
  // server route. Redirecting without a fragment preserves that fragment in the
  // browser, where /auth/finish securely stores the session and opens Schedule.
  const finishUrl = new URL("/auth/finish", requestUrl.origin);
  finishUrl.searchParams.set("next", next);
  return NextResponse.redirect(finishUrl);
}
