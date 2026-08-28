import {
  atlasWhatsAppRecipientAllowed,
  ATLAS_WHATSAPP_META_TEST_MODE,
  readAtlasWhatsAppRuntime,
} from "@/lib/reminders/whatsapp-runtime";
import { sendWhatsAppTextMessage } from "@/lib/reminders/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MCP_PROTOCOL_VERSION = "2025-06-18";
const MAX_BODY_BYTES = 20_000;
const ATLAS_WHATSAPP_AUTH_TEST_ORIGIN = "https://qyhqqoxafdscagmfzlmp.supabase.co";

type JsonRpcId = string | number | null;
type JsonRpcMessage = {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
};

type ToolArguments = {
  recipientPhone?: unknown;
  message?: unknown;
};

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function jsonRpcResult(id: JsonRpcId, result: unknown) {
  return jsonResponse({ jsonrpc: "2.0", id, result });
}

function jsonRpcError(id: JsonRpcId, code: number, message: string) {
  return jsonResponse({ jsonrpc: "2.0", id, error: { code, message } });
}

function configuredAllowedUserId() {
  return process.env.WHATSAPP_PERSONAL_OAUTH_ALLOWED_USER_ID?.trim() ?? "";
}

function requestOriginAllowed(request: Request) {
  const origin = request.headers.get("origin")?.trim();
  if (!origin) return true;
  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    if (originUrl.origin === requestUrl.origin) return true;
    if (originUrl.protocol !== "https:") return false;
    return originUrl.hostname === "chatgpt.com"
      || originUrl.hostname.endsWith(".chatgpt.com")
      || originUrl.hostname === "openai.com"
      || originUrl.hostname.endsWith(".openai.com");
  } catch {
    return false;
  }
}

function unauthorized(request: Request) {
  const metadataUrl = new URL("/.well-known/oauth-protected-resource", request.url).toString();
  return jsonResponse({ error: "unauthorized" }, 401, {
    "WWW-Authenticate": `Bearer resource_metadata="${metadataUrl}"`,
  });
}

async function authenticatedUserId(request: Request) {
  if (!requestOriginAllowed(request)) return { error: jsonResponse({ error: "origin_not_allowed" }, 403) };

  const allowedUserId = configuredAllowedUserId();
  if (!allowedUserId) return { error: jsonResponse({ error: "personal_oauth_user_not_configured" }, 503) };

  const authorization = request.headers.get("authorization") ?? "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!bearerToken || bearerToken.length > 8_192) return { error: unauthorized(request) };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${ATLAS_WHATSAPP_AUTH_TEST_ORIGIN}/auth/v1/oauth/userinfo`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return { error: unauthorized(request) };

    const body = await response.json() as { sub?: unknown };
    const userId = typeof body.sub === "string" ? body.sub : "";
    if (!userId || userId !== allowedUserId) return { error: jsonResponse({ error: "account_not_allowed" }, 403) };
    return { userId };
  } catch {
    return { error: jsonResponse({ error: "oauth_verification_unavailable" }, 503) };
  } finally {
    clearTimeout(timeout);
  }
}

