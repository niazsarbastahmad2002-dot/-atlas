export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, MCP-Protocol-Version",
    "Cache-Control": "no-store",
  };
}

export async function GET(request: Request) {
  const authorizationServer = process.env.PERSONAL_OAUTH_AUTHORIZATION_SERVER?.replace(/\/$/, "") ?? "";
  if (!authorizationServer.startsWith("https://")) {
    return Response.json({ error: "oauth_not_configured" }, { status: 503, headers: corsHeaders() });
  }
  const resource = new URL("/api/mcp", request.url).toString();
  return Response.json({
    resource,
    authorization_servers: [authorizationServer],
    bearer_methods_supported: ["header"],
    scopes_supported: ["openid", "offline_access"],
  }, { headers: corsHeaders() });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
