import { NextResponse } from "next/server";
import type { MetaTemplateStatus } from "@/lib/reminders/meta-readiness";
import { bootstrapMetaSupportTemplates } from "@/lib/reminders/meta-support-templates";
import { bootstrapAtlasAppointmentReminderTemplates } from "@/lib/reminders/meta-template-bootstrap";
import {
  ATLAS_WHATSAPP_META_TEST_MODE,
  readAtlasWhatsAppRuntime,
} from "@/lib/reminders/whatsapp-runtime";
import { constantTimeEqual } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const header = request.headers.get("authorization");
  const secret = process.env.WHATSAPP_TEST_ADMIN_SECRET?.trim();
  return Boolean(
    header?.startsWith("Bearer ")
    && secret
    && secret.length >= 24
    && constantTimeEqual(header.slice(7), secret),
  );
}

async function existingTemplates(
  accessToken: string,
  graphApiVersion: string,
  wabaId: string,
): Promise<MetaTemplateStatus[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(
      `https://graph.facebook.com/${graphApiVersion}/${wabaId}/message_templates?fields=name,status,language,category&limit=100`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    const body = await response.json() as { data?: unknown };
    if (!Array.isArray(body.data)) return [];
    return body.data.flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const row = raw as Record<string, unknown>;
      if (typeof row.name !== "string" || typeof row.language !== "string" || typeof row.status !== "string") return [];
      return [{
        name: row.name,
        language: row.language,
        status: row.status.toUpperCase(),
        category: typeof row.category === "string" ? row.category.toUpperCase() : null,
      }];
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "test_mode_forbidden" }, { status: 403 });
  }
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let runtimeConfig;
  try { runtimeConfig = readAtlasWhatsAppRuntime(); } catch {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }
  if (!runtimeConfig || runtimeConfig.mode !== ATLAS_WHATSAPP_META_TEST_MODE || !runtimeConfig.wabaId) {
    return NextResponse.json({ error: "test_mode_not_configured" }, { status: 503 });
  }

  const templates = await existingTemplates(
    runtimeConfig.config.accessToken,
    runtimeConfig.config.graphApiVersion,
    runtimeConfig.wabaId,
  );
  if (!templates) return NextResponse.json({ error: "template_list_failed" }, { status: 502 });

  const [patientLoop, support] = await Promise.all([
    bootstrapAtlasAppointmentReminderTemplates({
      accessToken: runtimeConfig.config.accessToken,
      graphApiVersion: runtimeConfig.config.graphApiVersion,
      wabaId: runtimeConfig.wabaId,
      existingTemplates: templates,
    }),
    bootstrapMetaSupportTemplates({
      accessToken: runtimeConfig.config.accessToken,
      graphApiVersion: runtimeConfig.config.graphApiVersion,
      wabaId: runtimeConfig.wabaId,
      existingTemplates: templates,
    }),
  ]);

  return NextResponse.json({
    ok: [...patientLoop, ...support].every((item) => item.errorCode === null),
    patientLoop,
    support,
  }, { headers: { "Cache-Control": "no-store" } });
}
