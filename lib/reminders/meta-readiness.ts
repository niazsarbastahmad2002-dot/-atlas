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
  businessCount: number;
  wabaCount: number;
  wabaIds: string[];
  tokenScopes: string[];
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
type GraphResult = {
  ok: boolean;
  status: number;
  body: JsonRecord | null;
  errorCode: string | null;
};

function object(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function normalizedStatus(value: unknown) {
  return stringValue(value)?.trim().toUpperCase() ?? null;
}

function numericId(value: unknown) {
  const id = typeof value === "string" || typeof value === "number" ? String(value) : "";
  return /^\d+$/.test(id) ? id : null;
}

function graphErrorCode(body: JsonRecord | null) {
  const error = object(body?.error);
  const code = error?.code;
  return typeof code === "string" || typeof code === "number" ? `meta_${String(code).slice(0, 32)}` : null;
}

async function graphJson(
  url: URL,
  token: string,
  fetchImplementation: typeof fetch,
): Promise<GraphResult> {
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
    const body = object(parsed);
    return { ok: response.ok, status: response.status, body, errorCode: graphErrorCode(body) };
  } catch {
    return { ok: false, status: 0, body: null, errorCode: "transport_error" };
  } finally {
    clearTimeout(timeout);
  }
}

function addBlocker(blockers: string[], value: string) {
  if (!blockers.includes(value)) blockers.push(value);
}

function addId(ids: string[], value: unknown) {
  const id = numericId(value);
  if (id && !ids.includes(id)) ids.push(id);
}

function collectDataIds(body: JsonRecord | null, ids: string[]) {
  if (!Array.isArray(body?.data)) return;
  for (const raw of body.data.slice(0, 100)) addId(ids, object(raw)?.id);
}

function displayNameBlocker(status: string | null) {
  if (status === "PENDING_REVIEW") return "display_name_pending";
  if (status === "DECLINED") return "display_name_declined";
  if (status === "EXPIRED") return "display_name_expired";
  if (status === "NONE") return "display_name_unavailable";
  return "display_name_not_approved";
}

function initialFailure(): MetaWhatsAppReadiness {
  return {
    ready: false,
    nameStatus: null,
    verifiedName: null,
    displayPhoneNumber: null,
    qualityRating: null,
    businessCount: 0,
    wabaCount: 0,
    wabaIds: [],
    tokenScopes: [],
    wabaReviewStatuses: [],
    templates: [],
    blockers: ["provider_configuration_invalid"],
  };
}

async function discoverBusinessIds(
  base: string,
  accessToken: string,
  userId: string | null,
  appId: string | null,
  fetchImplementation: typeof fetch,
  businessIds: string[],
) {
  const urls = [new URL(`${base}/me/businesses`)];
  urls[0].searchParams.set("fields", "id,name");
  urls[0].searchParams.set("limit", "100");

  if (userId) {
    const userBusinesses = new URL(`${base}/${userId}/businesses`);
    userBusinesses.searchParams.set("fields", "id,name");
    userBusinesses.searchParams.set("limit", "100");
    urls.push(userBusinesses);
  }

  const nested = new URL(`${base}/me`);
  nested.searchParams.set("fields", "businesses.limit(100){id,name}");
  urls.push(nested);

  for (const url of urls) {
    const result = await graphJson(url, accessToken, fetchImplementation);
    if (!result.ok) continue;
    collectDataIds(result.body, businessIds);
    const businesses = object(result.body?.businesses);
    collectDataIds(businesses, businessIds);
  }

  // Final self-service discovery path: the token debugger gives us the app ID.
  // If Meta exposes the app's owning Business portfolio to this same system user,
  // use it without requiring the operator to copy an ID from Business Manager.
  if (appId) {
    for (const fields of ["business", "business{id}"]) {
      const appUrl = new URL(`${base}/${appId}`);
      appUrl.searchParams.set("fields", fields);
      const result = await graphJson(appUrl, accessToken, fetchImplementation);
      if (!result.ok) continue;
      addId(businessIds, object(result.body?.business)?.id);
    }
  }
}

async function discoverWabasFromBusinesses(
  base: string,
  accessToken: string,
  fetchImplementation: typeof fetch,
  businessIds: string[],
  candidateWabaIds: string[],
) {
  for (const businessId of businessIds.slice(0, 20)) {
    for (const edge of ["owned_whatsapp_business_accounts", "client_whatsapp_business_accounts"] as const) {
      const url = new URL(`${base}/${businessId}/${edge}`);
      url.searchParams.set("fields", "id,name");
      url.searchParams.set("limit", "100");
      const result = await graphJson(url, accessToken, fetchImplementation);
      if (result.ok) collectDataIds(result.body, candidateWabaIds);
    }
  }
}

