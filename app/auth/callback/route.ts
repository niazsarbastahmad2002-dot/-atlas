import { NextResponse } from "next/server";
import { safeAuthDestination } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

const EMAIL_LOCALES = new Set(["en", "ku", "bd", "ar"]);

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const authError = requestUrl.searchParams.get("error");
  const requestedNext = requestUrl.searchParams.get("next");
  const next = safeAuthDestination(requestedNext);

  // Supabase's server-side OTP sender currently returns an implicit-flow
  // fragment after verification. Fragments never reach a server route, so
  // bridge no-code callbacks to a client page; browsers preserve the fragment
  // across this redirect and Atlas can securely store the session there.
  if (!code && !authError) {
    const emailCallbackUrl = new URL("/auth/email/callback", requestUrl.origin);
    emailCallbackUrl.searchParams.set(
      "next",
      requestedNext === "/dashboard/select-clinic" ? requestedNext : next,
    );

    const locale = requestUrl.searchParams.get("atlas_email_locale");
    if (locale && EMAIL_LOCALES.has(locale)) {
      emailCallbackUrl.searchParams.set("atlas_email_locale", locale);
    }

    return NextResponse.redirect(emailCallbackUrl);
  }

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