function toolDefinition() {
  return {
    name: "send_whatsapp_message",
    title: "Send WhatsApp message",
    description:
      "Use this external write action only when the user explicitly asks to send a WhatsApp message and the recipient phone number has already been resolved. Do not use it for drafts, examples, rewrites, or when the user is only discussing what they might send.",
    inputSchema: {
      type: "object",
      properties: {
        recipientPhone: {
          type: "string",
          pattern: "^\\+9647\\d{9}$",
          description: "The resolved Iraqi mobile number in E.164 format.",
        },
        message: {
          type: "string",
          minLength: 1,
          maxLength: 1000,
          description: "The exact WhatsApp message text the user asked to send.",
        },
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

async function callSendWhatsApp(argumentsValue: unknown) {
  const args = argumentsValue && typeof argumentsValue === "object" && !Array.isArray(argumentsValue)
    ? argumentsValue as ToolArguments
    : {};
  const recipientPhone = typeof args.recipientPhone === "string" ? args.recipientPhone.trim() : "";
  const message = typeof args.message === "string" ? args.message : "";

  if (!/^\+9647\d{9}$/.test(recipientPhone) || !message.trim() || message.length > 1000) {
    return {
      isError: true,
      content: [{ type: "text", text: "The recipient phone or message is invalid." }],
      structuredContent: { accepted: false, errorCode: "invalid_arguments" },
    };
  }

  let runtimeConfig;
  try {
    runtimeConfig = readAtlasWhatsAppRuntime();
  } catch {
    return {
      isError: true,
      content: [{ type: "text", text: "The isolated Meta test WhatsApp transport is not configured." }],
      structuredContent: { accepted: false, errorCode: "transport_not_configured" },
    };
  }
  if (!runtimeConfig || runtimeConfig.mode !== ATLAS_WHATSAPP_META_TEST_MODE) {
    return {
      isError: true,
      content: [{ type: "text", text: "The isolated Meta test WhatsApp runtime is required." }],
      structuredContent: { accepted: false, errorCode: "meta_test_required" },
    };
  }
  if (!atlasWhatsAppRecipientAllowed(runtimeConfig, recipientPhone)) {
    return {
      isError: true,
      content: [{ type: "text", text: "That recipient is not on the Meta test recipient allowlist." }],
      structuredContent: { accepted: false, errorCode: "recipient_not_allowed" },
    };
  }

  const result = await sendWhatsAppTextMessage(recipientPhone, message, runtimeConfig.config);
  if (!result.accepted) {
    return {
      isError: true,
      content: [{ type: "text", text: `WhatsApp did not accept the message (${result.errorCode}).` }],
      structuredContent: {
        accepted: false,
        errorCode: result.errorCode,
        retryable: result.retryable,
      },
    };
  }

  return {
    content: [{ type: "text", text: "WhatsApp accepted the message for delivery." }],
    structuredContent: {
      accepted: true,
      providerMessageId: result.providerMessageId,
      recipientPhone,
    },
  };
}

function rpcId(value: unknown): JsonRpcId {
  return typeof value === "string" || typeof value === "number" || value === null ? value : null;
}

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
    return jsonResponse({ error: "personal_mcp_forbidden_in_production" }, 403);
  }
  if (process.env.WHATSAPP_PERSONAL_MCP_ENABLED !== "true") {
    return jsonResponse({ error: "personal_mcp_disabled" }, 503);
  }

  const auth = await authenticatedUserId(request);
  if (auth.error) return auth.error;

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "request_too_large" }, 413);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "request_too_large" }, 413);
  }

  let message: JsonRpcMessage;
  try {
    message = JSON.parse(rawBody) as JsonRpcMessage;
  } catch {
    return jsonRpcError(null, -32700, "Parse error");
  }

  if (message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return jsonRpcError(rpcId(message.id), -32600, "Invalid Request");
  }

  const isNotification = message.id === undefined;
  if (isNotification) {
    if (message.method === "notifications/initialized" || message.method === "notifications/cancelled") {
      return new Response(null, { status: 202, headers: { "Cache-Control": "no-store" } });
    }
    return new Response(null, { status: 202, headers: { "Cache-Control": "no-store" } });
  }

  const id = rpcId(message.id);

  if (message.method === "initialize") {
    return jsonRpcResult(id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: {
        name: "atlas-personal-whatsapp-test",
        title: "Atlas Personal WhatsApp Test",
        version: "0.1.0",
      },
      instructions:
        "This Preview-only server exposes one WhatsApp write action. Invoke it only after an explicit user request to send and only with an already-resolved phone number.",
    });
  }

  if (message.method === "ping") return jsonRpcResult(id, {});

  if (message.method === "tools/list") {
    return jsonRpcResult(id, { tools: [toolDefinition()] });
  }

  if (message.method === "tools/call") {
    const params = message.params && typeof message.params === "object" && !Array.isArray(message.params)
      ? message.params as { name?: unknown; arguments?: unknown }
      : {};
    if (params.name !== "send_whatsapp_message") {
      return jsonRpcError(id, -32602, "Unknown tool");
    }
    return jsonRpcResult(id, await callSendWhatsApp(params.arguments));
  }

  return jsonRpcError(id, -32601, "Method not found");
}

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
    return jsonResponse({ error: "personal_mcp_forbidden_in_production" }, 403);
  }
  if (process.env.WHATSAPP_PERSONAL_MCP_ENABLED !== "true") {
    return jsonResponse({ error: "personal_mcp_disabled" }, 503);
  }
  const auth = await authenticatedUserId(request);
  if (auth.error) return auth.error;

  return new Response(null, {
    status: 405,
    headers: {
      Allow: "POST",
      "Cache-Control": "no-store",
    },
  });
}
