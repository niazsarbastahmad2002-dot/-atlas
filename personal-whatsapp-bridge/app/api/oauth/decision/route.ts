import { createPersonalSupabaseServerClient } from "../../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const authorizationId = formData.get("authorization_id");
  const decision = formData.get("decision");
  if (typeof authorizationId !== "string" || !authorizationId) {
    return Response.json({ error: "missing_authorization_id" }, { status: 400 });
  }
  if (decision !== "approve" && decision !== "deny") {
    return Response.json({ error: "invalid_decision" }, { status: 400 });
  }

  let supabase;
  try { supabase = await createPersonalSupabaseServerClient(); }
  catch { return Response.json({ error: "oauth_not_configured" }, { status: 503 }); }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const allowedUserId = process.env.PERSONAL_OAUTH_ALLOWED_USER_ID?.trim() ?? "";
  if (userError || !userData.user || !allowedUserId || userData.user.id !== allowedUserId) {
    return Response.json({ error: "account_not_allowed" }, { status: 403 });
  }

  const result = decision === "approve"
    ? await supabase.auth.oauth.approveAuthorization(authorizationId)
    : await supabase.auth.oauth.denyAuthorization(authorizationId);
  if (result.error || !result.data?.redirect_url) {
    return Response.json({ error: "authorization_failed" }, { status: 400 });
  }
  return Response.redirect(result.data.redirect_url, 303);
}
