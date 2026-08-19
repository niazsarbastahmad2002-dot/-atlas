import assert from "node:assert/strict";
import test from "node:test";
import { auditMetaWhatsAppReadiness } from "../lib/reminders/meta-readiness.ts";

const accessToken = "test-system-user-access-token-that-must-never-leak";
const phoneNumberId = "1234567890";
const version = "v23.0";
const templateName = "atlas_appointment_reminder";
const wabaId = "987654321";

type FixtureOptions = {
  nameStatus?: string;
  templates?: Array<{ name: string; language: string; status: string; category?: string }>;
  reviewStatus?: string;
};

function fixtureFetch({
  nameStatus = "APPROVED",
  reviewStatus = "APPROVED",
  templates = [
    { name: templateName, language: "ku", status: "APPROVED", category: "UTILITY" },
    { name: templateName, language: "ar", status: "APPROVED", category: "UTILITY" },
    { name: templateName, language: "en_US", status: "APPROVED", category: "UTILITY" },
  ],
}: FixtureOptions = {}) {
  return (async (input: string | URL | Request) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url);
    if (url.pathname.endsWith(`/debug_token`)) {
      return Response.json({
        data: {
          is_valid: true,
          granular_scopes: [{ scope: "whatsapp_business_management", target_ids: [wabaId] }],
        },
      });
    }
    if (url.pathname.endsWith(`/${phoneNumberId}`)) {
      return Response.json({
        id: phoneNumberId,
        display_phone_number: "+1 555 000 0000",
        verified_name: "Atlas Clinic Platform",
        name_status: nameStatus,
        quality_rating: "GREEN",
      });
    }
    if (url.pathname.endsWith(`/${wabaId}/message_templates`)) {
      return Response.json({ data: templates });
    }
    if (url.pathname.endsWith(`/${wabaId}`)) {
      return Response.json({ id: wabaId, name: "Atlas", account_review_status: reviewStatus });
    }
    return Response.json({ error: { code: 100 } }, { status: 404 });
  }) as typeof fetch;
}

test("Meta readiness becomes green only when display name and every supported template variant are approved", async () => {
  const result = await auditMetaWhatsAppReadiness({
    accessToken,
    phoneNumberId,
    graphApiVersion: version,
    expectedTemplateName: templateName,
    fetchImplementation: fixtureFetch(),
  });

  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.nameStatus, "APPROVED");
  assert.equal(result.templates.length, 3);
});

test("pending display-name review blocks activation", async () => {
  const result = await auditMetaWhatsAppReadiness({
    accessToken,
    phoneNumberId,
    graphApiVersion: version,
    expectedTemplateName: templateName,
    fetchImplementation: fixtureFetch({ nameStatus: "PENDING_REVIEW" }),
  });

  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("display_name_pending"));
});

test("a missing or unapproved patient-language template blocks activation", async () => {
  const result = await auditMetaWhatsAppReadiness({
    accessToken,
    phoneNumberId,
    graphApiVersion: version,
    expectedTemplateName: templateName,
    fetchImplementation: fixtureFetch({
      templates: [
        { name: templateName, language: "ku", status: "APPROVED" },
        { name: templateName, language: "ar", status: "REJECTED" },
      ],
    }),
  });

  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("template_not_approved_ar"));
  assert.ok(result.blockers.includes("template_missing_en_us"));
});

test("readiness results never expose the access token", async () => {
  const result = await auditMetaWhatsAppReadiness({
    accessToken,
    phoneNumberId,
    graphApiVersion: version,
    expectedTemplateName: templateName,
    fetchImplementation: fixtureFetch(),
  });

  assert.equal(JSON.stringify(result).includes(accessToken), false);
});
