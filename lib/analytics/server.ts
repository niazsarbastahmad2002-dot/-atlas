import { after } from "next/server";
import type { AtlasAnalyticsEvent, AtlasAnalyticsProperties } from "./schema";

const POSTHOG_PROJECT_TOKEN = process.env.POSTHOG_PROJECT_TOKEN
  ?? "phc_pbPnXskEw4qX4T8YDTKNt7budrT6KWomnhBWqPxebSzS";
const POSTHOG_INGEST_URL = process.env.POSTHOG_INGEST_URL
  ?? "https://us.i.posthog.com/i/v0/e/";

async function capture(event: AtlasAnalyticsEvent, properties: AtlasAnalyticsProperties) {
  try {
    await fetch(POSTHOG_INGEST_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_PROJECT_TOKEN,
        event,
        distinct_id: `atlas_event_${crypto.randomUUID()}`,
        properties: {
          ...properties,
          $process_person_profile: false,
          atlas_source: "server_action",
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // Analytics is deliberately best-effort and must never affect clinic work.
  }
}

export function queueAtlasServerEvent(event: AtlasAnalyticsEvent, properties: AtlasAnalyticsProperties = {}) {
  after(() => capture(event, properties));
}
