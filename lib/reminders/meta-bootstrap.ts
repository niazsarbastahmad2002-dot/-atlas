import type { WhatsAppConfig } from "./whatsapp";

const META_APP_ID = "1444517747585211";
export const ATLAS_TEMPLATE_NAME = "atlas_appointment_reminder";

type AtlasLanguage = "en" | "ar" | "ku";

type TemplateVariant = {
  appLanguage: AtlasLanguage;
  metaLanguage: string;
  body: string;
  examples: [string, string];
};

const variants: Record<AtlasLanguage, TemplateVariant> = {
  en: {
    appLanguage: "en",
    metaLanguage: "en_US",
    body: "Appointment reminder from {{1}}. Your appointment is at {{2}}.",
    examples: ["Atlas Clinic", "August 19, 2026 at 1:00 PM"],
  },
  ar: {
    appLanguage: "ar",
    metaLanguage: "ar",
    body: "تذكير بموعدك من {{1}}. موعدك: {{2}}.",
    examples: ["عيادة أطلس", "19 أغسطس 2026، 1:00 مساءً"],
  },
  ku: {
    appLanguage: "ku",
    metaLanguage: "ku",
    body: "بیرخستنەوەی وادە لە {{1}}. کاتەکەت: {{2}}.",
    examples: ["کلینیکی Atlas", "19ی ئاب 2026، 1:00 دوای نیوەڕۆ"],
  },
};

type GraphError = { error?: { code?: number | string; error_subcode?: number | string } };
type GraphResponse = Record<string, unknown> & GraphError;

type TemplateRow = {
  name?: string;
  language?: string;
  status?: string;
  category?: string;
};

export type MetaTemplateBootstrapResult = {
  discovered: boolean;
  allApproved: boolean;
  states: Record<string, string>;
  errorCode: string | null;
};

function safeErrorCode(body: unknown, status: number) {
  if (body && typeof body === "object") {
    const error = (body as GraphError).error;
    if (error?.code !== undefined) {
      const suffix = error.error_subcode !== undefined ? `_${String(error.error_subcode).slice(0, 20)}` : "";
      return `meta_${String(error.code).slice(0, 20)}${suffix}`;
    }
  }
  return `http_${status}`;
}

async function graphJson(
  url: string,
  accessToken: string | null,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; body: GraphResponse }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const headers = new Headers(init.headers);
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    if (init.body) headers.set("Content-Type", "application/json");
    const response = await fetch(url, { ...init, headers, cache: "no-store", signal: controller.signal });
    let body: GraphResponse = {};
    try { body = await response.json() as GraphResponse; } catch {}
    return { ok: response.ok, status: response.status, body };
  } catch {
    return { ok: false, status: 0, body: { error: { code: "transport" } } };
  } finally {
    clearTimeout(timeout);
  }
}

function unique(values: string[]) {
  return [...new Set(values.filter((value) => /^\d+$/.test(value)))];
}

async function discoverWabaId(config: WhatsAppConfig) {
  const appAccessToken = `${META_APP_ID}|${config.appSecret}`;
  const debugQuery = new URLSearchParams({ input_token: config.accessToken, access_token: appAccessToken });
  const debug = await graphJson(
    `https://graph.facebook.com/${config.graphApiVersion}/debug_token?${debugQuery}`,
    null,
  );

  const candidates: string[] = [];
  const data = debug.body.data;
  if (data && typeof data === "object") {
    const granular = (data as { granular_scopes?: unknown }).granular_scopes;
    if (Array.isArray(granular)) {
      for (const item of granular) {
        if (!item || typeof item !== "object") continue;
        const scope = (item as { scope?: unknown }).scope;
        const targetIds = (item as { target_ids?: unknown }).target_ids;
        if (!["whatsapp_business_management", "whatsapp_business_messaging"].includes(String(scope))) continue;
        if (Array.isArray(targetIds)) candidates.push(...targetIds.map(String));
      }
    }
  }

  for (const candidate of unique(candidates)) {
    const result = await graphJson(
      `https://graph.facebook.com/${config.graphApiVersion}/${candidate}/phone_numbers?fields=id&limit=100`,
      config.accessToken,
    );
    const rows = result.body.data;
    if (!result.ok || !Array.isArray(rows)) continue;
    if (rows.some((row) => row && typeof row === "object" && String((row as { id?: unknown }).id) === config.phoneNumberId)) {
      return { wabaId: candidate, errorCode: null };
    }
  }

  // Some tokens omit granular target IDs. Try the businesses edge as a fallback.
  const businesses = await graphJson(
    `https://graph.facebook.com/${config.graphApiVersion}/me/businesses?fields=id&limit=50`,
    config.accessToken,
  );
  if (businesses.ok && Array.isArray(businesses.body.data)) {
    for (const business of businesses.body.data) {
      if (!business || typeof business !== "object") continue;
      const businessId = String((business as { id?: unknown }).id ?? "");
      if (!/^\d+$/.test(businessId)) continue;
      for (const edge of ["owned_whatsapp_business_accounts", "client_whatsapp_business_accounts"] as const) {
        const accounts = await graphJson(
          `https://graph.facebook.com/${config.graphApiVersion}/${businessId}/${edge}?fields=id&limit=50`,
          config.accessToken,
        );
        if (!accounts.ok || !Array.isArray(accounts.body.data)) continue;
        for (const account of accounts.body.data) {
          if (!account || typeof account !== "object") continue;
          const candidate = String((account as { id?: unknown }).id ?? "");
          if (!/^\d+$/.test(candidate)) continue;
          const numbers = await graphJson(
            `https://graph.facebook.com/${config.graphApiVersion}/${candidate}/phone_numbers?fields=id&limit=100`,
            config.accessToken,
          );
          if (!numbers.ok || !Array.isArray(numbers.body.data)) continue;
          if (numbers.body.data.some((row) => row && typeof row === "object" && String((row as { id?: unknown }).id) === config.phoneNumberId)) {
            return { wabaId: candidate, errorCode: null };
          }
        }
      }
    }
  }

  return {
    wabaId: null,
    errorCode: safeErrorCode(debug.body, debug.status),
  };
}

