import assert from "node:assert/strict";
import test from "node:test";
import {
  routeReminder,
  type ReminderDeliveryInput,
  type ReminderTransport,
} from "../lib/reminders/delivery.ts";

const input: ReminderDeliveryInput = {
  recipientPhone: "+9647500000000",
  clinicName: "Atlas Clinic",
  appointmentAt: "Thu, Aug 20, 2026, 10:00 AM",
  templateName: "atlas_appointment_reminder",
  templateLanguage: "en_US",
};

function transport(
  channel: ReminderTransport["channel"],
  send: ReminderTransport["send"],
): ReminderTransport {
  return { channel, send };
}

test("Atlas Reach uses the next configured channel after a definitive failure", async () => {
  const called: string[] = [];
  const result = await routeReminder(input, ["whatsapp", "sms"], [
    transport("whatsapp", async () => {
      called.push("whatsapp");
      return {
        accepted: false,
        errorCode: "meta_131047",
        retryable: false,
        safeToFailover: true,
      };
    }),
    transport("sms", async () => {
      called.push("sms");
      return { accepted: true, providerMessageId: "sms-1" };
    }),
  ]);

  assert.deepEqual(called, ["whatsapp", "sms"]);
  assert.equal(result.accepted, true);
  if (result.accepted) {
    assert.equal(result.channel, "sms");
    assert.equal(result.providerMessageId, "sms-1");
  }
});

test("Atlas Reach stops on ambiguous delivery instead of risking a duplicate", async () => {
  const called: string[] = [];
  const result = await routeReminder(input, ["whatsapp", "sms"], [
    transport("whatsapp", async () => {
      called.push("whatsapp");
      return {
        accepted: false,
        errorCode: "delivery_unknown",
        retryable: false,
        safeToFailover: false,
      };
    }),
    transport("sms", async () => {
      called.push("sms");
      return { accepted: true, providerMessageId: "sms-should-not-send" };
    }),
  ]);

  assert.deepEqual(called, ["whatsapp"]);
  assert.equal(result.accepted, false);
  if (!result.accepted) assert.equal(result.errorCode, "delivery_unknown");
});

test("Atlas Reach skips unconfigured channels without sending duplicates", async () => {
  let smsCalls = 0;
  const result = await routeReminder(input, ["viber", "viber", "sms"], [
    transport("sms", async () => {
      smsCalls += 1;
      return { accepted: true, providerMessageId: "sms-2" };
    }),
  ]);

  assert.equal(smsCalls, 1);
  assert.equal(result.accepted, true);
  assert.deepEqual(result.attempts.map((attempt) => attempt.outcome), ["unavailable", "accepted"]);
});

test("Atlas Reach reports unavailable when no planned transport is configured", async () => {
  const result = await routeReminder(input, ["messenger"], []);
  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.errorCode, "channel_unavailable");
    assert.equal(result.retryable, false);
  }
});
