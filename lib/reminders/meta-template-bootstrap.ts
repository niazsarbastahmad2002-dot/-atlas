import type { MetaTemplateStatus } from "./meta-readiness.ts";
import {
  ATLAS_PATIENT_LOOP_REQUIRED_LANGUAGES,
  ATLAS_PATIENT_LOOP_VARIANTS,
} from "./patient-loop.ts";

type JsonRecord = Record<string, unknown>;

function object(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function providerError(body: JsonRecord | null, status: number, accessToken: string) {
  const error = object(body?.error);
  const code = error?.code;
  const subcode = error?.error_subcode;
  const rawMessage = stringValue(error?.message);
  const message = rawMessage
    ? rawMessage.replaceAll(accessToken, "[redacted]").replace(/\s+/g, " ").slice(0, 240)
    : null;
  return {
    errorCode: typeof code === "string" || typeof code === "number"
      ? `meta_${String(code).slice(0, 32)}`
      : `http_${status}`,
    errorSubcode: typeof subcode === "string" || typeof subcode === "number"
      ? String(subcode).slice(0, 32)
      : null,
    errorDetail: message,
  };
}

// Keep the legacy database setting name as a compatibility marker. Meta readiness
// and new delivery now use the two Patient Loop templates below.
export const ATLAS_APPOINTMENT_REMINDER_TEMPLATE = "atlas_appointment_reminder";
export const ATLAS_WHATSAPP_REQUIRED_LANGUAGES = ATLAS_PATIENT_LOOP_REQUIRED_LANGUAGES;

export type MetaTemplateBootstrapResult = {
  templateName: string;
  kind: "confirm" | "day_of";
  language: string;
  created: boolean;
  templateId: string | null;
  status: string | null;
  category: string | null;
  errorCode: string | null;
  errorSubcode: string | null;
  errorDetail: string | null;
};

export async function bootstrapAtlasAppointmentReminderTemplates({
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
}): Promise<MetaTemplateBootstrapResult[]> {
  if (!accessToken || !/^v\d+\.\d+$/.test(graphApiVersion) || !/^\d+$/.test(wabaId)) {
    return ATLAS_PATIENT_LOOP_VARIANTS.map((variant) => ({
      templateName: variant.templateName,
      kind: variant.kind,
      language: variant.language,
      created: false,
      templateId: null,
      status: null,
      category: null,
      errorCode: "provider_configuration_invalid",
      errorSubcode: null,
      errorDetail: null,
    }));
  }

  const results: MetaTemplateBootstrapResult[] = [];

  for (const variant of ATLAS_PATIENT_LOOP_VARIANTS) {
    const existing = existingTemplates.find((template) => (
      template.name === variant.templateName
      && template.language === variant.language
    ));
    if (existing) {
      results.push({
        templateName: variant.templateName,
        kind: variant.kind,
        language: variant.language,
        created: false,
        templateId: null,
        status: existing.status ?? null,
        category: existing.category ?? null,
        errorCode: null,
        errorSubcode: null,
        errorDetail: null,
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
            category: "UTILITY",
            components: [
              {
                type: "BODY",
                text: variant.text,
                example: { body_text: [[...variant.examples]] },
              },
              {
                type: "BUTTONS",
                buttons: variant.buttons.map((text) => ({ type: "QUICK_REPLY", text })),
              },
            ],
          }),
          signal: controller.signal,
          cache: "no-store",
        },
      );

      let parsed: unknown = null;
      try { parsed = await response.json(); } catch {}
      const body = object(parsed);
      const templateId = stringValue(body?.id);
      const status = stringValue(body?.status)?.toUpperCase() ?? null;
      const category = stringValue(body?.category)?.toUpperCase() ?? null;
      const failure = response.ok ? null : providerError(body, response.status, accessToken);
      results.push({
        templateName: variant.templateName,
        kind: variant.kind,
        language: variant.language,
        created: response.ok,
        templateId,
        status,
        category,
        errorCode: failure?.errorCode ?? null,
        errorSubcode: failure?.errorSubcode ?? null,
        errorDetail: failure?.errorDetail ?? null,
      });
    } catch {
      results.push({
        templateName: variant.templateName,
        kind: variant.kind,
        language: variant.language,
        created: false,
        templateId: null,
        status: null,
        category: null,
        errorCode: "transport_error",
        errorSubcode: null,
        errorDetail: null,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  return results;
}
