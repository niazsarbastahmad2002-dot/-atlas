import { NextResponse } from "next/server";
import { safeAuthDestination } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = safeAuthDestination(requestUrl.searchParams.get("next"));
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", requestUrl.origin));
  }

  // Clinic membership is never granted as a side effect of signing in.
  // New staff access must be accepted through the explicit one-use /join flow.
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
