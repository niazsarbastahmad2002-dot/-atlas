const E164 = /^\+[1-9]\d{7,14}$/;
const PHONE_ID = /^\d{5,32}$/;
const GRAPH_VERSION = /^v\d+\.\d+$/;

export type PersonalWhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  graphApiVersion: string;
  allowedRecipients: ReadonlySet<string>;
};

export type SendResult =
  | { accepted: true; providerMessageId: string }
  | { accepted: false; errorCode: string; retryable: boolean };

function splitRecipients(value: string | undefined) {
  const values = (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!values.length || values.some((phone) => !E164.test(phone))) {
    throw new Error("PERSONAL_ALLOWED_RECIPIENTS must contain at least one valid E.164 number.");
  }
  return new Set(values);
}

export function readPersonalWhatsAppConfig(): PersonalWhatsAppConfig {
  if (process.env.PERSONAL_WHATSAPP_ENABLED !== "true") {
    throw new Error("Personal WhatsApp is disabled.");
  }
  if (process.env.VERCEL_ENV === "production" && process.env.PERSONAL_WHATSAPP_ALLOW_PRODUCTION !== "true") {
    throw new Error("Personal WhatsApp production sending is disabled.");
  }

  const accessToken = process.env.PERSONAL_META_ACCESS_TOKEN?.trim() ?? "";
  const phoneNumberId = process.env.PERSONAL_META_PHONE_NUMBER_ID?.trim() ?? "";
  const graphApiVersion = process.env.PERSONAL_META_GRAPH_API_VERSION?.trim() || "v26.0";
  if (!accessToken || !PHONE_ID.test(phoneNumberId) || !GRAPH_VERSION.test(graphApiVersion)) {
    throw new Error("Personal Meta WhatsApp configuration is incomplete.");
  }

  return {
    accessToken,
    phoneNumberId,
    graphApiVersion,
    allowedRecipients: splitRecipients(process.env.PERSONAL_ALLOWED_RECIPIENTS),
  };
}

export function recipientAllowed(config: PersonalWhatsAppConfig, phone: string) {
  return E164.test(phone) && config.allowedRecipients.has(phone);
}

export async function sendPersonalWhatsAppText(
  recipientPhone: string,
  message: string,
  config = readPersonalWhatsAppConfig(),
): Promise<SendResult> {
  if (!recipientAllowed(config, recipientPhone)) {
    return { accepted: false, errorCode: "recipient_not_allowed", retryable: false };
  }
  const text = message.trim();
  if (!text || text.length > 1000) {
    return { accepted: false, errorCode: "invalid_message", retryable: false };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(
      `https://graph.facebook.com/${config.graphApiVersion}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipientPhone.replace(/^\+/, ""),
          type: "text",
          text: { preview_url: false, body: text },
        }),
        signal: controller.signal,
        cache: "no-store",
      },
    );

    const payload = await response.json().catch(() => null) as
      | { messages?: Array<{ id?: unknown }>; error?: { code?: unknown } }
      | null;
    const id = payload?.messages?.[0]?.id;
    if (response.ok && typeof id === "string" && id) {
      return { accepted: true, providerMessageId: id };
    }

    const code = payload?.error?.code;
    return {
      accepted: false,
      errorCode: typeof code === "number" || typeof code === "string" ? String(code) : `http_${response.status}`,
      retryable: response.status === 429 || response.status >= 500,
    };
  } catch (error) {
    return {
      accepted: false,
      errorCode: error instanceof Error && error.name === "AbortError" ? "timeout" : "network_error",
      retryable: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}
