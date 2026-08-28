import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ATLAS_WHATSAPP_AUTH_TEST_SERVER = "https://qyhqqoxafdscagmfzlmp.supabase.co/auth/v1";

const handler = protectedResourceHandler({
  authServerUrls: [ATLAS_WHATSAPP_AUTH_TEST_SERVER],
});
const corsHandler = metadataCorsOptionsRequestHandler();

async function previewOnlyHandler(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
    return Response.json({ error: "personal_oauth_metadata_forbidden_in_production" }, { status: 403 });
  }
  if (process.env.WHATSAPP_PERSONAL_MCP_ENABLED !== "true") {
    return Response.json({ error: "personal_mcp_disabled" }, { status: 503 });
  }
  return handler(request);
}

export { previewOnlyHandler as GET, corsHandler as OPTIONS };
