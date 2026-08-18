import { sanitizeAtlasAnalyticsPayload } from "@/lib/analytics/schema";

export const runtime = "nodejs";

// PostHog project tokens are public ingestion keys. Keeping the browser behind this
// Atlas endpoint lets us enforce a strict healthcare-safe event schema and avoids
// forwarding receptionist/patient IP addresses or browser headers to PostHog.
const POSTHOG_PROJECT_TOKEN = process.env.POSTHOG_PROJECT_TOKEN
  ?? "phc_pbPnXskEw4qX4T8YDTKNt7budrT6KWomnhBWqPxebSzS";
const POSTHOG_INGEST_URL = process.env.POSTHOG_INGEST_URL
  ?? "https://us.i.posthog.com/i/v0/e/";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 4096 || !sameOrigin(request)) {
    return new Response(null, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const safe = sanitizeAtlasAnalyticsPayload(body);
  if (!safe) return new Response(null, { status: 400 });

  try {
    const response = await fetch(POSTHOG_INGEST_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_PROJECT_TOKEN,
        event: safe.event,
        distinct_id: safe.session_id,
        properties: {
          ...safe.properties,
          $process_person_profile: false,
          atlas_source: "server_proxy",
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });

    if (!response.ok) {
      console.warn("Atlas analytics ingestion failed", response.status);
    }
  } catch {
    // Analytics must never slow down or break the receptionist workflow.
  }

  return new Response(null, { status: 204 });
}
