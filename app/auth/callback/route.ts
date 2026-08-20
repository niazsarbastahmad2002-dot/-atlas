import { NextResponse } from "next/server";
import { safeAuthDestination } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const authError = requestUrl.searchParams.get("error");
  const next = safeAuthDestination(requestUrl.searchParams.get("next"));

  if (!code || authError) {
    const errorUrl = new URL("/login", requestUrl.origin);
    errorUrl.searchParams.set("error", "invalid_link");
    return NextResponse.redirect(errorUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) {
    // Do not persist Supabase's generic provider_refresh_token here. An Atlas
    // account can link multiple OAuth identities, and this callback does not
    // cryptographically identify which provider issued that token. Native
    // Sign in with Apple exchanges Apple's authorization code directly and
    // stores its revocation credential through the dedicated server endpoint.
    const activationUrl = new URL("/auth/activate", requestUrl.origin);
    activationUrl.searchParams.set("next", next);
    return NextResponse.redirect(activationUrl);
  }

  const errorUrl = new URL("/login", requestUrl.origin);
  errorUrl.searchParams.set("error", "invalid_link");
  return NextResponse.redirect(errorUrl);
}
