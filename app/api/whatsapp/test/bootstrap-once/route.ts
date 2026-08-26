import { NextRequest, NextResponse } from "next/server";
import type { MetaTemplateStatus } from "@/lib/reminders/meta-readiness";
import { bootstrapMetaSupportTemplates } from "@/lib/reminders/meta-test-templates";
import { bootstrapAtlasAppointmentReminderTemplates } from "@/lib/reminders/meta-template-bootstrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_TIME_KEY = "zCPtqbziRL0XkP0m1npbEGvlkPBGO-7RWt7titvXb1k";

function safeConfig() {
  const accessToken = process.env.WHATSAPP_TEST_ACCESS_TOKEN?.trim() ?? "";
  const wabaId = process.env.WHATSAPP_TEST_WABA_ID?.trim() ?? "";
  const graphApiVersion = (
    process.env.WHATSAPP_TEST_GRAPH_API_VERSION
    ?? process.env.WHATSAPP_GRAPH_API_VERSION
    ?? "v25.0"
  ).trim();
  if (
    process.env.ATLAS_WHATSAPP_MODE !== "meta_test"
    || process.env.WHATSAPP_TEST_ENABLED !== "true"
    || !accessToken
    || !/^\d{5,32}$/.test(wabaId)
    || !/^v\d+\.\d+$/.test(graphApiVersion)
  ) return null;
  return { accessToken, wabaId, graphApiVersion };
}

async function createUtilityTemplate(
  config: NonNullable<ReturnType<typeof safeConfig>>,
  name: string,
  text: string,
  examples: string[],
) {
  const response = await fetch(
    `https://graph.facebook.com/${config.graphApiVersion}/${config.wabaId}/message_templates`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name,
        language: "en_US",
        category: "UTILITY",
        components: [{ type: "BODY", text, example: { body_text: [examples] } }],
      }),
      cache: "no-store",
    },
  );
  let body: Record<string, unknown> = {};
  try { body = await response.json() as Record<string, unknown>; } catch {}
  const error = body.error && typeof body.error === "object" ? body.error as Record<string, unknown> : null;
  return {
    name,
    ok: response.ok,
    status: response.status,
    id: typeof body.id === "string" ? body.id : null,
    templateStatus: typeof body.status === "string" ? body.status : null,
    errorCode: typeof error?.code === "number" || typeof error?.code === "string" ? String(error.code) : null,
    errorMessage: typeof error?.message === "string" ? error.message.slice(0, 220) : null,
  };
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (request.nextUrl.searchParams.get("key") !== ONE_TIME_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const config = safeConfig();
  if (!config) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const listResponse = await fetch(
    `https://graph.facebook.com/${config.graphApiVersion}/${config.wabaId}/message_templates?fields=name,status,language,category&limit=100`,
    {
      headers: { Authorization: `Bearer ${config.accessToken}`, Accept: "application/json" },
      cache: "no-store",
    },
  );
  if (!listResponse.ok) return NextResponse.json({ error: "template_list_failed" }, { status: 502 });
  const listBody = await listResponse.json() as { data?: Array<Record<string, unknown>> };
  const existing: MetaTemplateStatus[] = (listBody.data ?? []).flatMap((row) => (
    typeof row.name === "string" && typeof row.status === "string" && typeof row.language === "string"
      ? [{
          name: row.name,
          status: row.status.toUpperCase(),
          language: row.language,
          category: typeof row.category === "string" ? row.category.toUpperCase() : null,
        }]
      : []
  ));

  const [patientLoop, support] = await Promise.all([
    bootstrapAtlasAppointmentReminderTemplates({ ...config, existingTemplates: existing }),
    bootstrapMetaSupportTemplates({ ...config, existingTemplates: existing }),
  ]);

  const fallbackNames = new Set(existing.map((item) => item.name));
  const fallback = [] as Array<Awaited<ReturnType<typeof createUtilityTemplate>>>;
  if (!fallbackNames.has("atlas_login_otp_test_v1")) {
    fallback.push(await createUtilityTemplate(
      config,
      "atlas_login_otp_test_v1",
      "Your Atlas test code is {{1}}. It expires in 5 minutes.",
      ["561166"],
    ));
  }
  if (!fallbackNames.has("atlas_staff_invite_test_v1")) {
    fallback.push(await createUtilityTemplate(
      config,
      "atlas_staff_invite_test_v1",
      "You have an Atlas test invitation for {{1}}. Open this secure link: {{2}}",
      ["Atlas Clinic", "https://example.com/join/test-token"],
    ));
  }

  return NextResponse.json({ patientLoop, support, fallback }, { headers: { "Cache-Control": "no-store" } });
}
