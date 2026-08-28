import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("isolated Meta OTP relay stays preview-only without relying on browser-local window state", () => {
  const client = source("lib/supabase/client.ts");
  const relay = source("app/api/auth/test-supabase/route.ts");
  const helper = source("app/api/auth/test-whatsapp-window/route.ts");

  assert.doesNotMatch(client, /atlas-meta-test-window-confirmed-until/);
  assert.doesNotMatch(client, /x-atlas-meta-test-window-confirmed/);
  assert.doesNotMatch(relay, /meta_test_conversation_window_required/);
  assert.doesNotMatch(relay, /x-atlas-meta-test-window-confirmed/);
  assert.match(relay, /VERCEL_ENV === "production"/);
  assert.match(relay, /ATLAS_WHATSAPP_MODE !== "meta_test"/);
  assert.match(helper, /VERCEL_ENV === "production"/);
  assert.match(helper, /ATLAS_WHATSAPP_MODE !== "meta_test"/);
  assert.match(helper, /\+1 \(555\) 668-5747/);
});
