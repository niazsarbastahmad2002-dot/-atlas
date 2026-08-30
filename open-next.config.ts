// Cloudflare-only build dependency; installed ephemerally by the backup build.
// @ts-ignore -- intentionally absent from the normal Vercel dependency graph.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
