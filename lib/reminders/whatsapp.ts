import { createHmac, timingSafeEqual } from "node:crypto";

export type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  appSecret: string;
  verifyToken: string;
  graphApiVersion: string;
  globalDailyLimit: number;
};

export type WhatsAppTemplateInput = {
  recipientPhone: string;
  clinicName: string;
  appointmentAt: string;
  templateName: string;
  templateLanguage: string;
};

export type WhatsAppSendResult =
  | { accepted: true; providerMessageId: string }
  | { accepted: false; errorCode: string; retryable: boolean };

export function readWhatsAppConfig(
  env: Record<string, string | undefined> = process.env,
) {
  if (env.WHATSAPP_ENABLED !== "true") return null;

  const config: WhatsAppConfig = {
    accessToken: env.WHATSAPP_ACCESS_TOKEN?.trim() ?? "",
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "",
    appSecret: env.WHATSAPP_APP_SECRET?.trim() ?? "",
    verifyToken: env.WHATSAPP_VERIFY_TOKEN?.trim() ?? "",
    graphApiVersion: env.WHATSAPP_GRAPH_API_VERSION?.trim() ?? "",
    globalDailyLimit: Number(env.WHATSAPP_GLOBAL_DAILY_LIMIT),
  };

  if (
    !config.accessToken
    || !/^\d+$/.test(config.phoneNumberId)
    || config.appSecret.length < 16
    || config.verifyToken.length < 16
    || !/^v\d+\.\d+$/.test(config.graphApiVersion)
    || !Number.isInteger(config.globalDailyLimit)
    || config.globalDailyLimit < 1
    || config.globalDailyLimit > 10_000
  ) throw new Error("WhatsApp is enabled but its server configuration is incomplete.");

  return config;
}

export async function readBodyWithLimit(
  body: ReadableStream<Uint8Array> | null,
  maximumBytes: number,
) {
  if (!body) return new Uint8Array();

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel("request_too_large");
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export function buildTemplatePayload(input: WhatsAppTemplateInput) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: input.recipientPhone,
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.templateLanguage },
      components: [{
        type: "body",
        parameters: [
          { type: "text", text: input.clinicName },
          { type: "text", text: input.appointmentAt },
        ],
      }],
    },
  };
}

function providerErrorCode(body: unknown, status: number) {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error?: unknown }).error;
    if (error && typeof error === "object" && "code" in error) {
      const code = (error as { code?: unknown }).code;
      if (typeof code === "number" || typeof code === "string") return `meta_${String(code).slice(0, 32)}`;
    }
  }
  return `http_${status}`;
}

export async function sendApprovedWhatsAppTemplate(
  input: WhatsAppTemplateInput,
  config: WhatsAppConfig,
  fetchImplementation: typeof fetch = fetch,
): Promise<WhatsAppSendResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetchImplementation(
      `https://graph.facebook.com/${config.graphApiVersion}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildTemplatePayload(input)),
        signal: controller.signal,
      },
    );

    let body: unknown = null;
    try { body = await response.json(); } catch {}

    if (response.ok && body && typeof body === "object" && "messages" in body) {
      const messages = (body as { messages?: unknown }).messages;
      const providerMessageId = Array.isArray(messages)
        && messages[0]
        && typeof messages[0] === "object"
        && "id" in messages[0]
        && typeof (messages[0] as { id?: unknown }).id === "string"
        ? (messages[0] as { id: string }).id
        : null;
      if (providerMessageId) return { accepted: true, providerMessageId };
    }

    return {
      accepted: false,
      errorCode: providerErrorCode(body, response.status),
      retryable: response.status === 429 || response.status >= 500,
    };
  } catch {
    // A transport failure can leave delivery uncertain; automatic retry could duplicate a message.
    return { accepted: false, errorCode: "delivery_unknown", retryable: false };
  } finally {
    clearTimeout(timeout);
  }
}

export function verifyWebhookSignature(rawBody: Uint8Array, signatureHeader: string | null, appSecret: string) {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const suppliedHex = signatureHeader.slice(7);
  if (!/^[a-f0-9]{64}$/i.test(suppliedHex)) return false;
  const supplied = Buffer.from(suppliedHex, "hex");
  const expected = Buffer.from(createHmac("sha256", appSecret).update(rawBody).digest("hex"), "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export type DeliveryStatus = {
  providerMessageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  occurredAt: string;
  errorCode: string | null;
};

export function extractDeliveryStatuses(payload: unknown): DeliveryStatus[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as { object?: unknown; entry?: unknown };
  if (root.object !== "whatsapp_business_account" || !Array.isArray(root.entry)) return [];

  const results: DeliveryStatus[] = [];
  for (const entry of root.entry) {
    if (!entry || typeof entry !== "object" || !Array.isArray((entry as { changes?: unknown }).changes)) continue;
    for (const change of (entry as { changes: unknown[] }).changes) {
      if (!change || typeof change !== "object" || (change as { field?: unknown }).field !== "messages") continue;
      const value = (change as { value?: unknown }).value;
      if (!value || typeof value !== "object" || !Array.isArray((value as { statuses?: unknown }).statuses)) continue;
      for (const item of (value as { statuses: unknown[] }).statuses) {
        if (!item || typeof item !== "object") continue;
        const statusItem = item as { id?: unknown; status?: unknown; timestamp?: unknown; errors?: unknown };
        if (
          typeof statusItem.id !== "string"
          || !["sent", "delivered", "read", "failed"].includes(String(statusItem.status))
          || !/^\d{1,13}$/.test(String(statusItem.timestamp))
        ) continue;
        const seconds = Number(statusItem.timestamp);
        const occurredAt = new Date(seconds * 1000);
        if (Number.isNaN(occurredAt.getTime())) continue;
        let errorCode: string | null = null;
        if (Array.isArray(statusItem.errors) && statusItem.errors[0] && typeof statusItem.errors[0] === "object") {
          const code = (statusItem.errors[0] as { code?: unknown }).code;
          if (typeof code === "number" || typeof code === "string") errorCode = `meta_${String(code).slice(0, 32)}`;
        }
        results.push({
          providerMessageId: statusItem.id,
          status: statusItem.status as DeliveryStatus["status"],
          occurredAt: occurredAt.toISOString(),
          errorCode,
        });
      }
    }
  }
  return results;
}
