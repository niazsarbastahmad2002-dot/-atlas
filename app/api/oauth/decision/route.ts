import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readAtlasSupabasePublicConfig } from "@/lib/supabase/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEST_SUPABASE_ORIGIN = "https://qyhqqoxafdscagmfzlmp.supabase.co";

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV === "production" || process.env.ATLAS_WHATSAPP_MODE !== "meta_test") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const config = readAtlasSupabasePublicConfig();
  if (!config.isolatedTest || config.url.replace(/\/$/, "") !== TEST_SUPABASE_ORIGIN) {
    return NextResponse.json({ error: "isolated_auth_required" }, { status: 503 });
  }

  const formData = await request.formData();
  const authorizationId = formData.get("authorization_id");
  const decision = formData.get("decision");
  if (typeof authorizationId !== "string" || !authorizationId) {
    return NextResponse.json({ error: "missing_authorization_id" }, { status: 400 });
  }
  if (decision !== "approve" && decision !== "deny") {
    return NextResponse.json({ error: "invalid_decision" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const allowedUserId = process.env.WHATSAPP_PERSONAL_OAUTH_ALLOWED_USER_ID?.trim() ?? "";
  if (userError || !userData.user || !allowedUserId || userData.user.id !== allowedUserId) {
    return NextResponse.json({ error: "account_not_allowed" }, { status: 403 });
  }

  const result = decision === "approve"
    ? await supabase.auth.oauth.approveAuthorization(authorizationId)
    : await supabase.auth.oauth.denyAuthorization(authorizationId);

  if (result.error || !result.data?.redirect_url) {
    return NextResponse.json({ error: "authorization_failed" }, { status: 400 });
  }

  return NextResponse.redirect(result.data.redirect_url, 303);
}
