import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  readSupabaseSendSmsHookValues,
  verifySupabaseSendSmsHook,
} from "../lib/auth/send-sms-hook.ts";
import {
  atlasWhatsAppRecipientAllowed,
  readAtlasWhatsAppRuntime,
} from "../lib/reminders/whatsapp-runtime.ts";
import {
  buildAuthenticationTemplatePayload,
  buildStaffInviteTemplatePayload,
} from "../lib/reminders/whatsapp.ts";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function metaTestEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    ATLAS_WHATSAPP_MODE: "meta_test",
    WHATSAPP_TEST_ENABLED: "true",
    WHATSAPP_TEST_ACCESS_TOKEN: "EAAtest-token-long-enough-for-meta-cloud-api",
    WHATSAPP_TEST_PHONE_NUMBER_ID: "123456789012345",
    WHATSAPP_TEST_WABA_ID: "987654321012345",
    WHATSAPP_TEST_APP_SECRET: "meta-test-app-secret-long-enough",
    WHATSAPP_TEST_VERIFY_TOKEN: "meta-test-verify-token-long-enough",
    WHATSAPP_TEST_GRAPH_API_VERSION: "v26.0",
    WHATSAPP_TEST_GLOBAL_DAILY_LIMIT: "100",
    WHATSAPP_TEST_ALLOWED_RECIPIENTS: "+9647501234567,+12025550123",
    ...overrides,
  };
}

test("Meta test runtime is isolated from production and optionally narrows Meta-registered recipients", () => {
  assert.throws(
    () => readAtlasWhatsAppRuntime(metaTestEnv({ VERCEL_ENV: "production" })),
    /forbidden in production/i,
  );
  assert.throws(
    () => readAtlasWhatsAppRuntime(metaTestEnv({ WHATSAPP_TEST_ALLOWED_RECIPIENTS: "not-a-phone" })),
    /recipient allowlist/i,
  );

  const runtime = readAtlasWhatsAppRuntime(metaTestEnv({ VERCEL_ENV: "preview" }));
  assert.ok(runtime);
  assert.equal(runtime.mode, "meta_test");
  assert.equal(runtime.config.phoneNumberId, "123456789012345");
  assert.equal(runtime.wabaId, "987654321012345");
  assert.equal(atlasWhatsAppRecipientAllowed(runtime, "+9647501234567"), true);
  assert.equal(atlasWhatsAppRecipientAllowed(runtime, "+9647509999999"), false);

  const metaOnlyRuntime = readAtlasWhatsAppRuntime(metaTestEnv({
    VERCEL_ENV: "preview",
    WHATSAPP_TEST_ALLOWED_RECIPIENTS: "",
  }));
  assert.ok(metaOnlyRuntime);
  assert.equal(metaOnlyRuntime.allowedRecipients, null);
  assert.equal(atlasWhatsAppRecipientAllowed(metaOnlyRuntime, "+9647509999999"), true);
  assert.equal(atlasWhatsAppRecipientAllowed(metaOnlyRuntime, "07509999999"), false);
});

test("production runtime continues to use only existing production credentials", () => {
  const runtime = readAtlasWhatsAppRuntime({
    ATLAS_WHATSAPP_MODE: "production",
    WHATSAPP_ENABLED: "true",
    WHATSAPP_ACCESS_TOKEN: "prod-token",
    WHATSAPP_PHONE_NUMBER_ID: "111111111111111",
    WHATSAPP_APP_SECRET: "production-app-secret-long-enough",
    WHATSAPP_VERIFY_TOKEN: "production-verify-token-long-enough",
    WHATSAPP_GRAPH_API_VERSION: "v26.0",
    WHATSAPP_GLOBAL_DAILY_LIMIT: "100",
    WHATSAPP_TEST_ACCESS_TOKEN: "must-not-be-used",
    WHATSAPP_TEST_PHONE_NUMBER_ID: "222222222222222",
  });
  assert.ok(runtime);
  assert.equal(runtime.mode, "production");
  assert.equal(runtime.config.phoneNumberId, "111111111111111");
  assert.equal(runtime.config.accessToken, "prod-token");
  assert.equal(runtime.allowedRecipients, null);
});

