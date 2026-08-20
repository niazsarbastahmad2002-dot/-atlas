import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInfobipTemplatePayload,
  readInfobipWhatsAppConfig,
  sendInfobipWhatsAppTemplate,
} from "../lib/reminders/infobip.ts";
import { createInfobipWhatsAppReminderTransport } from "../lib/reminders/delivery.ts";

const input = {
  recipientPhone: "+9647501234567",
  clinicName: "Atlas Clinic",
  appointmentAt: "20 Aug 2026, 10:30 AM",
  templateName: "atlas_appointment_reminder",
  templateLanguage: "ar",
};

test("Infobip provider config is opt-in and validates sender/base URL", () => {
  assert.equal(readInfobipWhatsAppConfig({ WHATSAPP_PROVIDER: "meta" }), null);

  const config = readInfobipWhatsAppConfig({
    WHATSAPP_PROVIDER: "infobip",
    INFOBIP_API_KEY: "infobip-api-key-long-enough",
    INFOBIP_BASE_URL: "https://abc123.api.infobip.com/",
    INFOBIP_WHATSAPP_SENDER: "+9647518961148",
    WHATSAPP_GLOBAL_DAILY_LIMIT: "500",
  });

  assert.equal(config?.baseUrl, "https://abc123.api.infobip.com");
  assert.equal(config?.sender, "9647518961148");
  assert.equal(config?.globalDailyLimit, 500);
});

test("Infobip template payload preserves Atlas two-variable reminder contract", () => {
  const payload = buildInfobipTemplatePayload(input, "9647518961148", "atlas-test-message");
  assert.equal(payload.messages[0].from, "9647518961148");
  assert.equal(payload.messages[0].to, "9647501234567");
  assert.equal(payload.messages[0].messageId, "atlas-test-message");
  assert.equal(payload.messages[0].content.templateName, "atlas_appointment_reminder");
  assert.equal(payload.messages[0].content.language, "ar");
  assert.deepEqual(payload.messages[0].content.templateData.body.placeholders, [
    "Atlas Clinic",
    "20 Aug 2026, 10:30 AM",
  ]);
});

test("Infobip transport accepts a queued provider message without exposing the API key", async () => {
  const apiKey = "infobip-secret-api-key-that-must-not-leak";
  let authorization = "";
  let requestBody: any = null;
  const fakeFetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    authorization = new Headers(init?.headers).get("authorization") ?? "";
    requestBody = JSON.parse(String(init?.body));
    return Response.json({
      messages: [{
        to: requestBody.messages[0].to,
        messageCount: 1,
        messageId: requestBody.messages[0].messageId,
        status: { groupName: "PENDING", name: "PENDING_ENROUTE" },
      }],
    });
  }) as typeof fetch;

  const result = await sendInfobipWhatsAppTemplate(input, {
    apiKey,
    baseUrl: "https://abc123.api.infobip.com",
    sender: "9647518961148",
    globalDailyLimit: 500,
  }, fakeFetch);

  assert.equal(result.accepted, true);
  assert.equal(authorization, `App ${apiKey}`);
  assert.equal(JSON.stringify(result).includes(apiKey), false);
});

test("Infobip transport blocks cross-channel failover when delivery is ambiguous", async () => {
  const transport = createInfobipWhatsAppReminderTransport({
    apiKey: "infobip-api-key-long-enough",
    baseUrl: "https://abc123.api.infobip.com",
    sender: "9647518961148",
    globalDailyLimit: 500,
  }, (async () => { throw new Error("network"); }) as typeof fetch);

  const result = await transport.send(input);
  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.errorCode, "infobip_delivery_unknown");
    assert.equal(result.retryable, false);
    assert.equal(result.safeToFailover, false);
  }
});
