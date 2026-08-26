import { NextResponse } from "next/server";
import { bootstrapAtlasMetaTemplateSuite } from "@/lib/reminders/meta-template-suite";
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

  const suite = await bootstrapAtlasMetaTemplateSuite({
    accessToken: runtimeConfig.config.accessToken,
    graphApiVersion: runtimeConfig.config.graphApiVersion,
    wabaId: runtimeConfig.wabaId,
  });

  return NextResponse.json(suite, {
    status: suite.error === "template_list_failed" ? 502 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
