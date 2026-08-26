import { NextResponse } from "next/server";
import {
  ATLAS_WHATSAPP_META_TEST_MODE,
  readAtlasWhatsAppRuntime,
} from "@/lib/reminders/whatsapp-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "test_mode_forbidden" }, { status: 403 });
  }

  let runtimeConfig;
  try {
    runtimeConfig = readAtlasWhatsAppRuntime();
  } catch {
    return NextResponse.json({ ok: false, error: "test_mode_not_configured" }, { status: 503 });
  }

  if (!runtimeConfig || runtimeConfig.mode !== ATLAS_WHATSAPP_META_TEST_MODE || !runtimeConfig.wabaId) {
    return NextResponse.json({ ok: false, error: "test_mode_not_configured" }, { status: 503 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(
      `https://graph.facebook.com/${runtimeConfig.config.graphApiVersion}/${runtimeConfig.config.phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating`,
      {
        headers: {
          Authorization: `Bearer ${runtimeConfig.config.accessToken}`,
          Accept: "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: "meta_credentials_rejected", status: response.status }, { status: 502 });
    }

    const body = await response.json() as Record<string, unknown>;
    return NextResponse.json({
      ok: true,
      mode: runtimeConfig.mode,
      phoneNumberIdMatches: body.id === runtimeConfig.config.phoneNumberId,
      displayPhoneNumber: typeof body.display_phone_number === "string" ? body.display_phone_number : null,
      verifiedName: typeof body.verified_name === "string" ? body.verified_name : null,
      qualityRating: typeof body.quality_rating === "string" ? body.quality_rating : null,
      allowedRecipientCount: runtimeConfig.allowedRecipients?.length ?? 0,
      wabaConfigured: Boolean(runtimeConfig.wabaId),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "meta_health_check_failed" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
