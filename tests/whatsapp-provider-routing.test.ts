import assert from "node:assert/strict";
import test from "node:test";
import {
  getWhatsAppCloudReadiness,
  sendWhatsAppAuthenticationCode,
  sendWhatsAppStaffInvite,
} from "../lib/whatsapp-cloud.ts";

type CapturedRequest = {
  url: string;
  init: RequestInit;
};

function successfulFetch(calls: CapturedRequest[], id: string): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify({ messages: [{ id }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
}

const shared = {
  ATLAS_WHATSAPP_AUTH_ENABLED: "true",
  ATLAS_WHATSAPP_AUTH_TEMPLATE_NAME: "atlas_login_code",
  ATLAS_WHATSAPP_AUTH_TEMPLATE_LANGUAGE: "en_US",
  ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE_NAME: "atlas_staff_invite",
  ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE_LANGUAGE: "en_US",
};

test("Meta and 360dialog use one identical authentication template payload", async () => {
  const metaCalls: CapturedRequest[] = [];
  const d360Calls: CapturedRequest[] = [];
  const metaEnv = {
    ...shared,
    WHATSAPP_PROVIDER: "meta",
    WHATSAPP_ACCESS_TOKEN: "test-meta-access-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_GRAPH_API_VERSION: "v26.0",
  };
  const d360Env = {
    ...shared,
    WHATSAPP_PROVIDER: "360dialog",
    D360_API_KEY: "test-d360-api-key-not-secret",
    D360_BASE_URL: "https://waba-sandbox.360dialog.io/",
  };

  const meta = await sendWhatsAppAuthenticationCode("+9647501234567", "123456", {
    env: metaEnv,
    fetchImplementation: successfulFetch(metaCalls, "meta-message"),
  });
  const d360 = await sendWhatsAppAuthenticationCode("+9647501234567", "123456", {
    env: d360Env,
    fetchImplementation: successfulFetch(d360Calls, "d360-message"),
  });

  assert.deepEqual(meta, { ok: true, messageId: "meta-message" });
  assert.deepEqual(d360, { ok: true, messageId: "d360-message" });
  assert.equal(metaCalls[0]?.url, "https://graph.facebook.com/v26.0/1234567890/messages");
  assert.equal(d360Calls[0]?.url, "https://waba-sandbox.360dialog.io/v1/messages");
  assert.equal((metaCalls[0]?.init.headers as Record<string, string>).Authorization, "Bearer test-meta-access-token");
  assert.equal((metaCalls[0]?.init.headers as Record<string, string>)["D360-API-KEY"], undefined);
  assert.equal((d360Calls[0]?.init.headers as Record<string, string>)["D360-API-KEY"], "test-d360-api-key-not-secret");
  assert.equal((d360Calls[0]?.init.headers as Record<string, string>).Authorization, undefined);
  assert.deepEqual(
    JSON.parse(String(metaCalls[0]?.init.body)),
    JSON.parse(String(d360Calls[0]?.init.body)),
  );
});

test("360dialog sends the same phone-bound staff invitation template contract", async () => {
  const calls: CapturedRequest[] = [];
  const result = await sendWhatsAppStaffInvite({
    phone: "+9647501234567",
    clinicName: "Atlas Clinic",
    inviteToken: "one-use-token",
  }, {
    env: {
      ...shared,
      WHATSAPP_PROVIDER: "360dialog",
      D360_API_KEY: "test-d360-api-key-not-secret",
    },
    fetchImplementation: successfulFetch(calls, "invite-message"),
  });

  assert.deepEqual(result, { ok: true, messageId: "invite-message" });
  const payload = JSON.parse(String(calls[0]?.init.body));
  assert.equal(payload.to, "9647501234567");
  assert.equal(payload.template.name, "atlas_staff_invite");
  assert.equal(payload.template.components[0].parameters[0].text, "Atlas Clinic");
  assert.equal(payload.template.components[1].parameters[0].text, "one-use-token");
});

test("provider readiness is selected safely and the auth kill switch prevents delivery", async () => {
  const unsupported = getWhatsAppCloudReadiness({
    WHATSAPP_PROVIDER: "infobip",
    WHATSAPP_ACCESS_TOKEN: "present",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_GRAPH_API_VERSION: "v26.0",
  });
  assert.equal(unsupported.provider, "unsupported");
  assert.equal(unsupported.senderConfigured, false);

  const invalidD360 = getWhatsAppCloudReadiness({
    WHATSAPP_PROVIDER: "360dialog",
    D360_API_KEY: "test-d360-api-key-not-secret",
    D360_BASE_URL: "https://example.com",
  });
  assert.equal(invalidD360.d360BaseUrlConfigured, false);
  assert.equal(invalidD360.senderConfigured, false);

  let contacted = false;
  const disabled = await sendWhatsAppAuthenticationCode("+9647501234567", "123456", {
    env: {
      ...shared,
      ATLAS_WHATSAPP_AUTH_ENABLED: "false",
      WHATSAPP_PROVIDER: "360dialog",
      D360_API_KEY: "test-d360-api-key-not-secret",
    },
    fetchImplementation: (async () => {
      contacted = true;
      throw new Error("must not be called");
    }) as typeof fetch,
  });
  assert.deepEqual(disabled, { ok: false, error: "whatsapp_disabled" });
  assert.equal(contacted, false);
});
