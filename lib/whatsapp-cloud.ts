type WhatsAppCloudConfig = {
  accessToken: string;
  phoneNumberId: string;
  graphApiVersion: string;
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

function configuredValue(name: string) {
  return process.env[name]?.trim() || "";
}

export function getWhatsAppCloudReadiness() {
  const accessTokenConfigured = configuredValue("WHATSAPP_ACCESS_TOKEN").length > 0;
  const phoneNumberIdConfigured = /^\d{5,32}$/.test(configuredValue("WHATSAPP_PHONE_NUMBER_ID"));
  const graphApiVersionConfigured = /^v\d+\.\d+$/.test(configuredValue("WHATSAPP_GRAPH_API_VERSION"));
  const authEnabled = configuredValue("ATLAS_WHATSAPP_AUTH_ENABLED") === "true";
  const authTemplateConfigured = configuredValue("ATLAS_WHATSAPP_AUTH_TEMPLATE_NAME").length > 0;
  const staffInviteTemplateConfigured = configuredValue("ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE_NAME").length > 0;

  return {
    accessTokenConfigured,
    phoneNumberIdConfigured,
    graphApiVersionConfigured,
    authEnabled,
    authTemplateConfigured,
    staffInviteTemplateConfigured,
    senderConfigured: accessTokenConfigured && phoneNumberIdConfigured && graphApiVersionConfigured,
  };
}

function config(): WhatsAppCloudConfig | null {
  const readiness = getWhatsAppCloudReadiness();
  if (!readiness.senderConfigured) return null;
  return {
    accessToken: configuredValue("WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId: configuredValue("WHATSAPP_PHONE_NUMBER_ID"),
    graphApiVersion: configuredValue("WHATSAPP_GRAPH_API_VERSION"),
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
}): Promise<WhatsAppCloudResult> {
  const sender = config();
  if (!sender) return { ok: false, error: "whatsapp_not_configured" };
  if (configuredValue("ATLAS_WHATSAPP_AUTH_ENABLED") !== "true") {
    return { ok: false, error: "whatsapp_disabled" };
  }

  const response = await fetch(`https://graph.facebook.com/${sender.graphApiVersion}/${sender.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sender.accessToken}`,
      "Content-Type": "application/json",
    },
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
  console.error("Atlas WhatsApp Cloud delivery rejected", {
    status: response.status,
    providerCode: body?.error?.code ?? "unknown",
    providerSubcode: body?.error?.error_subcode ?? "unknown",
    class: error,
  });
  return { ok: false, error };
}

export async function sendWhatsAppAuthenticationCode(phone: string, code: string): Promise<WhatsAppCloudResult> {
  return sendTemplate({
    to: phone,
    templateName: configuredValue("ATLAS_WHATSAPP_AUTH_TEMPLATE_NAME") || "atlas_login_code",
    language: configuredValue("ATLAS_WHATSAPP_AUTH_TEMPLATE_LANGUAGE") || "en_US",
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
  });
}

export async function sendWhatsAppStaffInvite(input: {
  phone: string;
  clinicName: string;
  inviteToken: string;
}): Promise<WhatsAppCloudResult> {
  return sendTemplate({
    to: input.phone,
    templateName: configuredValue("ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE_NAME") || "atlas_staff_invite",
    language: configuredValue("ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE_LANGUAGE") || "en_US",
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
  });
}
