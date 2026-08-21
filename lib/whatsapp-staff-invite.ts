export type WhatsAppInviteResult =
  | { ok: true; messageId: string }
  | { ok: false; error: "whatsapp_not_configured" | "delivery_failed" };

function config() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim();
  if (!accessToken || !/^\d{5,32}$/.test(phoneNumberId ?? "") || !/^v\d+\.\d+$/.test(graphApiVersion ?? "")) return null;
  return {
    accessToken,
    phoneNumberId: phoneNumberId!,
    graphApiVersion: graphApiVersion!,
    templateName: process.env.ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE_NAME?.trim() || "atlas_staff_invite",
    language: process.env.ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE_LANGUAGE?.trim() || "en_US",
  };
}

export async function sendReceptionistInviteWhatsApp(input: {
  phone: string;
  clinicName: string;
  inviteToken: string;
}): Promise<WhatsAppInviteResult> {
  const sender = config();
  if (!sender) return { ok: false, error: "whatsapp_not_configured" };

  const response = await fetch(`https://graph.facebook.com/${sender.graphApiVersion}/${sender.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sender.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.phone.replace(/^\+/, ""),
      type: "template",
      template: {
        name: sender.templateName,
        language: { code: sender.language },
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
      },
    }),
    signal: AbortSignal.timeout(12_000),
  }).catch(() => null);

  if (!response) return { ok: false, error: "delivery_failed" };
  let body: any = null;
  try { body = await response.json(); } catch {}
  const id = Array.isArray(body?.messages) && typeof body.messages[0]?.id === "string" ? body.messages[0].id : null;
  if (response.ok && id) return { ok: true, messageId: id };
  console.error("Atlas WhatsApp staff invite rejected", { status: response.status, code: body?.error?.code ?? "unknown" });
  return { ok: false, error: "delivery_failed" };
}
