import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  atlasWhatsAppRecipientAllowed,
  ATLAS_WHATSAPP_META_TEST_MODE,
  readAtlasWhatsAppRuntime,
} from "@/lib/reminders/whatsapp-runtime";
import { sendWhatsAppTextMessage } from "@/lib/reminders/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mcpHandler = createMcpHandler((server) => {
  server.registerTool(
    "send_whatsapp_message",
    {
      title: "Send WhatsApp message",
      description:
        "Use this only when the user explicitly asks to send a WhatsApp message and the recipient phone number has already been resolved. Do not use it for drafts, examples, rewrites, or when the user is only discussing what they might send.",
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
    async ({ recipientPhone, message }) => {
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
});

async function sandboxOnlyHandler(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
    return Response.json({ error: "personal_mcp_forbidden_in_production" }, { status: 403 });
  }
  if (process.env.WHATSAPP_PERSONAL_MCP_ENABLED !== "true") {
    return Response.json({ error: "personal_mcp_disabled" }, { status: 503 });
  }
  return mcpHandler(request);
}

export { sandboxOnlyHandler as GET, sandboxOnlyHandler as POST };
