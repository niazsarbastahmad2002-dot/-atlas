import { NextResponse } from "next/server";
import { getAtlasAuthReadiness } from "@/lib/auth-readiness";
import { getWhatsAppCloudReadiness } from "@/lib/whatsapp-cloud";

export const dynamic = "force-dynamic";

function present(name: string) {
  return Boolean(process.env[name]?.trim());
}

export async function GET() {
  const readiness = await getAtlasAuthReadiness();
  const whatsapp = getWhatsAppCloudReadiness();
  const dedicatedSecret = process.env.ATLAS_AUTH_SECRET?.trim() ?? "";
  const dedicatedAuthHashSecretConfigured = dedicatedSecret.length >= 32;
  const authHashSecretConfigured = dedicatedAuthHashSecretConfigured
    || present("SUPABASE_SECRET_KEY")
    || present("SUPABASE_SERVICE_ROLE_KEY");

  return NextResponse.json({
    ...readiness,
    // Direct WhatsApp-first auth does not depend on Supabase Phone Auth. A
    // dedicated stable HMAC key is mandatory once the production kill switch is on.
    whatsappSenderConfigured: whatsapp.senderConfigured,
    whatsappAuthEnabled: whatsapp.authEnabled,
    whatsappAuthReadyForAttempt: whatsapp.senderConfigured
      && whatsapp.authEnabled
      && dedicatedAuthHashSecretConfigured,
    whatsappStaffInviteReadyForAttempt: whatsapp.senderConfigured
      && whatsapp.authEnabled
      && dedicatedAuthHashSecretConfigured,
    whatsappAccessTokenConfigured: whatsapp.accessTokenConfigured,
    whatsappPhoneNumberIdConfigured: whatsapp.phoneNumberIdConfigured,
    whatsappGraphApiVersionConfigured: whatsapp.graphApiVersionConfigured,
    whatsappAuthTemplateNameConfigured: whatsapp.authTemplateConfigured,
    whatsappStaffInviteTemplateNameConfigured: whatsapp.staffInviteTemplateConfigured,
    authHashSecretConfigured,
    dedicatedAuthHashSecretConfigured,
    whatsappAppSecretConfigured: present("WHATSAPP_APP_SECRET"),
    // Historical reminder-delivery switch; kept separate from authentication.
    whatsappReminderDeliveryEnabled: process.env.WHATSAPP_ENABLED === "true",
  }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