test("authentication template payload contains only the OTP transport fields", () => {
  const payload = buildAuthenticationTemplatePayload({
    recipientPhone: "+9647501234567",
    otp: "561166",
    templateName: "atlas_login_otp_v1",
  }) as any;
  assert.equal(payload.to, "+9647501234567");
  assert.equal(payload.template.name, "atlas_login_otp_v1");
  assert.equal(payload.template.language.code, "en_US");
  assert.equal(payload.template.components[0].parameters[0].text, "561166");
  assert.equal(payload.template.components[1].parameters[0].text, "561166");
  assert.equal(JSON.stringify(payload).includes("access_token"), false);
  assert.equal(buildAuthenticationTemplatePayload({
    recipientPhone: "+9647501234567",
    otp: "12345",
    templateName: "atlas_login_otp_v1",
  }), null);
});

test("staff invitation template accepts only an HTTPS one-use URL", () => {
  const payload = buildStaffInviteTemplatePayload({
    recipientPhone: "+9647501234567",
    clinicName: "Atlas Clinic",
    inviteUrl: "https://preview.example/join/one-use-token",
    templateName: "atlas_staff_invite_v1",
  }) as any;
  assert.deepEqual(payload.template.components[0].parameters.map((item: any) => item.text), [
    "Atlas Clinic",
    "https://preview.example/join/one-use-token",
  ]);
  assert.equal(buildStaffInviteTemplatePayload({
    recipientPhone: "+9647501234567",
    clinicName: "Atlas Clinic",
    inviteUrl: "http://unsafe.example/join/token",
    templateName: "atlas_staff_invite_v1",
  }), null);
});

test("Supabase Send SMS Hook rejects tampering and stale signed requests", () => {
  const secretBytes = Buffer.from("atlas-supabase-hook-secret-32-bytes!!");
  const secret = `v1,whsec_${secretBytes.toString("base64")}`;
  const nowMs = 1_787_739_000_000;
  const timestamp = String(Math.floor(nowMs / 1000));
  const webhookId = "msg_01atlaswhatsapphook";
  const rawBody = JSON.stringify({
    user: { phone: "+9647501234567" },
    sms: { otp: "561166" },
  });
  const signature = createHmac("sha256", secretBytes)
    .update(`${webhookId}.${timestamp}.${rawBody}`)
    .digest("base64");
  const headers = new Headers({
    "webhook-id": webhookId,
    "webhook-timestamp": timestamp,
    "webhook-signature": `v1,${signature}`,
  });

  const verified = verifySupabaseSendSmsHook(rawBody, headers, secret, nowMs);
  assert.ok(verified);
  assert.deepEqual(readSupabaseSendSmsHookValues(verified), {
    phone: "+9647501234567",
    otp: "561166",
  });
  assert.equal(verifySupabaseSendSmsHook(`${rawBody} `, headers, secret, nowMs), null);
  assert.equal(verifySupabaseSendSmsHook(rawBody, headers, secret, nowMs + 6 * 60 * 1000), null);
});

test("test-only HTTP routes are production-blocked and direct Meta OTP preserves Supabase verification", () => {
  const sendRoute = source("app/api/whatsapp/test/send/route.ts");
  const bootstrapRoute = source("app/api/whatsapp/test/bootstrap/route.ts");
  const login = source("app/login/login-form.tsx");
  const join = source("app/join/[token]/join-auth.tsx");
  const invite = source("app/dashboard/staff/invite-link-form.tsx");
  const inviteAction = source("app/dashboard/staff/invite-actions.ts");
  const hook = source("app/api/auth/send-sms-hook/route.ts");

  assert.match(sendRoute, /VERCEL_ENV === "production"/);
  assert.match(bootstrapRoute, /VERCEL_ENV === "production"/);
  assert.match(sendRoute, /WHATSAPP_TEST_ADMIN_SECRET/);
  assert.match(bootstrapRoute, /WHATSAPP_TEST_ADMIN_SECRET/);
  assert.match(login, /!DIRECT_META_OTP_ENABLED/);
  assert.match(join, /!DIRECT_META_OTP_ENABLED/);
  assert.match(login, /type: "sms"/);
  assert.match(join, /type: "sms"/);
  assert.match(login, /DIRECT_META_OTP_ENABLED \? "whatsapp" : "sms"/);
  assert.match(join, /DIRECT_META_OTP_ENABLED \? "whatsapp" : "sms"/);
  assert.match(invite, /NEXT_PUBLIC_ATLAS_WHATSAPP_DIRECT_INVITES_ENABLED/);
  assert.match(inviteAction, /readClinicMetaWhatsAppConfig/);
  assert.match(inviteAction, /ATLAS_WHATSAPP_META_TEST_MODE/);
  assert.match(hook, /SUPABASE_SEND_SMS_HOOK_SECRET/);
  assert.match(hook, /atlasWhatsAppRecipientAllowed/);
  assert.match(hook, /readBodyWithLimit/);
});
