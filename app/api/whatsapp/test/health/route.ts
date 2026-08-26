import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function configPresence() {
  return {
    mode: process.env.ATLAS_WHATSAPP_MODE === "meta_test",
    enabled: process.env.WHATSAPP_TEST_ENABLED === "true",
    accessToken: Boolean(process.env.WHATSAPP_TEST_ACCESS_TOKEN?.trim()),
    phoneNumberId: Boolean(process.env.WHATSAPP_TEST_PHONE_NUMBER_ID?.trim()),
    wabaId: Boolean(process.env.WHATSAPP_TEST_WABA_ID?.trim()),
    allowedRecipients: Boolean(process.env.WHATSAPP_TEST_ALLOWED_RECIPIENTS?.trim()),
  };
}

export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "test_mode_forbidden" }, { status: 403 });
  }

  const presence = configPresence();
  const accessToken = process.env.WHATSAPP_TEST_ACCESS_TOKEN?.trim() ?? "";
  const phoneNumberId = process.env.WHATSAPP_TEST_PHONE_NUMBER_ID?.trim() ?? "";
  const wabaId = process.env.WHATSAPP_TEST_WABA_ID?.trim() ?? "";
  const graphApiVersion = (
    process.env.WHATSAPP_TEST_GRAPH_API_VERSION
    ?? process.env.WHATSAPP_GRAPH_API_VERSION
    ?? "v25.0"
  ).trim();

  if (
    !presence.mode
    || !presence.enabled
    || !accessToken
    || !/^\d{5,32}$/.test(phoneNumberId)
    || !/^\d{5,32}$/.test(wabaId)
    || !/^v\d+\.\d+$/.test(graphApiVersion)
  ) {
    return NextResponse.json({ ok: false, error: "test_transport_not_configured", config: presence }, { status: 503 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(
      `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: "meta_credentials_rejected", status: response.status, config: presence }, { status: 502 });
    }

    const body = await response.json() as Record<string, unknown>;
    return NextResponse.json({
      ok: true,
      mode: "meta_test",
      phoneNumberIdMatches: body.id === phoneNumberId,
      displayPhoneNumber: typeof body.display_phone_number === "string" ? body.display_phone_number : null,
      verifiedName: typeof body.verified_name === "string" ? body.verified_name : null,
      qualityRating: typeof body.quality_rating === "string" ? body.quality_rating : null,
      recipientAllowlistConfigured: presence.allowedRecipients,
      wabaConfigured: true,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "meta_health_check_failed", config: presence }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
