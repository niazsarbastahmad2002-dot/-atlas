import assert from "node:assert/strict";
import test from "node:test";
import {
  buildD360TemplatePayload,
  readD360WhatsAppConfig,
  sendD360WhatsAppTemplate,
} from "../lib/reminders/d360.ts";
import { createD360WhatsAppReminderTransport } from "../lib/reminders/delivery.ts";

const input = {
  recipientPhone: "+9647501234567",
  clinicName: "Atlas Clinic",
  appointmentAt: "20 Aug 2026, 10:30 AM",
  templateName: "atlas_appointment_reminder",
  templateLanguage: "ar",
};

test("360dialog provider config is opt-in and validates API key", () => {
  assert.equal(readD360WhatsAppConfig({ WHATSAPP_PROVIDER: "meta" }), null);

  const config = readD360WhatsAppConfig({
    WHATSAPP_PROVIDER: "360dialog",
    D360_API_KEY: "d360-api-key-long-enough",
    WHATSAPP_GLOBAL_DAILY_LIMIT: "500",
  });

  assert.equal(config?.baseUrl, "https://waba-v2.360dialog.io");
  assert.equal(config?.globalDailyLimit, 500);

  const sandbox = readD360WhatsAppConfig({
    WHATSAPP_PROVIDER: "360dialog",
    D360_API_KEY: "d360-api-key-long-enough",
    D360_BASE_URL: "https://waba-sandbox.360dialog.io",
    WHATSAPP_GLOBAL_DAILY_LIMIT: "5",
  });
  assert.equal(sandbox?.baseUrl, "https://waba-sandbox.360dialog.io/v1");

  assert.throws(() => readD360WhatsAppConfig({
    WHATSAPP_PROVIDER: "360dialog",
    D360_API_KEY: "d360-api-key-long-enough",
    D360_BASE_URL: "https://example.com",
    WHATSAPP_GLOBAL_DAILY_LIMIT: "5",
  }));
});

test("360dialog template payload preserves Atlas two-variable reminder contract", () => {
  const payload = buildD360TemplatePayload(input);
  assert.equal(payload.messaging_product, "whatsapp");
  assert.equal(payload.to, "9647501234567");
  assert.equal(payload.template.name, "atlas_appointment_reminder");
  assert.equal(payload.template.language.code, "ar");
  assert.deepEqual(payload.template.components[0].parameters, [
    { type: "text", text: "Atlas Clinic" },
    { type: "text", text: "20 Aug 2026, 10:30 AM" },
  ]);
});

test("360dialog transport accepts a queued provider message without exposing API key", async () => {
  const apiKey = "d360-secret-api-key-that-must-not-leak";
  let sentKey = "";
  let requestBody: any = null;
  const fakeFetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    sentKey = new Headers(init?.headers).get("D360-API-KEY") ?? "";
    requestBody = JSON.parse(String(init?.body));
    return Response.json({ messages: [{ id: "wamid.test-123" }] });
  }) as typeof fetch;

  const result = await sendD360WhatsAppTemplate(input, {
    apiKey,
    baseUrl: "https://waba-v2.360dialog.io",
    globalDailyLimit: 500,
  }, fakeFetch);

  assert.equal(requestBody.to, "9647501234567");
  assert.equal(result.accepted, true);
  assert.equal(sentKey, apiKey);
  assert.equal(JSON.stringify(result).includes(apiKey), false);
});

test("360dialog transport blocks cross-channel failover when delivery is ambiguous", async () => {
  const transport = createD360WhatsAppReminderTransport({
    apiKey: "d360-api-key-long-enough",
    baseUrl: "https://waba-v2.360dialog.io",
    globalDailyLimit: 500,
  }, (async () => { throw new Error("network"); }) as typeof fetch);

  const result = await transport.send(input);
  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.errorCode, "d360_delivery_unknown");
    assert.equal(result.retryable, false);
    assert.equal(result.safeToFailover, false);
  }
});
