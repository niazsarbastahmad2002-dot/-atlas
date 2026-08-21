import { NextResponse } from "next/server";
import { getAtlasAuthReadiness } from "@/lib/auth-readiness";

export const dynamic = "force-dynamic";

function present(name: string) {
  return Boolean(process.env[name]?.trim());
}

export async function GET() {
  const readiness = await getAtlasAuthReadiness();
  const directMetaSenderConfigured = present("WHATSAPP_ACCESS_TOKEN")
    && /^\d+$/.test(process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "")
    && present("WHATSAPP_GRAPH_API_VERSION");

  return NextResponse.json({
    ...readiness,
    directMetaSenderConfigured,
    whatsappAccessTokenConfigured: present("WHATSAPP_ACCESS_TOKEN"),
    whatsappPhoneNumberIdConfigured: /^\d+$/.test(process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? ""),
    whatsappAppSecretConfigured: present("WHATSAPP_APP_SECRET"),
    whatsappEnabled: process.env.WHATSAPP_ENABLED === "true",
  }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
