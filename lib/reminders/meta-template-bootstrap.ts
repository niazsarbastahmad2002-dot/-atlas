import type { MetaTemplateStatus } from "@/lib/reminders/meta-readiness";

type JsonRecord = Record<string, unknown>;

function object(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function providerErrorCode(body: JsonRecord | null, status: number) {
  const error = object(body?.error);
  const code = error?.code;
  if (typeof code === "string" || typeof code === "number") return `meta_${String(code).slice(0, 32)}`;
  return `http_${status}`;
}

export const ATLAS_APPOINTMENT_REMINDER_TEMPLATE = "atlas_appointment_reminder";

export const ATLAS_APPOINTMENT_REMINDER_VARIANTS = [
  {
    language: "ku",
    text: "بیرخستنەوەی کاتی پزیشک لە {{1}}. کاتی پزیشکت بۆ {{2}} دیاریکراوە. ئەگەر ناتوانیت ئامادە بیت، تکایە پەیوەندی بە کلینیکەوە بکە.",
    examples: ["کلینیکی ئەتڵەس", "20/8/2026، 10:30 پ.ن"],
  },
  {
    language: "ar",
    text: "تذكير بموعد من {{1}}. موعدك محدد في {{2}}. يرجى التواصل مع العيادة إذا لم تتمكن من الحضور.",
    examples: ["عيادة أطلس", "20/8/2026، 10:30 ص"],
  },
  {
    language: "en_US",
    text: "Appointment reminder from {{1}}. Your appointment is scheduled for {{2}}. Please contact the clinic if you cannot attend.",
    examples: ["Atlas Clinic", "20 Aug 2026, 10:30 AM"],
  },
] as const;

export type MetaTemplateBootstrapResult = {
  language: string;
  created: boolean;
  templateId: string | null;
  status: string | null;
  category: string | null;
  errorCode: string | null;
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
    return ATLAS_APPOINTMENT_REMINDER_VARIANTS.map((variant) => ({
      language: variant.language,
      created: false,
      templateId: null,
      status: null,
      category: null,
      errorCode: "provider_configuration_invalid",
    }));
  }

  const existingLanguages = new Set(
    existingTemplates
      .filter((template) => template.name === ATLAS_APPOINTMENT_REMINDER_TEMPLATE)
      .map((template) => template.language),
  );
  const results: MetaTemplateBootstrapResult[] = [];

  for (const variant of ATLAS_APPOINTMENT_REMINDER_VARIANTS) {
    if (existingLanguages.has(variant.language)) {
      const existing = existingTemplates.find((template) => (
        template.name === ATLAS_APPOINTMENT_REMINDER_TEMPLATE
        && template.language === variant.language
      ));
      results.push({
        language: variant.language,
        created: false,
        templateId: null,
        status: existing?.status ?? null,
        category: existing?.category ?? null,
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
            name: ATLAS_APPOINTMENT_REMINDER_TEMPLATE,
            language: variant.language,
            category: "UTILITY",
            components: [{
              type: "BODY",
              text: variant.text,
              example: { body_text: [[...variant.examples]] },
            }],
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
      results.push({
        language: variant.language,
        created: response.ok,
        templateId,
        status,
        category,
        errorCode: response.ok ? null : providerErrorCode(body, response.status),
      });
    } catch {
      results.push({
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
