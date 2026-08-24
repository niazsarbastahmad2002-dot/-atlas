type WhatsAppProvider = "meta" | "360dialog";

type WhatsAppProviderConfig = {
  provider: WhatsAppProvider;
  endpoint: string;
  headers: Record<string, string>;
};

type WhatsAppEnvironment = Record<string, string | undefined>;

type WhatsAppSendOptions = {
  env?: WhatsAppEnvironment;
  fetchImplementation?: typeof fetch;
};

export type WhatsAppCloudError =
  | "whatsapp_not_configured"
  | "whatsapp_disabled"
  | "template_not_ready"
  | "provider_rate_limited"
  | "delivery_failed";

export type WhatsAppCloudResult =
  | { ok: true; messageId: string }
  | { ok: false; error: WhatsAppCloudError };

function configuredValue(name: string, env: WhatsAppEnvironment) {
  return env[name]?.trim() || "";
}

function selectedProvider(env: WhatsAppEnvironment): WhatsAppProvider | null {
  const value = configuredValue("WHATSAPP_PROVIDER", env).toLowerCase() || "meta";
  return value === "meta" || value === "360dialog" ? value : null;
}

function normalizeD360BaseUrl(value: string | undefined) {
  const candidate = (value?.trim() || "https://waba-v2.360dialog.io").replace(/\/+$/, "");
  try {
    const url = new URL(candidate);
    const isD360Host = url.hostname === "360dialog.io" || url.hostname.endsWith(".360dialog.io");
    if (
      url.protocol !== "https:"
      || !isD360Host
      || url.username
      || url.password
      || url.pathname !== "/"
      || url.search
      || url.hash
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getWhatsAppCloudReadiness(
  env: WhatsAppEnvironment = process.env,
) {
  const provider = selectedProvider(env);
  const accessTokenConfigured = configuredValue("WHATSAPP_ACCESS_TOKEN", env).length > 0;
  const phoneNumberIdConfigured = /^\d{5,32}$/.test(configuredValue("WHATSAPP_PHONE_NUMBER_ID", env));
  const graphApiVersionConfigured = /^v\d+\.\d+$/.test(configuredValue("WHATSAPP_GRAPH_API_VERSION", env));
  const d360ApiKeyConfigured = configuredValue("D360_API_KEY", env).length >= 16;
  const d360BaseUrlConfigured = normalizeD360BaseUrl(env.D360_BASE_URL) !== null;
  const authEnabled = configuredValue("ATLAS_WHATSAPP_AUTH_ENABLED", env) === "true";
  const authTemplateConfigured = configuredValue("ATLAS_WHATSAPP_AUTH_TEMPLATE_NAME", env).length > 0;
  const staffInviteTemplateConfigured = configuredValue("ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE_NAME", env).length > 0;
  const senderConfigured = provider === "meta"
    ? accessTokenConfigured && phoneNumberIdConfigured && graphApiVersionConfigured
    : provider === "360dialog"
      ? d360ApiKeyConfigured && d360BaseUrlConfigured
      : false;

  return {
    provider: provider ?? "unsupported",
    providerConfigured: provider !== null,
    accessTokenConfigured,
    phoneNumberIdConfigured,
    graphApiVersionConfigured,
    d360ApiKeyConfigured,
    d360BaseUrlConfigured,
    authEnabled,
    authTemplateConfigured,
    staffInviteTemplateConfigured,
    senderConfigured,
  };
}

function providerConfig(env: WhatsAppEnvironment): WhatsAppProviderConfig | null {
  const readiness = getWhatsAppCloudReadiness(env);
  if (!readiness.senderConfigured) return null;

  if (readiness.provider === "360dialog") {
    const baseUrl = normalizeD360BaseUrl(env.D360_BASE_URL);
    if (!baseUrl) return null;
    return {
      provider: "360dialog",
      endpoint: `${baseUrl}/messages`,
      headers: {
        "D360-API-KEY": configuredValue("D360_API_KEY", env),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };
  }

  if (readiness.provider !== "meta") return null;
  return {
    provider: "meta",
    endpoint: `https://graph.facebook.com/${configuredValue("WHATSAPP_GRAPH_API_VERSION", env)}/${configuredValue("WHATSAPP_PHONE_NUMBER_ID", env)}/messages`,
    headers: {
      Authorization: `Bearer ${configuredValue("WHATSAPP_ACCESS_TOKEN", env)}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
}

function classifyProviderFailure(status: number, body: any): WhatsAppCloudError {
  const code = Number(body?.error?.code ?? 0);
  if (status === 429 || code === 130429 || code === 80007) return "provider_rate_limited";
  if (code === 132001 || code === 132015 || code === 132016) return "template_not_ready";
  return "delivery_failed";
}

async function sendTemplate(input: {
  to: string;
  templateName: string;
  language: string;
  components: Array<Record<string, unknown>>;
}, options: WhatsAppSendOptions = {}): Promise<WhatsAppCloudResult> {
  const env = options.env ?? process.env;
  const sender = providerConfig(env);
  if (!sender) return { ok: false, error: "whatsapp_not_configured" };
  if (configuredValue("ATLAS_WHATSAPP_AUTH_ENABLED", env) !== "true") {
    return { ok: false, error: "whatsapp_disabled" };
  }

  const fetchImplementation = options.fetchImplementation ?? fetch;
  const response = await fetchImplementation(sender.endpoint, {
    method: "POST",
    headers: sender.headers,
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.to.replace(/^\+/, ""),
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.language },
        components: input.components,
      },
    }),
    signal: AbortSignal.timeout(12_000),
  }).catch(() => null);

  if (!response) return { ok: false, error: "delivery_failed" };

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    // The response status is still enough to classify a generic failure.
  }

  const messageId = Array.isArray(body?.messages) && typeof body.messages[0]?.id === "string"
    ? body.messages[0].id
    : null;
  if (response.ok && messageId) return { ok: true, messageId };

  const error = classifyProviderFailure(response.status, body);
  console.error("Atlas WhatsApp template delivery rejected", {
    provider: sender.provider,
    status: response.status,
    providerCode: body?.error?.code ?? "unknown",
    providerSubcode: body?.error?.error_subcode ?? "unknown",
    class: error,
  });
  return { ok: false, error };
}

export async function sendWhatsAppAuthenticationCode(
  phone: string,
  code: string,
  options: WhatsAppSendOptions = {},
): Promise<WhatsAppCloudResult> {
  const env = options.env ?? process.env;
  return sendTemplate({
    to: phone,
    templateName: configuredValue("ATLAS_WHATSAPP_AUTH_TEMPLATE_NAME", env) || "atlas_login_code",
    language: configuredValue("ATLAS_WHATSAPP_AUTH_TEMPLATE_LANGUAGE", env) || "en_US",
    components: [
      {
        type: "body",
        parameters: [{ type: "text", text: code }],
      },
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "text", text: code }],
      },
    ],
  }, options);
}

export async function sendWhatsAppStaffInvite(input: {
  phone: string;
  clinicName: string;
  inviteToken: string;
}, options: WhatsAppSendOptions = {}): Promise<WhatsAppCloudResult> {
  const env = options.env ?? process.env;
  return sendTemplate({
    to: input.phone,
    templateName: configuredValue("ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE_NAME", env) || "atlas_staff_invite",
    language: configuredValue("ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE_LANGUAGE", env) || "en_US",
    components: [
      {
        type: "body",
        parameters: [{ type: "text", text: input.clinicName.slice(0, 120) }],
      },
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "text", text: input.inviteToken }],
      },
    ],
  }, options);
}
