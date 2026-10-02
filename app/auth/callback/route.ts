import { NextResponse } from "next/server";
import { uiLocaleCookie } from "@/lib/i18n/ui-server";
import { safeAuthDestination } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

const EMAIL_LOCALES = new Set(["en", "ku", "bd", "ar"]);

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const authError = requestUrl.searchParams.get("error");
  const requestedNext = requestUrl.searchParams.get("next");
  const next = safeAuthDestination(requestedNext);
  const localeCandidate = requestUrl.searchParams.get("atlas_email_locale");
  const requestedLocale = localeCandidate && EMAIL_LOCALES.has(localeCandidate) ? localeCandidate : null;

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

    if (requestedLocale) {
      emailCallbackUrl.searchParams.set("atlas_email_locale", requestedLocale);
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
    if (requestedLocale) {
      const { error: localeError } = await supabase.auth.updateUser({
        data: { atlas_ui_language: requestedLocale },
      });
      if (localeError) {
        console.warn("Atlas verified email locale save failed", { message: localeError.message });
      }
    }

    // Supabase exposes a generic provider refresh token here, but an account
    // can link multiple providers. Native Apple authorization is stored only
    // through Atlas's provider-specific, subject-bound exchange endpoint.
    const activationUrl = new URL("/auth/activate", requestUrl.origin);
    activationUrl.searchParams.set("next", next);
    const response = NextResponse.redirect(activationUrl);
    if (requestedLocale) {
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

  const errorUrl = new URL("/login", requestUrl.origin);
  errorUrl.searchParams.set("error", "invalid_link");
  return NextResponse.redirect(errorUrl);
}
