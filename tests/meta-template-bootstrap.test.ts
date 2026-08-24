import assert from "node:assert/strict";
import test from "node:test";
import { bootstrapAtlasAppointmentReminderTemplates } from "../lib/reminders/meta-template-bootstrap.ts";
import {
  ATLAS_PATIENT_CONFIRM_TEMPLATE,
  ATLAS_PATIENT_DAY_TEMPLATE,
  ATLAS_PATIENT_LOOP_REQUIRED_LANGUAGES,
} from "../lib/reminders/patient-loop.ts";

const accessToken = "test-meta-access-token-that-must-not-leak";
const graphApiVersion = "v23.0";
const wabaId = "1553173296558731";

test("bootstrap creates the two Atlas patient-loop utility templates in both provider languages", async () => {
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

  assert.equal(requests.length, 4);
  assert.deepEqual(new Set(requests.map((request) => request.body.name)), new Set([
    ATLAS_PATIENT_CONFIRM_TEMPLATE,
    ATLAS_PATIENT_DAY_TEMPLATE,
  ]));
  for (const templateName of [ATLAS_PATIENT_CONFIRM_TEMPLATE, ATLAS_PATIENT_DAY_TEMPLATE]) {
    const languages = requests.filter((request) => request.body.name === templateName).map((request) => request.body.language).sort();
    assert.deepEqual(languages, [...ATLAS_PATIENT_LOOP_REQUIRED_LANGUAGES].sort());
  }

  for (const request of requests) {
    assert.equal(request.url, `https://graph.facebook.com/${graphApiVersion}/${wabaId}/message_templates`);
    assert.equal(request.body.category, "UTILITY");
    assert.equal(request.body.components[0].type, "BODY");
    assert.match(request.body.components[0].text, /\{\{1\}\}/);
    assert.match(request.body.components[0].text, /\{\{2\}\}/);
    assert.match(request.body.components[0].text, /\{\{3\}\}/);
    if (request.body.name === ATLAS_PATIENT_DAY_TEMPLATE) {
      assert.match(request.body.components[0].text, /\{\{4\}\}/);
      assert.equal(request.body.components[0].example.body_text[0].length, 4);
    } else {
      assert.equal(request.body.components[0].example.body_text[0].length, 3);
    }
    assert.equal(request.body.components[1].type, "BUTTONS");
    assert.equal(request.body.components[1].buttons.length, 3);
    assert.equal(request.body.components[1].buttons.every((button: any) => button.type === "QUICK_REPLY"), true);
    assert.equal(request.authorization, `Bearer ${accessToken}`);
  }
  assert.equal(result.every((variant) => variant.created && variant.errorCode === null), true);
  assert.equal(JSON.stringify(result).includes(accessToken), false);
});

test("bootstrap does not recreate an existing exact template language variant", async () => {
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
      name: ATLAS_PATIENT_CONFIRM_TEMPLATE,
      language: "ar",
      status: "APPROVED",
      category: "UTILITY",
    }],
    fetchImplementation: fakeFetch,
  });

  assert.equal(calls, 3);
  const existing = result.find((variant) => variant.templateName === ATLAS_PATIENT_CONFIRM_TEMPLATE && variant.language === "ar");
  assert.equal(existing?.created, false);
  assert.equal(existing?.status, "APPROVED");
});

test("bootstrap returns safe Meta diagnostics without leaking the access token", async () => {
  const fakeFetch = (async () => Response.json({
    error: {
      code: 100,
      error_subcode: 2388003,
      message: `Invalid parameter ${accessToken}`,
    },
  }, { status: 400 })) as typeof fetch;

  const result = await bootstrapAtlasAppointmentReminderTemplates({
    accessToken,
    graphApiVersion,
    wabaId,
    existingTemplates: [],
    fetchImplementation: fakeFetch,
  });

  assert.equal(result[0].errorCode, "meta_100");
  assert.equal(result[0].errorSubcode, "2388003");
  assert.equal(result[0].errorDetail?.includes("[redacted]"), true);
  assert.equal(JSON.stringify(result).includes(accessToken), false);
});
