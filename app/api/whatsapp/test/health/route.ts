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
  const headers = { Authorization: `Bearer ${accessToken}`, Accept: "application/json" };
  try {
    const [phoneResponse, templateResponse] = await Promise.all([
      fetch(
        `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating`,
        { headers, signal: controller.signal, cache: "no-store" },
      ),
      fetch(
        `https://graph.facebook.com/${graphApiVersion}/${wabaId}/message_templates?fields=name,status,language,category&limit=20`,
        { headers, signal: controller.signal, cache: "no-store" },
      ),
    ]);

    if (!phoneResponse.ok) {
      return NextResponse.json({ ok: false, error: "meta_credentials_rejected", status: phoneResponse.status, config: presence }, { status: 502 });
    }

    const phone = await phoneResponse.json() as Record<string, unknown>;
    const templateBody = templateResponse.ok
      ? await templateResponse.json() as { data?: Array<Record<string, unknown>> }
      : null;
    const templates = (templateBody?.data ?? []).flatMap((row) => (
      typeof row.name === "string" && typeof row.status === "string" && typeof row.language === "string"
        ? [{
            name: row.name,
            status: row.status,
            language: row.language,
            category: typeof row.category === "string" ? row.category : null,
          }]
        : []
    ));

    return NextResponse.json({
      ok: true,
      mode: "meta_test",
      phoneNumberIdMatches: phone.id === phoneNumberId,
      displayPhoneNumber: typeof phone.display_phone_number === "string" ? phone.display_phone_number : null,
      verifiedName: typeof phone.verified_name === "string" ? phone.verified_name : null,
      qualityRating: typeof phone.quality_rating === "string" ? phone.quality_rating : null,
      recipientAllowlistConfigured: presence.allowedRecipients,
      wabaConfigured: true,
      templateListAccessible: templateResponse.ok,
      templates,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "meta_health_check_failed", config: presence }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
