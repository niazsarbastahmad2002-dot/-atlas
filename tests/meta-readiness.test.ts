import assert from "node:assert/strict";
import test from "node:test";
import {
  auditMetaWhatsAppReadiness,
  isMetaTestDisplayPhoneNumber,
} from "../lib/reminders/meta-readiness.ts";

const accessToken = "test-system-user-access-token-that-must-never-leak";
const phoneNumberId = "1234567890";
const version = "v23.0";
const templateName = "atlas_appointment_reminder";
const wabaId = "987654321";
const businessId = "555666777";

type FixtureOptions = {
  nameStatus?: string;
  displayPhoneNumber?: string;
  templates?: Array<{ name: string; language: string; status: string; category?: string }>;
  reviewStatus?: string;
  discoverViaBusiness?: boolean;
};

function fixtureFetch({
  nameStatus = "APPROVED",
  displayPhoneNumber = "+1 415 555 0100",
  reviewStatus = "APPROVED",
  discoverViaBusiness = false,
  templates = [
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
          user_id: "111222333",
          scopes: discoverViaBusiness
            ? ["business_management", "whatsapp_business_management", "whatsapp_business_messaging"]
            : ["whatsapp_business_management", "whatsapp_business_messaging"],
          granular_scopes: discoverViaBusiness
            ? [{ scope: "business_management", target_ids: [businessId] }]
            : [{ scope: "whatsapp_business_management", target_ids: [wabaId] }],
        },
      });
    }
    if (url.pathname === `/v23.0/me/businesses` || url.pathname === `/v23.0/111222333/businesses`) {
      return Response.json({ data: discoverViaBusiness ? [{ id: businessId, name: "Atlas Business" }] : [] });
    }
    if (url.pathname === `/v23.0/${businessId}/owned_whatsapp_business_accounts`) {
      return Response.json({ data: discoverViaBusiness ? [{ id: wabaId, name: "Atlas WABA" }] : [] });
    }
    if (url.pathname === `/v23.0/${businessId}/client_whatsapp_business_accounts`) {
      return Response.json({ data: [] });
    }
    if (url.pathname.endsWith(`/${wabaId}/phone_numbers`)) {
      return Response.json({
        data: [{
          id: phoneNumberId,
          display_phone_number: displayPhoneNumber,
          verified_name: "Atlas Clinic Platform",
          name_status: nameStatus,
          quality_rating: "GREEN",
        }],
      });
    }
    if (url.pathname.endsWith(`/${phoneNumberId}`)) {
      return Response.json({
        id: phoneNumberId,
        display_phone_number: displayPhoneNumber,
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

test("Meta readiness becomes green only when a real sender and every required template are approved", async () => {
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
  assert.equal(result.wabaCount, 1);
  assert.equal(result.templates.length, 2);
});

test("Meta-provided +1 555 sandbox sender can never activate production reminders", async () => {
  assert.equal(isMetaTestDisplayPhoneNumber("+1 555-376-1113"), true);
  assert.equal(isMetaTestDisplayPhoneNumber("+1 415 555 0100"), false);

  const result = await auditMetaWhatsAppReadiness({
    accessToken,
    phoneNumberId,
    graphApiVersion: version,
    expectedTemplateName: templateName,
    fetchImplementation: fixtureFetch({ displayPhoneNumber: "+1 555-376-1113" }),
  });

  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("test_sender_number"));
});

test("WABA can be discovered through business-management assets when granular WhatsApp targets are absent", async () => {
  const result = await auditMetaWhatsAppReadiness({
    accessToken,
    phoneNumberId,
    graphApiVersion: version,
    expectedTemplateName: templateName,
    fetchImplementation: fixtureFetch({ discoverViaBusiness: true }),
  });

  assert.equal(result.ready, true);
  assert.equal(result.businessCount, 1);
  assert.equal(result.wabaCount, 1);
  assert.ok(result.tokenScopes.includes("business_management"));
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

test("a missing or unapproved required provider-language template blocks activation", async () => {
  const result = await auditMetaWhatsAppReadiness({
    accessToken,
    phoneNumberId,
    graphApiVersion: version,
    expectedTemplateName: templateName,
    fetchImplementation: fixtureFetch({
      templates: [
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
