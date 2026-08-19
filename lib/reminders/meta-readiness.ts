export type MetaTemplateStatus = {
  name: string;
  language: string;
  status: string;
  category: string | null;
};

export type MetaWhatsAppReadiness = {
  ready: boolean;
  nameStatus: string | null;
  verifiedName: string | null;
  displayPhoneNumber: string | null;
  qualityRating: string | null;
  wabaCount: number;
  wabaReviewStatuses: string[];
  templates: MetaTemplateStatus[];
  blockers: string[];
};

type AuditInput = {
  accessToken: string;
  phoneNumberId: string;
  graphApiVersion: string;
  expectedTemplateName: string;
  expectedLanguages?: string[];
  fetchImplementation?: typeof fetch;
};

type JsonRecord = Record<string, unknown>;

function object(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function normalizedStatus(value: unknown) {
  return stringValue(value)?.trim().toUpperCase() ?? null;
}

async function graphJson(
  url: URL,
  token: string,
  fetchImplementation: typeof fetch,
): Promise<{ ok: boolean; body: JsonRecord | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetchImplementation(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    let parsed: unknown = null;
    try { parsed = await response.json(); } catch {}
    return { ok: response.ok, body: object(parsed) };
  } catch {
    return { ok: false, body: null };
  } finally {
    clearTimeout(timeout);
  }
}

function addBlocker(blockers: string[], value: string) {
  if (!blockers.includes(value)) blockers.push(value);
}

function displayNameBlocker(status: string | null) {
  if (status === "PENDING_REVIEW") return "display_name_pending";
  if (status === "DECLINED") return "display_name_declined";
  if (status === "EXPIRED") return "display_name_expired";
  if (status === "NONE") return "display_name_unavailable";
  return "display_name_not_approved";
}

export async function auditMetaWhatsAppReadiness({
  accessToken,
  phoneNumberId,
  graphApiVersion,
  expectedTemplateName,
  expectedLanguages = ["ku", "ar", "en_US"],
  fetchImplementation = fetch,
}: AuditInput): Promise<MetaWhatsAppReadiness> {
  const blockers: string[] = [];
  const templates: MetaTemplateStatus[] = [];
  const wabaReviewStatuses: string[] = [];
  const base = `https://graph.facebook.com/${graphApiVersion}`;

  if (!accessToken || !/^\d+$/.test(phoneNumberId) || !/^v\d+\.\d+$/.test(graphApiVersion)) {
    return {
      ready: false,
      nameStatus: null,
      verifiedName: null,
      displayPhoneNumber: null,
      qualityRating: null,
      wabaCount: 0,
      wabaReviewStatuses: [],
      templates: [],
      blockers: ["provider_configuration_invalid"],
    };
  }

  const phoneUrl = new URL(`${base}/${phoneNumberId}`);
  phoneUrl.searchParams.set("fields", "id,display_phone_number,verified_name,name_status,quality_rating");
  const phoneResponse = await graphJson(phoneUrl, accessToken, fetchImplementation);
  const phone = phoneResponse.body;
  const nameStatus = normalizedStatus(phone?.name_status);
  const verifiedName = stringValue(phone?.verified_name);
  const displayPhoneNumber = stringValue(phone?.display_phone_number);
  const qualityRating = normalizedStatus(phone?.quality_rating);

  if (!phoneResponse.ok || stringValue(phone?.id) !== phoneNumberId) {
    addBlocker(blockers, "phone_number_unavailable");
  }
  if (nameStatus !== "APPROVED" && nameStatus !== "AVAILABLE_WITHOUT_REVIEW") {
    addBlocker(blockers, displayNameBlocker(nameStatus));
  }

  const debugUrl = new URL(`${base}/debug_token`);
  debugUrl.searchParams.set("input_token", accessToken);
  const debugResponse = await graphJson(debugUrl, accessToken, fetchImplementation);
  const debugData = object(debugResponse.body?.data);
  const targetIds: string[] = [];
  if (debugResponse.ok && debugData?.is_valid === true && Array.isArray(debugData.granular_scopes)) {
    for (const rawScope of debugData.granular_scopes.slice(0, 100)) {
      const scope = object(rawScope);
      const scopeName = stringValue(scope?.scope);
      if (scopeName !== "whatsapp_business_management" && scopeName !== "whatsapp_business_messaging") continue;
      if (!Array.isArray(scope?.target_ids)) continue;
      for (const rawId of scope.target_ids) {
        const id = typeof rawId === "string" || typeof rawId === "number" ? String(rawId) : "";
        if (/^\d+$/.test(id) && !targetIds.includes(id)) targetIds.push(id);
      }
    }
  }

  if (!targetIds.length) addBlocker(blockers, "waba_unavailable");

  for (const wabaId of targetIds.slice(0, 10)) {
    const wabaUrl = new URL(`${base}/${wabaId}`);
    wabaUrl.searchParams.set("fields", "id,name,account_review_status");
    const wabaResponse = await graphJson(wabaUrl, accessToken, fetchImplementation);
    if (wabaResponse.ok) {
      const reviewStatus = normalizedStatus(wabaResponse.body?.account_review_status);
      if (reviewStatus && !wabaReviewStatuses.includes(reviewStatus)) wabaReviewStatuses.push(reviewStatus);
      if (reviewStatus && ["REJECTED", "DECLINED", "DISABLED"].includes(reviewStatus)) {
        addBlocker(blockers, "waba_review_not_approved");
      }
    }

    const templatesUrl = new URL(`${base}/${wabaId}/message_templates`);
    templatesUrl.searchParams.set("fields", "id,name,status,language,category");
    templatesUrl.searchParams.set("limit", "100");
    const templateResponse = await graphJson(templatesUrl, accessToken, fetchImplementation);
    if (!templateResponse.ok || !Array.isArray(templateResponse.body?.data)) continue;
    for (const rawTemplate of templateResponse.body.data.slice(0, 100)) {
      const template = object(rawTemplate);
      const name = stringValue(template?.name);
      const language = stringValue(template?.language);
      const status = normalizedStatus(template?.status);
      if (!name || !language || !status) continue;
      const row = {
        name,
        language,
        status,
        category: stringValue(template?.category),
      };
      if (!templates.some((existing) => existing.name === row.name && existing.language === row.language)) templates.push(row);
    }
  }

  for (const language of expectedLanguages) {
    const variant = templates.find((template) => template.name === expectedTemplateName && template.language === language);
    if (!variant) addBlocker(blockers, `template_missing_${language.toLowerCase()}`);
    else if (variant.status !== "APPROVED") addBlocker(blockers, `template_not_approved_${language.toLowerCase()}`);
  }

  if (targetIds.length && templates.length === 0) addBlocker(blockers, "templates_unavailable");

  return {
    ready: blockers.length === 0,
    nameStatus,
    verifiedName,
    displayPhoneNumber,
    qualityRating,
    wabaCount: targetIds.length,
    wabaReviewStatuses,
    templates: templates
      .filter((template) => template.name === expectedTemplateName)
      .sort((left, right) => left.language.localeCompare(right.language)),
    blockers,
  };
}
