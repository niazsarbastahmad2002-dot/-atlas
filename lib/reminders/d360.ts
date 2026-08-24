export type D360WhatsAppConfig = {
  apiKey: string;
  baseUrl: string;
  globalDailyLimit: number;
};

export type D360TemplateInput = {
  recipientPhone: string;
  clinicName: string;
  appointmentAt: string;
  templateName: string;
  templateLanguage: string;
};

export type D360SendResult =
  | { accepted: true; providerMessageId: string }
  | { accepted: false; errorCode: string; retryable: boolean; deliveryUnknown: boolean };

function normalizeBaseUrl(value: string | undefined) {
  const candidate = (value?.trim() || "https://waba-v2.360dialog.io").replace(/\/+$/, "");
  try {
    const url = new URL(candidate);
    const isD360Host = url.hostname === "360dialog.io" || url.hostname.endsWith(".360dialog.io");
    const path = url.pathname.replace(/\/+$/, "");
    if (
      url.protocol !== "https:"
      || !isD360Host
      || url.username
      || url.password
      || url.search
      || url.hash
    ) return null;
    if (url.hostname === "waba-sandbox.360dialog.io") {
      return path === "" || path === "/v1" ? `${url.origin}/v1` : null;
    }
    return path === "" ? url.origin : null;
  } catch {
    return null;
  }
}

export function readD360WhatsAppConfig(
  env: Record<string, string | undefined> = process.env,
): D360WhatsAppConfig | null {
  if (env.WHATSAPP_PROVIDER?.trim().toLowerCase() !== "360dialog") return null;

  const apiKey = env.D360_API_KEY?.trim() ?? "";
  const baseUrl = normalizeBaseUrl(env.D360_BASE_URL);
  const globalDailyLimit = Number(env.WHATSAPP_GLOBAL_DAILY_LIMIT);

  if (
    apiKey.length < 16
    || !baseUrl
    || !Number.isInteger(globalDailyLimit)
    || globalDailyLimit < 1
    || globalDailyLimit > 10_000
  ) {
    throw new Error("360dialog WhatsApp is selected but its server configuration is incomplete.");
  }

  return { apiKey, baseUrl, globalDailyLimit };
}

export function buildD360TemplatePayload(input: D360TemplateInput) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: input.recipientPhone.replace(/^\+/, ""),
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

function safeErrorCode(body: unknown, status: number) {
  if (body && typeof body === "object") {
    const error = (body as Record<string, unknown>).error;
    if (error && typeof error === "object") {
      const code = (error as Record<string, unknown>).code;
      if (typeof code === "number" || typeof code === "string") {
        return `d360_${String(code).replace(/[^a-z0-9_-]/gi, "_").slice(0, 32)}`;
      }
    }
  }
  return `d360_http_${status}`;
}

export async function sendD360WhatsAppTemplate(
  input: D360TemplateInput,
  config: D360WhatsAppConfig,
  fetchImplementation: typeof fetch = fetch,
): Promise<D360SendResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetchImplementation(`${config.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "D360-API-KEY": config.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(buildD360TemplatePayload(input)),
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
      const providerMessageId = typeof first?.id === "string" ? first.id : null;
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
      errorCode: "d360_delivery_unknown",
      retryable: false,
      deliveryUnknown: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}