async function selectPhoneWabas(
  base: string,
  accessToken: string,
  phoneNumberId: string,
  fetchImplementation: typeof fetch,
  candidateWabaIds: string[],
) {
  const matched: string[] = [];
  for (const wabaId of candidateWabaIds.slice(0, 30)) {
    const url = new URL(`${base}/${wabaId}/phone_numbers`);
    url.searchParams.set("fields", "id,display_phone_number,verified_name,name_status,quality_rating");
    url.searchParams.set("limit", "100");
    const result = await graphJson(url, accessToken, fetchImplementation);
    if (!result.ok || !Array.isArray(result.body?.data)) continue;
    if (result.body.data.some((raw) => numericId(object(raw)?.id) === phoneNumberId)) addId(matched, wabaId);
  }
  return matched;
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
  const tokenScopes: string[] = [];
  const businessIds: string[] = [];
  const candidateWabaIds: string[] = [];
  const base = `https://graph.facebook.com/${graphApiVersion}`;

  if (!accessToken || !/^\d+$/.test(phoneNumberId) || !/^v\d+\.\d+$/.test(graphApiVersion)) {
    return initialFailure();
  }

  const phoneUrl = new URL(`${base}/${phoneNumberId}`);
  phoneUrl.searchParams.set("fields", "id,display_phone_number,verified_name,name_status,quality_rating");
  const phoneResponse = await graphJson(phoneUrl, accessToken, fetchImplementation);
  const phone = phoneResponse.body;
  const nameStatus = normalizedStatus(phone?.name_status);
  const verifiedName = stringValue(phone?.verified_name);
  const displayPhoneNumber = stringValue(phone?.display_phone_number);
  const qualityRating = normalizedStatus(phone?.quality_rating);

  if (!phoneResponse.ok || stringValue(phone?.id) !== phoneNumberId) addBlocker(blockers, "phone_number_unavailable");
  if (nameStatus !== "APPROVED" && nameStatus !== "AVAILABLE_WITHOUT_REVIEW") {
    addBlocker(blockers, displayNameBlocker(nameStatus));
  }

  const directWabaUrl = new URL(`${base}/${phoneNumberId}`);
  directWabaUrl.searchParams.set("fields", "whatsapp_business_account");
  const directWabaResponse = await graphJson(directWabaUrl, accessToken, fetchImplementation);
  if (directWabaResponse.ok) addId(candidateWabaIds, object(directWabaResponse.body?.whatsapp_business_account)?.id);

  const debugUrl = new URL(`${base}/debug_token`);
  debugUrl.searchParams.set("input_token", accessToken);
  const debugResponse = await graphJson(debugUrl, accessToken, fetchImplementation);
  const debugData = object(debugResponse.body?.data);
  const userId = numericId(debugData?.user_id);
  const appId = numericId(debugData?.app_id);

  if (debugResponse.ok && debugData?.is_valid === true) {
    if (Array.isArray(debugData.scopes)) {
      for (const value of debugData.scopes) {
        if (typeof value === "string" && !tokenScopes.includes(value)) tokenScopes.push(value);
      }
    }
    if (Array.isArray(debugData.granular_scopes)) {
      for (const rawScope of debugData.granular_scopes.slice(0, 100)) {
        const scope = object(rawScope);
        const scopeName = stringValue(scope?.scope);
        if (!scopeName || !Array.isArray(scope?.target_ids)) continue;
        if (!tokenScopes.includes(scopeName)) tokenScopes.push(scopeName);
        for (const rawId of scope.target_ids) {
          if (scopeName === "whatsapp_business_management" || scopeName === "whatsapp_business_messaging") {
            addId(candidateWabaIds, rawId);
          } else if (scopeName === "business_management") {
            addId(businessIds, rawId);
          }
        }
      }
    }
  } else {
    addBlocker(blockers, "access_token_unverifiable");
  }

  await discoverBusinessIds(base, accessToken, userId, appId, fetchImplementation, businessIds);
  await discoverWabasFromBusinesses(base, accessToken, fetchImplementation, businessIds, candidateWabaIds);
  const matchedWabaIds = await selectPhoneWabas(
    base,
    accessToken,
    phoneNumberId,
    fetchImplementation,
    candidateWabaIds,
  );

  if (!matchedWabaIds.length) {
    if (!tokenScopes.includes("business_management") && businessIds.length === 0) {
      addBlocker(blockers, "business_management_scope_missing");
    }
    addBlocker(blockers, "waba_unavailable");
  }

  for (const wabaId of matchedWabaIds.slice(0, 10)) {
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
      const row = { name, language, status, category: stringValue(template?.category) };
      if (!templates.some((existing) => existing.name === row.name && existing.language === row.language)) templates.push(row);
    }
  }

  for (const language of expectedLanguages) {
    const variant = templates.find((template) => template.name === expectedTemplateName && template.language === language);
    if (!variant) addBlocker(blockers, `template_missing_${language.toLowerCase()}`);
    else if (variant.status !== "APPROVED") addBlocker(blockers, `template_not_approved_${language.toLowerCase()}`);
  }

  if (matchedWabaIds.length && templates.length === 0) addBlocker(blockers, "templates_unavailable");

  return {
    ready: blockers.length === 0,
    nameStatus,
    verifiedName,
    displayPhoneNumber,
    qualityRating,
    businessCount: businessIds.length,
    wabaCount: matchedWabaIds.length,
    wabaIds: matchedWabaIds,
    tokenScopes: tokenScopes.sort(),
    wabaReviewStatuses,
    templates: templates
      .filter((template) => template.name === expectedTemplateName)
      .sort((left, right) => left.language.localeCompare(right.language)),
    blockers,
  };
}
