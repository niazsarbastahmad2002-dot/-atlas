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
    // Supabase exposes a generic provider refresh token here, but an account
    // can link multiple providers. Native Apple authorization is stored only
    // through Atlas's provider-specific, subject-bound exchange endpoint.
    const activationUrl = new URL("/auth/activate", requestUrl.origin);
    activationUrl.searchParams.set("next", next);
    return NextResponse.redirect(activationUrl);
  }

  const errorUrl = new URL("/login", requestUrl.origin);
  errorUrl.searchParams.set("error", "invalid_link");
  return NextResponse.redirect(errorUrl);
}
