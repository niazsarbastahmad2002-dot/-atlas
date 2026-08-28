import { recipientAllowed, readPersonalWhatsAppConfig, sendPersonalWhatsAppText } from "../../../lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MCP_PROTOCOL_VERSION = "2025-06-18";
const MAX_BODY_BYTES = 20_000;

type RpcId = string | number | null;
type RpcMessage = { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown };

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, MCP-Protocol-Version",
    "Cache-Control": "no-store",
  };
}

function json(body: unknown, status = 200, extra?: HeadersInit) {
  return Response.json(body, { status, headers: { ...corsHeaders(), ...extra } });
}

function rpcId(value: unknown): RpcId {
  return typeof value === "string" || typeof value === "number" || value === null ? value : null;
}

function rpcResult(id: RpcId, result: unknown) {
  return json({ jsonrpc: "2.0", id, result });
}

function rpcError(id: RpcId, code: number, message: string) {
  return json({ jsonrpc: "2.0", id, error: { code, message } });
}

function originAllowed(request: Request) {
  const origin = request.headers.get("origin")?.trim();
  if (!origin) return true;
  try {
    const host = new URL(origin);
    const self = new URL(request.url);
    if (host.origin === self.origin) return true;
    if (host.protocol !== "https:") return false;
    return host.hostname === "chatgpt.com"
      || host.hostname.endsWith(".chatgpt.com")
      || host.hostname === "openai.com"
      || host.hostname.endsWith(".openai.com");
  } catch {
    return false;
  }
}

function unauthorized(request: Request) {
  const metadata = new URL("/.well-known/oauth-protected-resource", request.url).toString();
  return json({ error: "unauthorized" }, 401, {
    "WWW-Authenticate": `Bearer resource_metadata="${metadata}"`,
  });
}

async function authenticate(request: Request) {
  if (!originAllowed(request)) return { error: json({ error: "origin_not_allowed" }, 403) };
  if (process.env.PERSONAL_MCP_ENABLED !== "true") return { error: json({ error: "mcp_disabled" }, 503) };

  const allowedUserId = process.env.PERSONAL_OAUTH_ALLOWED_USER_ID?.trim() ?? "";
  const authorizationServer = process.env.PERSONAL_OAUTH_AUTHORIZATION_SERVER?.replace(/\/$/, "") ?? "";
  if (!allowedUserId || !authorizationServer.startsWith("https://")) {
    return { error: json({ error: "oauth_not_configured" }, 503) };
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || token.length > 8192) return { error: unauthorized(request) };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${authorizationServer}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return { error: unauthorized(request) };
    const body = await response.json() as { sub?: unknown };
    if (typeof body.sub !== "string" || body.sub !== allowedUserId) {
      return { error: json({ error: "account_not_allowed" }, 403) };
    }
    return { userId: body.sub };
  } catch {
    return { error: json({ error: "oauth_verification_unavailable" }, 503) };
  } finally {
    clearTimeout(timer);
  }
}

function toolDefinition() {
  return {
    name: "send_whatsapp_message",
    title: "Send WhatsApp message",
    description: "Send a WhatsApp message only after the user explicitly asks to send it. Never call for drafts, examples, rewrites, or hypothetical messages. Resolve the recipient to an allowed E.164 phone number first.",
    inputSchema: {
      type: "object",
      properties: {
        recipientPhone: { type: "string", pattern: "^\\+[1-9]\\d{7,14}$" },
        message: { type: "string", minLength: 1, maxLength: 1000 },
      },
      required: ["recipientPhone", "message"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  };
}

async function callTool(argumentsValue: unknown) {
  const args = argumentsValue && typeof argumentsValue === "object" && !Array.isArray(argumentsValue)
    ? argumentsValue as { recipientPhone?: unknown; message?: unknown }
    : {};
  const recipientPhone = typeof args.recipientPhone === "string" ? args.recipientPhone.trim() : "";
  const message = typeof args.message === "string" ? args.message : "";
  if (!recipientPhone || !message.trim() || message.length > 1000) {
    return { isError: true, content: [{ type: "text", text: "Invalid recipient or message." }], structuredContent: { accepted: false, errorCode: "invalid_arguments" } };
  }

  let config;
  try {
    config = readPersonalWhatsAppConfig();
  } catch {
    return { isError: true, content: [{ type: "text", text: "Personal WhatsApp transport is not configured." }], structuredContent: { accepted: false, errorCode: "transport_not_configured" } };
  }
  if (!recipientAllowed(config, recipientPhone)) {
    return { isError: true, content: [{ type: "text", text: "That recipient is not allowed." }], structuredContent: { accepted: false, errorCode: "recipient_not_allowed" } };
  }

  const result = await sendPersonalWhatsAppText(recipientPhone, message, config);
  if (!result.accepted) {
    return {
      isError: true,
      content: [{ type: "text", text: `WhatsApp did not accept the message (${result.errorCode}).` }],
      structuredContent: result,
    };
  }
  return {
    content: [{ type: "text", text: "WhatsApp accepted the message for delivery." }],
    structuredContent: { accepted: true, providerMessageId: result.providerMessageId, recipientPhone },
  };
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (auth.error) return auth.error;

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return json({ error: "request_too_large" }, 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: "request_too_large" }, 413);

  let message: RpcMessage;
  try { message = JSON.parse(raw) as RpcMessage; }
  catch { return rpcError(null, -32700, "Parse error"); }
  if (message.jsonrpc !== "2.0" || typeof message.method !== "string") return rpcError(rpcId(message.id), -32600, "Invalid Request");
  if (message.id === undefined) return new Response(null, { status: 202, headers: corsHeaders() });

  const id = rpcId(message.id);
  if (message.method === "initialize") {
    return rpcResult(id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "personal-whatsapp-bridge", title: "Personal WhatsApp Bridge", version: "0.1.0" },
      instructions: "Use the send action only on an explicit user instruction to send a WhatsApp message.",
    });
  }
  if (message.method === "ping") return rpcResult(id, {});
  if (message.method === "tools/list") return rpcResult(id, { tools: [toolDefinition()] });
  if (message.method === "tools/call") {
    const params = message.params && typeof message.params === "object" && !Array.isArray(message.params)
      ? message.params as { name?: unknown; arguments?: unknown }
      : {};
    if (params.name !== "send_whatsapp_message") return rpcError(id, -32602, "Unknown tool");
    return rpcResult(id, await callTool(params.arguments));
  }
  return rpcError(id, -32601, "Method not found");
}

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth.error) return auth.error;
  return new Response(null, { status: 405, headers: { ...corsHeaders(), Allow: "POST" } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
