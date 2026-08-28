import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("isolated Meta OTP cannot pretend success before the test conversation window is opened", () => {
  const client = source("lib/supabase/client.ts");
  const relay = source("app/api/auth/test-supabase/route.ts");
  const helper = source("app/api/auth/test-whatsapp-window/route.ts");

  assert.match(client, /atlas-meta-test-window-confirmed-until/);
  assert.match(client, /x-atlas-meta-test-window-confirmed/);
  assert.match(relay, /meta_test_conversation_window_required/);
  assert.match(relay, /x-atlas-meta-test-window-confirmed/);
  assert.match(helper, /VERCEL_ENV === "production"/);
  assert.match(helper, /ATLAS_WHATSAPP_MODE !== "meta_test"/);
  assert.match(helper, /\+1 \(555\) 668-5747/);
  assert.match(helper, /Atlas test/);
  assert.match(helper, /23 \* 60 \* 60 \* 1000/);
});
