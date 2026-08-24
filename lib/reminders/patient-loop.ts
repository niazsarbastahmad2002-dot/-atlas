import { createHmac, timingSafeEqual } from "node:crypto";

export type PatientLoopMessageKind = "confirm" | "day_of";
export type PatientWhatsAppAction = "confirm" | "cancel" | "earlier" | "on_my_way" | "running_late";

export const ATLAS_PATIENT_CONFIRM_TEMPLATE = "atlas_visit_confirm_v1";
export const ATLAS_PATIENT_DAY_TEMPLATE = "atlas_visit_today_v1";
export const ATLAS_PATIENT_LOOP_TEMPLATE_NAMES = [
  ATLAS_PATIENT_CONFIRM_TEMPLATE,
  ATLAS_PATIENT_DAY_TEMPLATE,
] as const;
export const ATLAS_PATIENT_LOOP_REQUIRED_LANGUAGES = ["ar", "en_US"] as const;

export const ATLAS_PATIENT_LOOP_VARIANTS = [
  {
    templateName: ATLAS_PATIENT_CONFIRM_TEMPLATE,
    kind: "confirm" as const,
    language: "ar",
    text: "تذكير من {{1}}. عندك موعد ويّا د. {{2}} بوقت {{3}}. اختار خيار حتى يعرف الاستقبال شنو خطتك.",
    examples: ["عيادة أطلس", "أحمد", "24/8/2026، 10:30 ص"],
    buttons: ["راح أجي", "ما أگدر أجي", "أبكر إذا متاح"],
  },
  {
    templateName: ATLAS_PATIENT_CONFIRM_TEMPLATE,
    kind: "confirm" as const,
    language: "en_US",
    text: "Appointment reminder from {{1}}. You are booked with Dr. {{2}} at {{3}}. Choose one option so reception knows your plan.",
    examples: ["Atlas Clinic", "Ahmed", "24 Aug 2026, 10:30 AM"],
    buttons: ["I'll come", "Can't come", "Earlier if free"],
  },
  {
    templateName: ATLAS_PATIENT_DAY_TEMPLATE,
    kind: "day_of" as const,
    language: "ar",
    text: "موعدك اليوم في {{1}} ويّا د. {{2}} بوقت {{3}}. وضع العيادة: {{4}}. خبر الاستقبال شنو وضعك.",
    examples: ["عيادة أطلس", "أحمد", "10:30 ص", "العيادة ماشية بالوقت"],
    buttons: ["بطريقي", "راح أتأخر", "ما أگدر أجي"],
  },
  {
    templateName: ATLAS_PATIENT_DAY_TEMPLATE,
    kind: "day_of" as const,
    language: "en_US",
    text: "Your appointment at {{1}} is today with Dr. {{2}} at {{3}}. Clinic timing: {{4}}. Let reception know your plan.",
    examples: ["Atlas Clinic", "Ahmed", "10:30 AM", "running on time"],
    buttons: ["On my way", "I'm late", "Can't come"],
  },
] as const;

const actionCodes: Record<PatientWhatsAppAction, string> = {
  confirm: "c",
  cancel: "x",
  earlier: "e",
  on_my_way: "w",
  running_late: "l",
};

