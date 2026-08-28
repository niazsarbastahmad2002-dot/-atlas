import type { AuthInfo } from "@modelcontextprotocol/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import {
  atlasWhatsAppRecipientAllowed,
  ATLAS_WHATSAPP_META_TEST_MODE,
  readAtlasWhatsAppRuntime,
} from "@/lib/reminders/whatsapp-runtime";
import { sendWhatsAppTextMessage } from "@/lib/reminders/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ATLAS_WHATSAPP_AUTH_TEST_ORIGIN = "https://qyhqqoxafdscagmfzlmp.supabase.co";

function configuredAllowedUserId() {
  return process.env.WHATSAPP_PERSONAL_OAUTH_ALLOWED_USER_ID?.trim() ?? "";
}

const mcpHandler = createMcpHandler((server) => {
  server.registerTool(
    "send_whatsapp_message",
    {
      title: "Send WhatsApp message",
      description:
        "Use this only when the user explicitly asks to send a WhatsApp message and the recipient phone number has already been resolved. Do not use it for drafts, examples, rewrites, or when the user is only discussing what they might send. This is an external write action.",
      inputSchema: z.object({
        recipientPhone: z
          .string()
          .regex(/^\+9647\d{9}$/, "Use an Iraqi mobile number in E.164 format, for example +9647XXXXXXXXX."),
        message: z.string().min(1).max(1000),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async ({ recipientPhone, message }, ctx) => {
      if (process.env.VERCEL_ENV === "production") {
        return {
          isError: true,
          content: [{ type: "text", text: "Personal WhatsApp sending is forbidden in production." }],
        };
      }
      if (process.env.WHATSAPP_PERSONAL_MCP_ENABLED !== "true") {
        return {
          isError: true,
          content: [{ type: "text", text: "The personal WhatsApp MCP sandbox is disabled." }],
        };
      }

      const allowedUserId = configuredAllowedUserId();
      const authenticatedUserId = typeof ctx.http?.authInfo?.extra?.userId === "string"
        ? ctx.http.authInfo.extra.userId
        : "";
      if (!allowedUserId || authenticatedUserId !== allowedUserId) {
        return {
          isError: true,
          content: [{ type: "text", text: "This authenticated account is not permitted to send WhatsApp messages." }],
        };
      }

      let runtimeConfig;
      try {
        runtimeConfig = readAtlasWhatsAppRuntime();
      } catch {
        return {
          isError: true,
          content: [{ type: "text", text: "The Meta test WhatsApp transport is not configured." }],
        };
      }
      if (!runtimeConfig || runtimeConfig.mode !== ATLAS_WHATSAPP_META_TEST_MODE) {
        return {
          isError: true,
          content: [{ type: "text", text: "This sandbox requires the isolated Meta test WhatsApp runtime." }],
        };
      }
      if (!atlasWhatsAppRecipientAllowed(runtimeConfig, recipientPhone)) {
        return {
          isError: true,
          content: [{ type: "text", text: "That recipient is not on the Meta test recipient allowlist." }],
        };
      }

      const result = await sendWhatsAppTextMessage(recipientPhone, message, runtimeConfig.config);
      if (!result.accepted) {
        return {
          isError: true,
          structuredContent: {
            accepted: false,
            errorCode: result.errorCode,
            retryable: result.retryable,
          },
          content: [{
            type: "text",
            text: `WhatsApp did not accept the message (${result.errorCode}).`,
          }],
        };
      }

      return {
        structuredContent: {
          accepted: true,
          providerMessageId: result.providerMessageId,
          recipientPhone,
        },
        content: [{ type: "text", text: "WhatsApp accepted the message for delivery." }],
      };
    },
  );
}, {
  serverInfo: {
    name: "atlas-personal-whatsapp-test",
    version: "0.1.0",
  },
});

async function verifyTestSupabaseToken(
  _request: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken || process.env.VERCEL_ENV === "production") return undefined;
  if (process.env.WHATSAPP_PERSONAL_MCP_ENABLED !== "true") return undefined;

  const allowedUserId = configuredAllowedUserId();
  if (!allowedUserId) return undefined;

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
    if (!response.ok) return undefined;

    const body = await response.json() as { sub?: unknown };
    const userId = typeof body.sub === "string" ? body.sub : "";
    if (!userId || userId !== allowedUserId) return undefined;

    return {
      token: bearerToken,
      scopes: ["openid"],
      clientId: userId,
      extra: { userId },
    };
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

const authenticatedMcpHandler = withMcpAuth(mcpHandler, verifyTestSupabaseToken, {
  required: true,
  requiredScopes: ["openid"],
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

async function sandboxOnlyHandler(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
    return Response.json({ error: "personal_mcp_forbidden_in_production" }, { status: 403 });
  }
  if (process.env.WHATSAPP_PERSONAL_MCP_ENABLED !== "true") {
    return Response.json({ error: "personal_mcp_disabled" }, { status: 503 });
  }
  return authenticatedMcpHandler(request);
}

export { sandboxOnlyHandler as GET, sandboxOnlyHandler as POST };
