import { NextResponse } from "next/server";
import { storeWebAppleProviderRefreshToken } from "@/lib/apple-server";
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
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) {
    const isApple = data.user?.identities?.some((identity) => identity.provider === "apple") ?? false;
    const providerRefreshToken = data.session?.provider_refresh_token;
    if (isApple && providerRefreshToken && data.user) {
      try {
        await storeWebAppleProviderRefreshToken(data.user.id, providerRefreshToken);
      } catch (storeError) {
        // Web Apple sign-in remains usable if the provider does not expose a
        // refresh token. Account deletion falls back to Apple's manual revoke
        // path, while native iOS Apple sign-in requires revocation-safe storage.
        console.error("Atlas Apple web refresh-token storage failed", {
          error: storeError instanceof Error ? storeError.message : "unknown",
        });
      }
    }

    const activationUrl = new URL("/auth/activate", requestUrl.origin);
    activationUrl.searchParams.set("next", next);
    return NextResponse.redirect(activationUrl);
  }

  const errorUrl = new URL("/login", requestUrl.origin);
  errorUrl.searchParams.set("error", "invalid_link");
  return NextResponse.redirect(errorUrl);
}
