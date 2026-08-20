export type MetaCoexistenceCompletionConfig = {
  appId: string;
  appSecret: string;
  graphApiVersion: string;
};

export type MetaCoexistenceCompletionInput = {
  code: string;
  wabaId: string;
  phoneNumberId?: string | null;
  businessId?: string | null;
};

export type MetaCoexistenceCompletionResult =
  | {
      connected: true;
      accessToken: string;
      wabaId: string;
      phoneNumberId: string;
      businessId: string | null;
      displayPhoneNumber: string;
      verifiedName: string | null;
    }
  | {
      connected: false;
      errorCode: string;
    };

const idPattern = /^\d{5,32}$/;
const codePattern = /^[A-Za-z0-9._-]{16,4096}$/;
const atlasTestSenderDigits = "15553761113";

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function safeJson(response: Response) {
  try { return await response.json() as unknown; } catch { return null; }
}

function providerError(body: unknown, fallback: string) {
  const root = object(body);
  const error = object(root?.error);
  const code = error?.code;
  if (typeof code === "number" || typeof code === "string") {
    const normalized = String(code).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
    if (normalized) return `meta_${normalized.toLowerCase()}`;
  }
  return fallback;
}

function phoneDigits(row: Record<string, unknown>) {
  return typeof row.display_phone_number === "string"
    ? row.display_phone_number.replace(/\D/g, "")
    : "";
}

function validPhoneRow(row: Record<string, unknown>) {
  return typeof row.id === "string"
    && idPattern.test(row.id)
    && typeof row.display_phone_number === "string"
    && row.display_phone_number.trim().length >= 8;
}

async function graphFetch(
  url: string,
  init: RequestInit,
  fetchImplementation: typeof fetch,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    return await fetchImplementation(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function completeMetaCoexistence(
  input: MetaCoexistenceCompletionInput,
  config: MetaCoexistenceCompletionConfig,
  fetchImplementation: typeof fetch = fetch,
): Promise<MetaCoexistenceCompletionResult> {
  if (
    !idPattern.test(config.appId)
    || config.appSecret.length < 16
    || !/^v\d+\.\d+$/.test(config.graphApiVersion)
    || !codePattern.test(input.code)
    || !idPattern.test(input.wabaId)
    || (input.phoneNumberId != null && !idPattern.test(input.phoneNumberId))
    || (input.businessId != null && !idPattern.test(input.businessId))
  ) return { connected: false, errorCode: "invalid_completion" };

  let tokenResponse: Response;
  try {
    const tokenUrl = new URL(`https://graph.facebook.com/${config.graphApiVersion}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", config.appId);
    tokenUrl.searchParams.set("client_secret", config.appSecret);
    tokenUrl.searchParams.set("code", input.code);
    tokenResponse = await graphFetch(tokenUrl.toString(), { method: "GET" }, fetchImplementation);
  } catch {
    return { connected: false, errorCode: "oauth_exchange_unavailable" };
  }

  const tokenBody = await safeJson(tokenResponse);
  const tokenRoot = object(tokenBody);
  const accessToken = typeof tokenRoot?.access_token === "string" ? tokenRoot.access_token.trim() : "";
  if (!tokenResponse.ok || accessToken.length < 32 || accessToken.length > 4096) {
    return { connected: false, errorCode: providerError(tokenBody, "oauth_exchange_failed") };
  }

  let phoneResponse: Response;
  try {
    phoneResponse = await graphFetch(
      `https://graph.facebook.com/${config.graphApiVersion}/${input.wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,name_status`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      fetchImplementation,
    );
  } catch {
    return { connected: false, errorCode: "phone_lookup_unavailable" };
  }

  const phoneBody = await safeJson(phoneResponse);
  if (!phoneResponse.ok) {
    return { connected: false, errorCode: providerError(phoneBody, "phone_lookup_failed") };
  }

  const phoneRoot = object(phoneBody);
  const phoneRows = (Array.isArray(phoneRoot?.data) ? phoneRoot.data : [])
    .map(object)
    .filter((row): row is Record<string, unknown> => row !== null && validPhoneRow(row));

  let phone: Record<string, unknown> | null = null;
  if (input.phoneNumberId) {
    phone = phoneRows.find((row) => row.id === input.phoneNumberId) ?? null;
    if (!phone) return { connected: false, errorCode: "phone_not_in_waba" };
  } else {
    // Coexistence session-info v3 may return only the WABA ID. In that case,
    // select automatically only when Meta exposes exactly one real non-test sender.
    const productionCandidates = phoneRows.filter((row) => phoneDigits(row) !== atlasTestSenderDigits);
    if (productionCandidates.length === 1) {
      phone = productionCandidates[0];
    } else if (productionCandidates.length > 1) {
      return { connected: false, errorCode: "phone_selection_required" };
    } else if (phoneRows.some((row) => phoneDigits(row) === atlasTestSenderDigits)) {
      return { connected: false, errorCode: "test_sender_number" };
    } else {
      return { connected: false, errorCode: "phone_not_in_waba" };
    }
  }

  const phoneNumberId = typeof phone.id === "string" ? phone.id : "";
  const displayPhoneNumber = typeof phone.display_phone_number === "string"
    ? phone.display_phone_number.trim()
    : "";
  const verifiedName = typeof phone.verified_name === "string" && phone.verified_name.trim()
    ? phone.verified_name.trim()
    : null;
  if (!idPattern.test(phoneNumberId) || !displayPhoneNumber) {
    return { connected: false, errorCode: "phone_metadata_missing" };
  }

  // Atlas's historical Meta test sender must never become a production clinic connection.
  if (displayPhoneNumber.replace(/\D/g, "") === atlasTestSenderDigits) {
    return { connected: false, errorCode: "test_sender_number" };
  }

  let subscribeResponse: Response;
  try {
    subscribeResponse = await graphFetch(
      `https://graph.facebook.com/${config.graphApiVersion}/${input.wabaId}/subscribed_apps`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      },
      fetchImplementation,
    );
  } catch {
    return { connected: false, errorCode: "subscription_unavailable" };
  }

  const subscribeBody = await safeJson(subscribeResponse);
  const subscribeRoot = object(subscribeBody);
  if (!subscribeResponse.ok || subscribeRoot?.success !== true) {
    return { connected: false, errorCode: providerError(subscribeBody, "subscription_failed") };
  }

  return {
    connected: true,
    accessToken,
    wabaId: input.wabaId,
    phoneNumberId,
    businessId: input.businessId ?? null,
    displayPhoneNumber,
    verifiedName,
  };
}
