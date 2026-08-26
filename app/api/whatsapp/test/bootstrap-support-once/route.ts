import { NextRequest, NextResponse } from "next/server";
import type { MetaTemplateStatus } from "@/lib/reminders/meta-readiness";
import { bootstrapMetaSupportTemplates } from "@/lib/reminders/meta-test-templates";
import { ATLAS_WHATSAPP_META_TEST_MODE, readAtlasWhatsAppRuntime } from "@/lib/reminders/whatsapp-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_TIME_KEY = "mqsBRdL9QdGsQaST7zlBNL6Q2zSN7oHo1X5Ong5PZ-8";

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (request.nextUrl.searchParams.get("key") !== ONE_TIME_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let runtimeConfig;
  try { runtimeConfig = readAtlasWhatsAppRuntime(); } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!runtimeConfig || runtimeConfig.mode !== ATLAS_WHATSAPP_META_TEST_MODE || !runtimeConfig.wabaId) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { config, wabaId } = runtimeConfig;
  const listResponse = await fetch(
    `https://graph.facebook.com/${config.graphApiVersion}/${wabaId}/message_templates?fields=name,status,language,category&limit=100`,
    { headers: { Authorization: `Bearer ${config.accessToken}`, Accept: "application/json" }, cache: "no-store" },
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

  const results = await bootstrapMetaSupportTemplates({
    accessToken: config.accessToken,
    graphApiVersion: config.graphApiVersion,
    wabaId,
    existingTemplates: existing,
  });
  return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
}
