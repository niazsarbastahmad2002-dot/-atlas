import type { MetaTemplateStatus } from "./meta-readiness.ts";
import {
  ATLAS_WHATSAPP_OTP_TEMPLATE,
  ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE,
} from "./whatsapp-runtime.ts";

export type MetaSupportTemplateBootstrapResult = {
  templateName: string;
  language: string;
  created: boolean;
  templateId: string | null;
  status: string | null;
  category: string | null;
  errorCode: string | null;
};

type Variant = {
  templateName: string;
  language: string;
  category: "AUTHENTICATION" | "UTILITY";
  components: unknown[];
  messageSendTtlSeconds?: number;
};

const variants: Variant[] = [
  {
    templateName: ATLAS_WHATSAPP_OTP_TEMPLATE,
    language: "en_US",
    category: "AUTHENTICATION",
    messageSendTtlSeconds: 60,
    components: [
      { type: "BODY", add_security_recommendation: true },
      { type: "FOOTER", code_expiration_minutes: 5 },
      {
        type: "BUTTONS",
        buttons: [{ type: "OTP", otp_type: "COPY_CODE", text: "Copy Code" }],
      },
    ],
  },
  {
    templateName: ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE,
    language: "en_US",
    category: "UTILITY",
    components: [{
      type: "BODY",
      text: "You've been invited to join {{1}} on Atlas as reception staff. Open this secure one-use link: {{2}}",
      example: { body_text: [["Atlas Clinic", "https://example.com/join/example-token"]] },
    }],
  },
];

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function providerErrorCode(body: unknown, status: number) {
  const error = object(object(body)?.error);
  const code = error?.code;
  return typeof code === "string" || typeof code === "number"
    ? `meta_${String(code).slice(0, 32)}`
    : `http_${status}`;
}

export async function bootstrapMetaSupportTemplates({
  accessToken,
  graphApiVersion,
  wabaId,
  existingTemplates,
  fetchImplementation = fetch,
}: {
  accessToken: string;
  graphApiVersion: string;
  wabaId: string;
  existingTemplates: MetaTemplateStatus[];
  fetchImplementation?: typeof fetch;
}): Promise<MetaSupportTemplateBootstrapResult[]> {
  const results: MetaSupportTemplateBootstrapResult[] = [];
  for (const variant of variants) {
    const existing = existingTemplates.find((template) => (
      template.name === variant.templateName && template.language === variant.language
    ));
    if (existing) {
      results.push({
        templateName: variant.templateName,
        language: variant.language,
        created: false,
        templateId: null,
        status: existing.status,
        category: existing.category,
        errorCode: null,
      });
      continue;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetchImplementation(
        `https://graph.facebook.com/${graphApiVersion}/${wabaId}/message_templates`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: variant.templateName,
            language: variant.language,
            category: variant.category,
            ...(variant.messageSendTtlSeconds ? { message_send_ttl_seconds: variant.messageSendTtlSeconds } : {}),
            components: variant.components,
          }),
          signal: controller.signal,
          cache: "no-store",
        },
      );
      let parsed: unknown = null;
      try { parsed = await response.json(); } catch {}
      const body = object(parsed);
      const templateId = typeof body?.id === "string" ? body.id : null;
      const status = typeof body?.status === "string" ? body.status.toUpperCase() : null;
      const category = typeof body?.category === "string" ? body.category.toUpperCase() : null;
      results.push({
        templateName: variant.templateName,
        language: variant.language,
        created: response.ok,
        templateId,
        status,
        category,
        errorCode: response.ok ? null : providerErrorCode(parsed, response.status),
      });
    } catch {
      results.push({
        templateName: variant.templateName,
        language: variant.language,
        created: false,
        templateId: null,
        status: null,
        category: null,
        errorCode: "transport_error",
      });
    } finally {
      clearTimeout(timeout);
    }
  }
  return results;
}
