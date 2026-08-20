import { NextResponse } from "next/server";
import { appleApplicationIdentifier, buildAppleAppSiteAssociation } from "@/lib/apple-associated-domains";

export const dynamic = "force-dynamic";

export function GET() {
  const appIdentifier = appleApplicationIdentifier(
    process.env.ATLAS_APPLE_APP_PREFIX ?? process.env.ATLAS_APPLE_TEAM_ID,
    process.env.ATLAS_IOS_BUNDLE_ID,
  );

  if (!appIdentifier) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(buildAppleAppSiteAssociation(appIdentifier), {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Content-Type": "application/json",
    },
  });
}
