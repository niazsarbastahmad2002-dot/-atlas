import { randomUUID } from "node:crypto";

export type InfobipWhatsAppConfig = {
  apiKey: string;
  baseUrl: string;
  sender: string;
  globalDailyLimit: number;
};

export type InfobipTemplateInput = {
  recipientPhone: string;
  clinicName: string;
  appointmentAt: string;
  templateName: string;
  templateLanguage: string;
};

export type InfobipSendResult =
  | { accepted: true; providerMessageId: string }
  | { accepted: false; errorCode: string; retryable: boolean; deliveryUnknown: boolean };

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(trimmed)) return null;
  return trimmed;
}

function normalizeSender(value: string) {
  const digits = value.replace(/\D/g, "");
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

export function readInfobipWhatsAppConfig(
  env: Record<string, string | undefined> = process.env,
): InfobipWhatsAppConfig | null {
  if (env.WHATSAPP_PROVIDER?.trim().toLowerCase() !== "infobip") return null;

  const apiKey = env.INFOBIP_API_KEY?.trim() ?? "";
  const baseUrl = normalizeBaseUrl(env.INFOBIP_BASE_URL ?? "");
  const sender = normalizeSender(env.INFOBIP_WHATSAPP_SENDER ?? "");
  const globalDailyLimit = Number(env.WHATSAPP_GLOBAL_DAILY_LIMIT);

  if (
    apiKey.length < 16
    || !baseUrl
    || !sender
    || !Number.isInteger(globalDailyLimit)
    || globalDailyLimit < 1
    || globalDailyLimit > 10_000
  ) {
    throw new Error("Infobip WhatsApp is selected but its server configuration is incomplete.");
  }

  return { apiKey, baseUrl, sender, globalDailyLimit };
}

function safeErrorCode(body: unknown, status: number) {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const requestError = record.requestError;
    if (requestError && typeof requestError === "object") {
      const serviceException = (requestError as Record<string, unknown>).serviceException;
      if (serviceException && typeof serviceException === "object") {
        const messageId = (serviceException as Record<string, unknown>).messageId;
        if (typeof messageId === "string") {
          const normalized = messageId.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 48);
          if (normalized) return `infobip_${normalized}`;
        }
      }
    }
  }
  return `infobip_http_${status}`;
}

export function buildInfobipTemplatePayload(input: InfobipTemplateInput, sender: string, messageId = randomUUID()) {
  return {
    messages: [{
      from: sender,
      to: input.recipientPhone.replace(/^\+/, ""),
      messageId,
      content: {
        templateName: input.templateName,
        templateData: {
          body: { placeholders: [input.clinicName, input.appointmentAt] },
        },
        language: input.templateLanguage,
      },
    }],
  };
}

export async function sendInfobipWhatsAppTemplate(
  input: InfobipTemplateInput,
  config: InfobipWhatsAppConfig,
  fetchImplementation: typeof fetch = fetch,
): Promise<InfobipSendResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  const messageId = randomUUID();

  try {
    const response = await fetchImplementation(`${config.baseUrl}/whatsapp/1/message/template`, {
      method: "POST",
      headers: {
        Authorization: `App ${config.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(buildInfobipTemplatePayload(input, config.sender, messageId)),
      signal: controller.signal,
      cache: "no-store",
    });

    let body: unknown = null;
    try { body = await response.json(); } catch {}

    if (response.ok && body && typeof body === "object") {
      const messages = (body as { messages?: unknown }).messages;
      const first = Array.isArray(messages) && messages[0] && typeof messages[0] === "object"
        ? messages[0] as Record<string, unknown>
        : null;
      const providerMessageId = typeof first?.messageId === "string" ? first.messageId : null;
      if (providerMessageId) return { accepted: true, providerMessageId };
    }

    return {
      accepted: false,
      errorCode: safeErrorCode(body, response.status),
      retryable: response.status === 429 || response.status >= 500,
      deliveryUnknown: false,
    };
  } catch {
    return {
      accepted: false,
      errorCode: "infobip_delivery_unknown",
      retryable: false,
      deliveryUnknown: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}
