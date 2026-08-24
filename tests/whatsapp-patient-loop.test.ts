import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createPatientActionPayload,
  extractPatientActionReplies,
  patientLoopActions,
  patientLoopButtonComponents,
  patientLoopProviderLanguage,
  patientLoopTimingText,
  verifyPatientActionPayload,
} from "../lib/reminders/patient-loop.ts";
import { buildTemplatePayload } from "../lib/reminders/whatsapp.ts";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const reminderId = "11111111-1111-4111-8111-111111111111";
const secret = "test-whatsapp-app-secret-long-enough";

test("patient quick-reply payloads are signed, compact and reject tampering", () => {
  const payload = createPatientActionPayload(reminderId, "confirm", secret);
  assert.match(payload, /^ap1\.c\.[0-9a-f-]{36}\.[a-f0-9]{24}$/);
  assert.deepEqual(verifyPatientActionPayload(payload, secret), {
    reminderId,
    action: "confirm",
  });
  assert.equal(verifyPatientActionPayload(payload.replace(".c.", ".x."), secret), null);
  assert.equal(verifyPatientActionPayload(payload, `${secret}-wrong`), null);
  assert.doesNotMatch(payload, /patient|clinic|phone/i);
});

test("confirmation and day-of stages offer exactly three useful WhatsApp actions", () => {
  assert.deepEqual(patientLoopActions("confirm"), ["confirm", "cancel", "earlier"]);
  assert.deepEqual(patientLoopActions("day_of"), ["on_my_way", "running_late", "cancel"]);
  assert.equal(patientLoopButtonComponents(reminderId, "confirm", secret).length, 3);
  assert.equal(patientLoopButtonComponents(reminderId, "day_of", secret).length, 3);
});

test("Meta reminder payload is useful inside WhatsApp and does not require a patient link", () => {
  const confirm = buildTemplatePayload({
    recipientPhone: "+9647501234567",
    clinicName: "Atlas Clinic",
    doctorName: "Sara",
    appointmentAt: "24 Aug 2026, 10:30 AM",
    reminderId,
    messageKind: "confirm",
    delayMinutes: 0,
    templateName: "legacy-marker",
    templateLanguage: "en",
  }, secret) as any;

  assert.equal(confirm.template.name, "atlas_visit_confirm_v1");
  assert.equal(confirm.template.language.code, "en_US");
  assert.deepEqual(confirm.template.components[0].parameters.map((value: any) => value.text), [
    "Atlas Clinic",
    "Sara",
    "24 Aug 2026, 10:30 AM",
  ]);
  assert.equal(confirm.template.components.filter((item: any) => item.type === "button").length, 3);
  assert.equal(JSON.stringify(confirm).includes("/patient/"), false);
  assert.equal(JSON.stringify(confirm).includes("https://"), false);

  const day = buildTemplatePayload({
    recipientPhone: "+9647501234567",
    clinicName: "Atlas Clinic",
    doctorName: "Sara",
    appointmentAt: "10:30 AM",
    reminderId,
    messageKind: "day_of",
    delayMinutes: 30,
    templateName: "legacy-marker",
    templateLanguage: "ar",
  }, secret) as any;
  assert.equal(day.template.name, "atlas_visit_today_v1");
  assert.equal(day.template.components[0].parameters[3].text, "متأخرة تقريباً 30 دقيقة");
});

test("Kurdish patient languages keep the Arabic provider fallback without changing patient state", () => {
  assert.equal(patientLoopProviderLanguage("ku"), "ar");
  assert.equal(patientLoopProviderLanguage("bd"), "ar");
  assert.equal(patientLoopProviderLanguage("ar"), "ar");
  assert.equal(patientLoopProviderLanguage("en"), "en_US");
});

test("clinic timing language is honest and bounded rather than fake precision", () => {
  assert.equal(patientLoopTimingText("en_US", 0), "running on time");
  assert.equal(patientLoopTimingText("en_US", 30), "about 30 min late");
  assert.equal(patientLoopTimingText("en_US", -15), "about 15 min early");
  assert.equal(patientLoopTimingText("ar", 0), "العيادة ماشية بالوقت");
});

test("Meta webhook parser accepts quick-reply callbacks and preserves outbound context", () => {
  const signed = createPatientActionPayload(reminderId, "running_late", secret);
  const payload = {
    object: "whatsapp_business_account",
    entry: [{ changes: [{ field: "messages", value: { messages: [{
      id: "wamid.inbound-12345678",
      from: "9647501234567",
      type: "button",
      context: { id: "wamid.outbound-12345678" },
      button: { payload: signed, text: "I'm late" },
    }] } }] }],
  };
  assert.deepEqual(extractPatientActionReplies(payload), [{
    providerMessageId: "wamid.inbound-12345678",
    fromPhone: "9647501234567",
    payload: signed,
    contextProviderMessageId: "wamid.outbound-12345678",
  }]);
});

test("database and webhook bind WhatsApp replies to phone, outbound message and one inbound event", () => {
  const migration = source("supabase/migrations/20260824070000_whatsapp_patient_loop.sql");
  const webhook = source("app/api/whatsapp/webhook/route.ts");
  const cron = source("app/api/cron/reminders/route.ts");

  assert.match(migration, /provider_message_id text not null unique/);
  assert.match(migration, /v_patient_phone <> \('\+' \|\| v_phone\)/);
  assert.match(migration, /p_context_provider_message_id <> v_outbound_message_id/);
  assert.match(migration, /apply_whatsapp_patient_action_service/);
  assert.match(migration, /private\.whatsapp_patient_action_events/);
  assert.match(migration, /revoke all on private\.whatsapp_patient_action_events from public, anon, authenticated/);
  assert.match(webhook, /verifyPatientActionPayload/);
  assert.match(webhook, /apply_whatsapp_patient_action_service/);
  assert.match(webhook, /sendWhatsAppTextMessage/);
  assert.match(cron, /claim_due_whatsapp_reminders_v3/);
  assert.match(cron, /messageKind: reminder\.message_kind/);
});

test("receptionist live flow is one honest shared timing surface", () => {
  const api = source("app/api/clinic-live-flow/route.ts");
  const component = source("app/dashboard/live-clinic-flow.tsx");
  const navigation = source("app/dashboard/app-navigation.tsx");

  assert.match(api, /private\.can_access_doctor|doctor_day_flow/);
  assert.match(api, /allowedDelays = new Set\(\[-15, 0, 15, 30, 45, 60, 90, 120\]\)/);
  assert.match(component, /Clinic timing/);
  assert.match(component, /Patient updates/);
  assert.match(component, /on the way/);
  assert.match(component, /running late/);
  assert.match(component, /30_000/);
  assert.doesNotMatch(component, /AI|predict|exact wait/i);
  assert.match(navigation, /LiveClinicFlow/);
});

test("manual sharing puts appointment details in WhatsApp before the private details link", () => {
  const action = source("app/dashboard/patient-link-actions.ts");
  const button = source("app/dashboard/patient-link-button.tsx");
  assert.match(action, /doctor_name, appointment_at/);
  assert.match(button, /state\.doctorName/);
  assert.match(button, /appointmentText\(state\.appointmentAt/);
  assert.match(button, /Full details or changes/);
  assert.match(button, /wa\.me/);
});
