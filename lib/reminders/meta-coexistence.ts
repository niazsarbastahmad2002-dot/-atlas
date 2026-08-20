export type MetaCoexistenceWebhookSummary = {
  historyBatches: number;
  appStateSyncBatches: number;
  messageEchoBatches: number;
};

export type MetaEmbeddedSignupLaunch = {
  appId: string;
  configId: string;
  graphApiVersion: string;
  responseType: "code";
  overrideDefaultResponseType: true;
  extras: {
    setup: Record<string, never>;
    featureType: "whatsapp_business_app_onboarding";
    sessionInfoVersion: "3";
  };
};

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/**
 * Extract only coarse coexistence webhook counts. Message/contact/history content is
 * deliberately not returned or persisted here so Atlas can subscribe safely before
 * it has a clinic-level retention policy for synced WhatsApp data.
 */
export function summarizeMetaCoexistenceWebhook(payload: unknown): MetaCoexistenceWebhookSummary {
  const summary: MetaCoexistenceWebhookSummary = {
    historyBatches: 0,
    appStateSyncBatches: 0,
    messageEchoBatches: 0,
  };

  const root = object(payload);
  const entries = Array.isArray(root?.entry) ? root?.entry : [];
  for (const entryValue of entries) {
    const entry = object(entryValue);
    const changes = Array.isArray(entry?.changes) ? entry?.changes : [];
    for (const changeValue of changes) {
      const change = object(changeValue);
      const field = typeof change?.field === "string" ? change.field : "";
      if (field === "history") summary.historyBatches += 1;
      if (field === "smb_app_state_sync") summary.appStateSyncBatches += 1;
      if (field === "smb_message_echoes") summary.messageEchoBatches += 1;
    }
  }

  return summary;
}

export function hasMetaCoexistenceWebhook(summary: MetaCoexistenceWebhookSummary) {
  return summary.historyBatches > 0
    || summary.appStateSyncBatches > 0
    || summary.messageEchoBatches > 0;
}

export function buildMetaCoexistenceLaunch(input: {
  appId: string | null;
  configId: string | null;
  graphApiVersion: string | null;
  configured: boolean;
}): MetaEmbeddedSignupLaunch | null {
  if (!input.configured || !input.appId || !input.configId || !input.graphApiVersion) return null;
  return {
    appId: input.appId,
    configId: input.configId,
    graphApiVersion: input.graphApiVersion,
    responseType: "code",
    overrideDefaultResponseType: true,
    extras: {
      setup: {},
      featureType: "whatsapp_business_app_onboarding",
      sessionInfoVersion: "3",
    },
  };
}
