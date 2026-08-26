import { NextRequest, NextResponse } from "next/server";
import {
  ATLAS_WHATSAPP_META_TEST_MODE,
  ATLAS_WHATSAPP_OTP_TEMPLATE,
  readAtlasWhatsAppRuntime,
} from "@/lib/reminders/whatsapp-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TemplateRow = {
  name?: string;
  status?: string;
  language?: string;
  category?: string;
  rejected_reason?: string;
};

function safeError(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const error = (value as { error?: unknown }).error;
  if (!error || typeof error !== "object") return null;
  const row = error as { code?: unknown; message?: unknown; error_user_title?: unknown; error_user_msg?: unknown };
  return {
    code: typeof row.code === "number" || typeof row.code === "string" ? String(row.code) : null,
    message: typeof row.message === "string" ? row.message.slice(0, 500) : null,
    title: typeof row.error_user_title === "string" ? row.error_user_title.slice(0, 200) : null,
    userMessage: typeof row.error_user_msg === "string" ? row.error_user_msg.slice(0, 500) : null,
  };
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (request.nextUrl.searchParams.get("key") !== "atlas-otp-repair-20260826") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let runtimeConfig;
  try {
    runtimeConfig = readAtlasWhatsAppRuntime();
  } catch {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }
  if (!runtimeConfig || runtimeConfig.mode !== ATLAS_WHATSAPP_META_TEST_MODE || !runtimeConfig.wabaId) {
    return NextResponse.json({ error: "test_mode_not_configured" }, { status: 503 });
  }

  const { accessToken, graphApiVersion } = runtimeConfig.config;
  const wabaId = runtimeConfig.wabaId;
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" };

  const listResponse = await fetch(
    `https://graph.facebook.com/${graphApiVersion}/${wabaId}/message_templates?fields=name,status,language,category,rejected_reason&limit=100`,
    { headers, cache: "no-store" },
  );
  const listBody = await listResponse.json() as { data?: TemplateRow[] } & Record<string, unknown>;
  if (!listResponse.ok) {
    return NextResponse.json({ ok: false, stage: "list", providerError: safeError(listBody) }, { status: 502 });
  }

  const templates = Array.isArray(listBody.data) ? listBody.data : [];
  const rejectedTest = templates.find((row) => row.name === "atlas_login_otp_test_v1" && row.language === "en_US") ?? null;
  const proper = templates.find((row) => row.name === ATLAS_WHATSAPP_OTP_TEMPLATE && row.language === "en_US") ?? null;

  if (proper) {
    return NextResponse.json({
      ok: true,
      action: "existing_proper_template",
      rejectedTest: rejectedTest ? {
        status: rejectedTest.status ?? null,
        category: rejectedTest.category ?? null,
        rejectedReason: rejectedTest.rejected_reason ?? null,
      } : null,
      properTemplate: {
        name: proper.name ?? null,
        status: proper.status ?? null,
        category: proper.category ?? null,
        rejectedReason: proper.rejected_reason ?? null,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const createResponse = await fetch(
    `https://graph.facebook.com/${graphApiVersion}/${wabaId}/message_templates`,
    {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({
        name: ATLAS_WHATSAPP_OTP_TEMPLATE,
        language: "en_US",
        category: "AUTHENTICATION",
        components: [
          { type: "BODY", add_security_recommendation: true },
          { type: "FOOTER", code_expiration_minutes: 5 },
          {
            type: "BUTTONS",
            buttons: [{ type: "OTP", otp_type: "COPY_CODE", text: "Copy Code" }],
          },
        ],
      }),
    },
  );
  const createBody = await createResponse.json() as Record<string, unknown>;

  return NextResponse.json({
    ok: createResponse.ok,
    action: "create_proper_authentication_template",
    rejectedTest: rejectedTest ? {
      status: rejectedTest.status ?? null,
      category: rejectedTest.category ?? null,
      rejectedReason: rejectedTest.rejected_reason ?? null,
    } : null,
    created: createResponse.ok ? {
      status: typeof createBody.status === "string" ? createBody.status : null,
      category: typeof createBody.category === "string" ? createBody.category : null,
      idPresent: typeof createBody.id === "string",
    } : null,
    providerError: createResponse.ok ? null : safeError(createBody),
  }, {
    status: createResponse.ok ? 200 : 502,
    headers: { "Cache-Control": "no-store" },
  });
}
