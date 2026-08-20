import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildMetaCoexistenceLaunch,
  hasMetaCoexistenceWebhook,
  summarizeMetaCoexistenceWebhook,
} from "../lib/reminders/meta-coexistence.ts";

test("Meta coexistence launch uses the WhatsApp Business App onboarding flow", () => {
  const launch = buildMetaCoexistenceLaunch({
    configured: true,
    appId: "123456789012345",
    configId: "987654321098765",
    graphApiVersion: "v25.0",
  });

  assert.ok(launch);
  assert.equal(launch?.responseType, "code");
  assert.equal(launch?.overrideDefaultResponseType, true);
  assert.equal(launch?.extras.featureType, "whatsapp_business_app_onboarding");
  assert.equal(launch?.extras.sessionInfoVersion, "3");
  assert.deepEqual(launch?.extras.setup, {});
});

test("Meta coexistence launch never starts from incomplete configuration", () => {
  assert.equal(buildMetaCoexistenceLaunch({
    configured: false,
    appId: "123456789012345",
    configId: "987654321098765",
    graphApiVersion: "v25.0",
  }), null);
});

test("Coexistence webhook summary recognizes required fields without retaining content", () => {
  const payload = {
    entry: [{
      changes: [
        { field: "history", value: { messages: [{ text: "private history" }] } },
        { field: "smb_app_state_sync", value: { contacts: [{ name: "Private Patient" }] } },
        { field: "smb_message_echoes", value: { messages: [{ text: "private echo" }] } },
      ],
    }],
  };

  const summary = summarizeMetaCoexistenceWebhook(payload);
  assert.deepEqual(summary, {
    historyBatches: 1,
    appStateSyncBatches: 1,
    messageEchoBatches: 1,
  });
  assert.equal(hasMetaCoexistenceWebhook(summary), true);
  assert.equal(JSON.stringify(summary).includes("private"), false);
});

test("WhatsApp webhook is ready to acknowledge coexistence fields safely", () => {
  const source = readFileSync("app/api/whatsapp/webhook/route.ts", "utf8");
  assert.match(source, /summarizeMetaCoexistenceWebhook/);
  assert.match(source, /hasMetaCoexistenceWebhook/);
  assert.match(source, /does not persist synced/);
  assert.doesNotMatch(source, /JSON\.stringify\(payload\)/);
});
