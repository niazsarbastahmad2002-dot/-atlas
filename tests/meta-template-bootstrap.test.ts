import assert from "node:assert/strict";
import test from "node:test";
import {
  ATLAS_APPOINTMENT_REMINDER_TEMPLATE,
  bootstrapAtlasAppointmentReminderTemplates,
} from "../lib/reminders/meta-template-bootstrap.ts";

const accessToken = "test-meta-access-token-that-must-not-leak";
const graphApiVersion = "v23.0";
const wabaId = "1553173296558731";

test("bootstrap creates the three Atlas utility reminder language variants with two body variables", async () => {
  const requests: Array<{ url: string; body: any; authorization: string | null }> = [];
  const fakeFetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({
      url: typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
      body: JSON.parse(String(init?.body)),
      authorization: new Headers(init?.headers).get("authorization"),
    });
    return Response.json({ id: String(1000 + requests.length), status: "PENDING", category: "UTILITY" });
  }) as typeof fetch;

  const result = await bootstrapAtlasAppointmentReminderTemplates({
    accessToken,
    graphApiVersion,
    wabaId,
    existingTemplates: [],
    fetchImplementation: fakeFetch,
  });

  assert.equal(requests.length, 3);
  assert.deepEqual(requests.map((request) => request.body.language), ["ku", "ar", "en_US"]);
  for (const request of requests) {
    assert.equal(request.url, `https://graph.facebook.com/${graphApiVersion}/${wabaId}/message_templates`);
    assert.equal(request.body.name, ATLAS_APPOINTMENT_REMINDER_TEMPLATE);
    assert.equal(request.body.category, "UTILITY");
    assert.equal(request.body.components[0].type, "BODY");
    assert.match(request.body.components[0].text, /\{\{1\}\}/);
    assert.match(request.body.components[0].text, /\{\{2\}\}/);
    assert.equal(request.body.components[0].example.body_text[0].length, 2);
    assert.equal(request.authorization, `Bearer ${accessToken}`);
  }
  assert.equal(result.every((variant) => variant.created && variant.errorCode === null), true);
  assert.equal(JSON.stringify(result).includes(accessToken), false);
});

test("bootstrap does not recreate an existing language variant", async () => {
  let calls = 0;
  const fakeFetch = (async () => {
    calls += 1;
    return Response.json({ id: String(calls), status: "PENDING", category: "UTILITY" });
  }) as typeof fetch;

  const result = await bootstrapAtlasAppointmentReminderTemplates({
    accessToken,
    graphApiVersion,
    wabaId,
    existingTemplates: [{
      name: ATLAS_APPOINTMENT_REMINDER_TEMPLATE,
      language: "ku",
      status: "APPROVED",
      category: "UTILITY",
    }],
    fetchImplementation: fakeFetch,
  });

  assert.equal(calls, 2);
  assert.equal(result.find((variant) => variant.language === "ku")?.created, false);
  assert.equal(result.find((variant) => variant.language === "ku")?.status, "APPROVED");
});
