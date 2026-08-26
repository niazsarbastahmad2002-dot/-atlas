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
  return NextResponse.json({ patientLoop, support }, { headers: { "Cache-Control": "no-store" } });
}
