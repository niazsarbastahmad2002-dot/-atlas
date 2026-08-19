type JsonRecord = Record<string, unknown>;

function object(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function requestUrl(input: string | URL | Request) {
  try {
    return new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url);
  } catch {
    return null;
  }
}

function numericId(value: unknown) {
  return typeof value === "string" && /^\d+$/.test(value) ? value : null;
}

export function withExplicitMetaWabaCandidate(
  wabaId: string | undefined,
  fetchImplementation: typeof fetch = fetch,
): typeof fetch {
  const candidate = numericId(wabaId);
  if (!candidate) return fetchImplementation;

  return (async (input: string | URL | Request, init?: RequestInit) => {
    const response = await fetchImplementation(input, init);
    const url = requestUrl(input);
    if (!url?.pathname.endsWith("/debug_token") || !response.ok) return response;

    let parsed: unknown;
    try {
      parsed = await response.clone().json();
    } catch {
      return response;
    }

    const root = object(parsed);
    const data = object(root?.data);
    if (!root || !data) return response;

    const scopes = Array.isArray(data.scopes)
      ? data.scopes.filter((value): value is string => typeof value === "string")
      : [];
    if (!scopes.includes("whatsapp_business_management")) return response;

    const granular = Array.isArray(data.granular_scopes) ? [...data.granular_scopes] : [];
    let attached = false;
    for (let index = 0; index < granular.length; index += 1) {
      const scope = object(granular[index]);
      if (scope?.scope !== "whatsapp_business_management") continue;
      const targetIds = Array.isArray(scope.target_ids) ? [...scope.target_ids] : [];
      if (!targetIds.some((value) => String(value) === candidate)) targetIds.push(candidate);
      granular[index] = { ...scope, target_ids: targetIds };
      attached = true;
      break;
    }
    if (!attached) {
      granular.push({ scope: "whatsapp_business_management", target_ids: [candidate] });
    }

    const headers = new Headers(response.headers);
    headers.set("content-type", "application/json");
    return new Response(JSON.stringify({
      ...root,
      data: { ...data, granular_scopes: granular },
    }), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }) as typeof fetch;
}
