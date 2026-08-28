export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ATLAS_WHATSAPP_AUTH_TEST_SERVER = "https://qyhqqoxafdscagmfzlmp.supabase.co/auth/v1";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, MCP-Protocol-Version",
    "Cache-Control": "no-store",
  };
}

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
    return Response.json({ error: "personal_oauth_metadata_forbidden_in_production" }, {
      status: 403,
      headers: corsHeaders(),
    });
  }
  if (process.env.WHATSAPP_PERSONAL_MCP_ENABLED !== "true") {
    return Response.json({ error: "personal_mcp_disabled" }, {
      status: 503,
      headers: corsHeaders(),
    });
  }

  const origin = new URL(request.url).origin;
  return Response.json({
    resource: `${origin}/api/mcp/whatsapp-test`,
    authorization_servers: [ATLAS_WHATSAPP_AUTH_TEST_SERVER],
    bearer_methods_supported: ["header"],
    scopes_supported: ["openid", "offline_access"],
  }, {
    headers: corsHeaders(),
  });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
