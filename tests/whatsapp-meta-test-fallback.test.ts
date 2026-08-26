import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Meta test fallbacks stay test-only while production remains template-only", () => {
  const hook = source("app/api/auth/send-sms-hook/route.ts");
  const invites = source("app/dashboard/staff/invite-actions.ts");
  const testRuntime = source("lib/reminders/whatsapp-runtime.ts");

  assert.match(hook, /runtimeConfig\?\.mode === ATLAS_WHATSAPP_META_TEST_MODE/);
  assert.match(hook, /if \(!result\.accepted && testMode\)/);
  assert.match(hook, /sendWhatsAppTextMessage/);
  assert.match(invites, /if \(!sent\.accepted && delivery\.testMode\)/);
  assert.match(invites, /sendWhatsAppTextMessage/);
  assert.match(testRuntime, /VERCEL_ENV === "production"/);
  assert.match(testRuntime, /Meta test WhatsApp mode is forbidden in production/);
});

test("Meta test recipient restriction is optional but malformed configured values fail closed", () => {
  const runtime = source("lib/reminders/whatsapp-runtime.ts");
  assert.match(runtime, /if \(!raw\) return null/);
  assert.match(runtime, /Meta test recipient allowlist must contain valid E\.164 numbers/);
  assert.match(runtime, /runtime\.allowedRecipients === null \|\| runtime\.allowedRecipients\.includes\(phone\)/);
});
