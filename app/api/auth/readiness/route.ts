import { NextResponse } from "next/server";
import { getAtlasAuthReadiness } from "@/lib/auth-readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = await getAtlasAuthReadiness();
  return NextResponse.json(readiness, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
