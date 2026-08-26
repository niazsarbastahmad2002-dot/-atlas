import type { MetaTemplateStatus } from "./meta-readiness.ts";
import { bootstrapMetaSupportTemplates } from "./meta-support-templates.ts";
import { bootstrapAtlasAppointmentReminderTemplates } from "./meta-template-bootstrap.ts";

export type AtlasMetaTemplateSuiteResult = {
  ok: boolean;
  error: string | null;
  patientLoop: Awaited<ReturnType<typeof bootstrapAtlasAppointmentReminderTemplates>>;
  support: Awaited<ReturnType<typeof bootstrapMetaSupportTemplates>>;
};

async function listTemplates({
  accessToken,
  graphApiVersion,
  wabaId,
  fetchImplementation,
}: {
  accessToken: string;
  graphApiVersion: string;
  wabaId: string;
  fetchImplementation: typeof fetch;
}): Promise<MetaTemplateStatus[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetchImplementation(
      `https://graph.facebook.com/${graphApiVersion}/${wabaId}/message_templates?fields=name,status,language,category&limit=100`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    const body = await response.json() as { data?: unknown };
    if (!Array.isArray(body.data)) return [];
    return body.data.flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const row = raw as Record<string, unknown>;
      if (typeof row.name !== "string" || typeof row.language !== "string" || typeof row.status !== "string") return [];
      return [{
        name: row.name,
        language: row.language,
        status: row.status.toUpperCase(),
        category: typeof row.category === "string" ? row.category.toUpperCase() : null,
      }];
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function bootstrapAtlasMetaTemplateSuite({
  accessToken,
  graphApiVersion,
  wabaId,
  fetchImplementation = fetch,
}: {
  accessToken: string;
  graphApiVersion: string;
  wabaId: string;
  fetchImplementation?: typeof fetch;
}): Promise<AtlasMetaTemplateSuiteResult> {
  if (!accessToken || !/^v\d+\.\d+$/.test(graphApiVersion) || !/^\d{5,32}$/.test(wabaId)) {
    return { ok: false, error: "provider_configuration_invalid", patientLoop: [], support: [] };
  }

  const existingTemplates = await listTemplates({
    accessToken,
    graphApiVersion,
    wabaId,
    fetchImplementation,
  });
  if (!existingTemplates) {
    return { ok: false, error: "template_list_failed", patientLoop: [], support: [] };
  }

  const [patientLoop, support] = await Promise.all([
    bootstrapAtlasAppointmentReminderTemplates({
      accessToken,
      graphApiVersion,
      wabaId,
      existingTemplates,
      fetchImplementation,
    }),
    bootstrapMetaSupportTemplates({
      accessToken,
      graphApiVersion,
      wabaId,
      existingTemplates,
      fetchImplementation,
    }),
  ]);
  return {
    ok: [...patientLoop, ...support].every((variant) => variant.errorCode === null),
    error: null,
    patientLoop,
    support,
  };
}
