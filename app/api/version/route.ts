import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown";

  return NextResponse.json(
    { ok: true, commit },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
