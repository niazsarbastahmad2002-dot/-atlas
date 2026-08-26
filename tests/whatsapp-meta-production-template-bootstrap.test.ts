import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { bootstrapMetaSupportTemplates } from "../lib/reminders/meta-support-templates.ts";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("shared Meta support bootstrap reuses existing templates without provider writes", async () => {
  let calls = 0;
  const result = await bootstrapMetaSupportTemplates({
    accessToken: "test-token",
    graphApiVersion: "v26.0",
    wabaId: "123456789012345",
    existingTemplates: [
      { name: "atlas_login_otp_v1", language: "en_US", status: "APPROVED", category: "AUTHENTICATION" },
      { name: "atlas_staff_invite_v1", language: "en_US", status: "PENDING", category: "UTILITY" },
    ],
    fetchImplementation: (async () => {
      calls += 1;
      throw new Error("should not write");
    }) as typeof fetch,
  });

  assert.equal(calls, 0);
  assert.deepEqual(result.map((item) => [item.templateName, item.status, item.category]), [
    ["atlas_login_otp_v1", "APPROVED", "AUTHENTICATION"],
    ["atlas_staff_invite_v1", "PENDING", "UTILITY"],
  ]);
});

test("support bootstrap reports provider denial per template without leaking credentials", async () => {
  const requests: Array<{ url: string; body: string }> = [];
  const fakeFetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const body = String(init?.body ?? "");
    requests.push({ url, body });
    if (body.includes('"AUTHENTICATION"')) {
      return new Response(JSON.stringify({ error: { code: 10, message: "not permitted" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ id: "template-1", status: "PENDING", category: "UTILITY" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const result = await bootstrapMetaSupportTemplates({
    accessToken: "durable-system-user-secret-token",
    graphApiVersion: "v26.0",
    wabaId: "123456789012345",
    existingTemplates: [],
    fetchImplementation: fakeFetch,
  });

  assert.equal(result[0]?.templateName, "atlas_login_otp_v1");
  assert.equal(result[0]?.errorCode, "meta_10");
  assert.equal(result[1]?.templateName, "atlas_staff_invite_v1");
  assert.equal(result[1]?.status, "PENDING");
  assert.equal(result[1]?.errorCode, null);
  assert.equal(JSON.stringify(result).includes("durable-system-user-secret-token"), false);
  assert.equal(requests.length, 2);
});

test("clinic template bootstrap is authenticated, clinic-scoped, and never activates messaging", () => {
  const route = source("app/api/whatsapp/templates/clinic-bootstrap/route.ts");

  assert.match(route, /auth\.getUser\(\)/);
  assert.match(route, /owner_id/);
  assert.match(route, /membership\?\.role === "owner"/);
  assert.match(route, /membership\?\.role === "manager"/);
  assert.match(route, /readClinicMetaWhatsAppConfig\(admin, body\.clinicId\)/);
  assert.match(route, /bootstrapAtlasAppointmentReminderTemplates/);
  assert.match(route, /bootstrapMetaSupportTemplates/);
  assert.match(route, /Cache-Control/);
  assert.doesNotMatch(route, /WHATSAPP_ACCESS_TOKEN|WHATSAPP_TEST_ACCESS_TOKEN/);
  assert.doesNotMatch(route, /clinic_reminder_settings[\s\S]*update\(/);
  assert.doesNotMatch(route, /enabled:\s*true/);
});
