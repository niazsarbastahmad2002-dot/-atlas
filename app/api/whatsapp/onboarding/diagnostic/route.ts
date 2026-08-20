import { NextResponse } from "next/server";
import { readMetaEmbeddedSignupReadiness } from "@/lib/reminders/meta-embedded-signup";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = readMetaEmbeddedSignupReadiness();
  return NextResponse.json({
    configured: readiness.configured,
    enabled: readiness.enabled,
    blockers: readiness.blockers,
  }, { headers: { "Cache-Control": "no-store" } });
}