async function fetchTemplates(wabaId: string, config: WhatsAppConfig) {
  const query = new URLSearchParams({
    name: ATLAS_TEMPLATE_NAME,
    fields: "name,status,language,category",
    limit: "100",
  });
  const result = await graphJson(
    `https://graph.facebook.com/${config.graphApiVersion}/${wabaId}/message_templates?${query}`,
    config.accessToken,
  );
  const rows = result.ok && Array.isArray(result.body.data)
    ? result.body.data.filter((row): row is TemplateRow => Boolean(row && typeof row === "object"))
    : [];
  return { ...result, rows };
}

async function createTemplate(wabaId: string, variant: TemplateVariant, config: WhatsAppConfig) {
  return graphJson(
    `https://graph.facebook.com/${config.graphApiVersion}/${wabaId}/message_templates`,
    config.accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        name: ATLAS_TEMPLATE_NAME,
        language: variant.metaLanguage,
        category: "UTILITY",
        components: [{
          type: "BODY",
          text: variant.body,
          example: { body_text: [[variant.examples[0], variant.examples[1]]] },
        }],
      }),
    },
  );
}

export async function ensureAtlasWhatsAppTemplates(
  config: WhatsAppConfig,
  requestedLanguages: string[],
): Promise<MetaTemplateBootstrapResult> {
  const languages = [...new Set(requestedLanguages.map((value) => value.toLowerCase()))]
    .filter((value): value is AtlasLanguage => value === "en" || value === "ar" || value === "ku");
  if (!languages.length) return { discovered: false, allApproved: false, states: {}, errorCode: "no_languages" };

  const discovered = await discoverWabaId(config);
  if (!discovered.wabaId) {
    return { discovered: false, allApproved: false, states: {}, errorCode: discovered.errorCode ?? "waba_not_found" };
  }

  const before = await fetchTemplates(discovered.wabaId, config);
  if (!before.ok) {
    return {
      discovered: true,
      allApproved: false,
      states: {},
      errorCode: safeErrorCode(before.body, before.status),
    };
  }

  const states: Record<string, string> = {};
  for (const language of languages) {
    const variant = variants[language];
    const existing = before.rows.find((row) => row.name === ATLAS_TEMPLATE_NAME && row.language === variant.metaLanguage);
    if (existing) {
      states[language] = String(existing.status ?? "UNKNOWN").toUpperCase();
      continue;
    }

    const created = await createTemplate(discovered.wabaId, variant, config);
    if (!created.ok) {
      states[language] = `ERROR_${safeErrorCode(created.body, created.status)}`;
      continue;
    }
    states[language] = String(created.body.status ?? "PENDING").toUpperCase();
  }

  // Re-read once so a template approved immediately is not left waiting for another cron cycle.
  const after = await fetchTemplates(discovered.wabaId, config);
  if (after.ok) {
    for (const language of languages) {
      const variant = variants[language];
      const row = after.rows.find((item) => item.name === ATLAS_TEMPLATE_NAME && item.language === variant.metaLanguage);
      if (row) states[language] = String(row.status ?? states[language] ?? "UNKNOWN").toUpperCase();
    }
  }

  return {
    discovered: true,
    allApproved: languages.every((language) => states[language] === "APPROVED"),
    states,
    errorCode: null,
  };
}
