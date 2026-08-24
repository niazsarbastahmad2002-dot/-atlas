import { sendWhatsAppStaffInvite } from "@/lib/whatsapp-cloud";

export type WhatsAppInviteResult =
  | { ok: true; messageId: string }
  | { ok: false; error: "whatsapp_not_configured" | "delivery_failed" };

export async function sendReceptionistInviteWhatsApp(input: {
  phone: string;
  clinicName: string;
  inviteToken: string;
}): Promise<WhatsAppInviteResult> {
  const result = await sendWhatsAppStaffInvite(input);
  if (result.ok) return result;
  return {
    ok: false,
    error: result.error === "whatsapp_not_configured"
      || result.error === "whatsapp_disabled"
      || result.error === "template_not_ready"
      ? "whatsapp_not_configured"
      : "delivery_failed",
  };
}
