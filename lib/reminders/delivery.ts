import {
  sendApprovedWhatsAppTemplate,
  type WhatsAppConfig,
} from "./whatsapp.ts";

export type ReminderChannel = "whatsapp" | "viber" | "messenger" | "sms";

export type ReminderDeliveryInput = {
  recipientPhone: string;
  clinicName: string;
  appointmentAt: string;
  templateName: string;
  templateLanguage: string;
};

export type ReminderTransportResult =
  | { accepted: true; providerMessageId: string }
  | {
      accepted: false;
      errorCode: string;
      retryable: boolean;
      safeToFailover: boolean;
    };

export type ReminderTransport = {
  channel: ReminderChannel;
  send: (input: ReminderDeliveryInput) => Promise<ReminderTransportResult>;
};

export type ReminderRouteAttempt = {
  channel: ReminderChannel;
  outcome: "accepted" | "rejected" | "unavailable";
  errorCode?: string;
};

export type ReminderRouteResult =
  | {
      accepted: true;
      channel: ReminderChannel;
      providerMessageId: string;
      attempts: ReminderRouteAttempt[];
    }
  | {
      accepted: false;
      channel: ReminderChannel | null;
      errorCode: string;
      retryable: boolean;
      attempts: ReminderRouteAttempt[];
    };

export async function routeReminder(
  input: ReminderDeliveryInput,
  channelPlan: readonly ReminderChannel[],
  transports: readonly ReminderTransport[],
): Promise<ReminderRouteResult> {
  const attempts: ReminderRouteAttempt[] = [];
  const byChannel = new Map<ReminderChannel, ReminderTransport>();
  for (const transport of transports) {
    if (!byChannel.has(transport.channel)) byChannel.set(transport.channel, transport);
  }

  let lastFailure: Extract<ReminderTransportResult, { accepted: false }> | null = null;
  let lastChannel: ReminderChannel | null = null;
  const visited = new Set<ReminderChannel>();

  for (const channel of channelPlan) {
    if (visited.has(channel)) continue;
    visited.add(channel);

    const transport = byChannel.get(channel);
    if (!transport) {
      attempts.push({ channel, outcome: "unavailable" });
      continue;
    }

    const result = await transport.send(input);
    lastChannel = channel;

    if (result.accepted) {
      attempts.push({ channel, outcome: "accepted" });
      return {
        accepted: true,
        channel,
        providerMessageId: result.providerMessageId,
        attempts,
      };
    }

    lastFailure = result;
    attempts.push({ channel, outcome: "rejected", errorCode: result.errorCode });

    // An ambiguous provider/transport result can mean the message was already accepted.
    // Never fall through to another channel in that state or Atlas could duplicate reminders.
    if (!result.safeToFailover) {
      return {
        accepted: false,
        channel,
        errorCode: result.errorCode,
        retryable: result.retryable,
        attempts,
      };
    }
  }

  if (lastFailure) {
    return {
      accepted: false,
      channel: lastChannel,
      errorCode: lastFailure.errorCode,
      retryable: lastFailure.retryable,
      attempts,
    };
  }

  return {
    accepted: false,
    channel: null,
    errorCode: "channel_unavailable",
    retryable: false,
    attempts,
  };
}

export function createWhatsAppReminderTransport(
  config: WhatsAppConfig,
  fetchImplementation: typeof fetch = fetch,
): ReminderTransport {
  return {
    channel: "whatsapp",
    async send(input) {
      const result = await sendApprovedWhatsAppTemplate(input, config, fetchImplementation);
      if (result.accepted) return result;

      return {
        ...result,
        // Existing WhatsApp behavior treats transport uncertainty as non-retryable.
        // Preserve that rule and also prevent cross-channel failover in the same state.
        safeToFailover: result.errorCode !== "delivery_unknown",
      };
    },
  };
}