const actionsByCode: Record<string, PatientWhatsAppAction> = {
  c: "confirm",
  x: "cancel",
  e: "earlier",
  w: "on_my_way",
  l: "running_late",
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function signature(base: string, secret: string) {
  if (secret.length < 16) throw new Error("WhatsApp app secret is unavailable.");
  return createHmac("sha256", secret).update(base).digest("hex").slice(0, 24);
}

export function createPatientActionPayload(
  reminderId: string,
  action: PatientWhatsAppAction,
  appSecret: string,
) {
  if (!uuidPattern.test(reminderId)) throw new Error("Invalid reminder id.");
  const base = `ap1.${actionCodes[action]}.${reminderId}`;
  return `${base}.${signature(base, appSecret)}`;
}

export function verifyPatientActionPayload(payload: string, appSecret: string): {
  reminderId: string;
  action: PatientWhatsAppAction;
} | null {
  if (typeof payload !== "string" || payload.length > 256) return null;
  const match = /^ap1\.([cxewl])\.([0-9a-f-]{36})\.([a-f0-9]{24})$/i.exec(payload);
  if (!match || !uuidPattern.test(match[2])) return null;
  const action = actionsByCode[match[1].toLowerCase()];
  if (!action || appSecret.length < 16) return null;
  const base = `ap1.${match[1].toLowerCase()}.${match[2].toLowerCase()}`;
  const expected = Buffer.from(signature(base, appSecret));
  const supplied = Buffer.from(match[3].toLowerCase());
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  return { reminderId: match[2].toLowerCase(), action };
}

export function patientLoopTemplateName(kind: PatientLoopMessageKind) {
  return kind === "day_of" ? ATLAS_PATIENT_DAY_TEMPLATE : ATLAS_PATIENT_CONFIRM_TEMPLATE;
}

export function patientLoopProviderLanguage(value: string) {
  return value === "en" || value === "en_US" ? "en_US" : "ar";
}

export function patientLoopTimingText(providerLanguage: string, delayMinutes: number) {
  const delay = Number.isFinite(delayMinutes) ? Math.max(-15, Math.min(120, Math.round(delayMinutes))) : 0;
  if (providerLanguage === "en_US") {
    if (delay < 0) return `about ${Math.abs(delay)} min early`;
    if (delay === 0) return "running on time";
    return `about ${delay} min late`;
  }
  if (delay < 0) return `متقدمة تقريباً ${Math.abs(delay)} دقيقة`;
  if (delay === 0) return "العيادة ماشية بالوقت";
  return `متأخرة تقريباً ${delay} دقيقة`;
}

export function patientLoopActions(kind: PatientLoopMessageKind): PatientWhatsAppAction[] {
  return kind === "day_of"
    ? ["on_my_way", "running_late", "cancel"]
    : ["confirm", "cancel", "earlier"];
}

export function patientLoopButtonComponents(
  reminderId: string,
  kind: PatientLoopMessageKind,
  appSecret: string,
) {
  return patientLoopActions(kind).map((action, index) => ({
    type: "button",
    sub_type: "quick_reply",
    index: String(index),
    parameters: [{
      type: "payload",
      payload: createPatientActionPayload(reminderId, action, appSecret),
    }],
  }));
}

export type PatientActionReply = {
  providerMessageId: string;
  fromPhone: string;
  payload: string;
  contextProviderMessageId: string | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function extractPatientActionReplies(payload: unknown): PatientActionReply[] {
  const root = record(payload);
  if (root?.object !== "whatsapp_business_account" || !Array.isArray(root.entry)) return [];
  const replies: PatientActionReply[] = [];

  for (const rawEntry of root.entry) {
    const entry = record(rawEntry);
    if (!entry || !Array.isArray(entry.changes)) continue;
    for (const rawChange of entry.changes) {
      const change = record(rawChange);
      if (change?.field !== "messages") continue;
      const value = record(change.value);
      if (!value || !Array.isArray(value.messages)) continue;
      for (const rawMessage of value.messages) {
        const message = record(rawMessage);
        const providerMessageId = typeof message?.id === "string" ? message.id : "";
        const fromPhone = typeof message?.from === "string" ? message.from.replace(/\D/g, "") : "";
        if (providerMessageId.length < 8 || providerMessageId.length > 512 || !/^9647\d{9}$/.test(fromPhone)) continue;

        let actionPayload: string | null = null;
        if (message.type === "button") {
          const button = record(message.button);
          if (typeof button?.payload === "string") actionPayload = button.payload;
        } else if (message.type === "interactive") {
          const interactive = record(message.interactive);
          const buttonReply = record(interactive?.button_reply);
          if (typeof buttonReply?.id === "string") actionPayload = buttonReply.id;
        }
        if (!actionPayload || actionPayload.length > 256) continue;
        const context = record(message.context);
        const contextProviderMessageId = typeof context?.id === "string" && context.id.length <= 512
          ? context.id
          : null;
        replies.push({ providerMessageId, fromPhone, payload: actionPayload, contextProviderMessageId });
      }
    }
  }
  return replies;
}

export function patientActionAcknowledgement(
  language: string,
  action: PatientWhatsAppAction,
) {
  const locale = language === "ku" || language === "bd" || language === "ar" ? language : "en";
  const copy = {
    en: {
      confirm: "Confirmed. Reception can see that you're coming.",
      cancel: "Cancelled. Reception has been notified.",
      earlier: "You're on the earlier-time list. Reception can offer you a suitable opening if one becomes free.",
      on_my_way: "Thanks. Reception can see that you're on your way.",
      running_late: "Thanks for letting us know. Reception can see that you're running late.",
    },
    ku: {
      confirm: "پشتڕاست کرا. ڕیسێپشن دەبینێت کە دێیت.",
      cancel: "مەوعیدەکە هەڵوەشێنرایەوە و ڕیسێپشن ئاگادار کرایەوە.",
      earlier: "خراویتە لیستی مەوعیدی زووتر. ئەگەر کاتێکی گونجاو بەتاڵ بوو، ڕیسێپشن دەتوانێت پێشنیارت پێ بکات.",
      on_my_way: "سوپاس. ڕیسێپشن دەبینێت کە لە ڕێگادایت.",
      running_late: "سوپاس بۆ ئاگادارکردنەوە. ڕیسێپشن دەبینێت کە دواکەوتوویت.",
    },
    bd: {
      confirm: "پشتڕاست بوو. ڕیسێپشن دبینیت کو تو دێی.",
      cancel: "مەوعید هاتە هەلوەشاندن و ڕیسێپشن هاتە ئاگەهدارکرن.",
      earlier: "تو د لیستا مەوعیدێن زووتر دای. ئەگەر دەمەکێ گونجای ڤەبوو، ڕیسێپشن دشێت پێشنیارا وێ بۆ تە بکەت.",
      on_my_way: "سوپاس. ڕیسێپشن دبینیت کو تو د ڕێکێ دای.",
      running_late: "سوپاس کو تە ئاگەهدار کر. ڕیسێپشن دبینیت کو تو دواکەفتی.",
    },
    ar: {
      confirm: "تم التأكيد. الاستقبال يشوف إنك راح تجي.",
      cancel: "تم إلغاء الموعد ووصل الخبر للاستقبال.",
      earlier: "ضفناك لقائمة الموعد الأبكر. إذا صار وقت مناسب فاضي، الاستقبال يگدر يعرضه عليك.",
      on_my_way: "شكراً. الاستقبال يشوف إنك بالطريق.",
      running_late: "شكراً لأن خبرتنا. الاستقبال يشوف إنك راح تتأخر.",
    },
  } as const;
  return copy[locale][action];
}
