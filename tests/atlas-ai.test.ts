import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  atlasAiSystemPrompt,
  buildAtlasAiClinicContext,
  buildAtlasCoreAnswer,
  shiftAtlasDay,
  type AtlasAiAppointment,
} from "../lib/atlas-ai.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function fixtureContext() {
  const rows = [
    {
      appointment_at: "2026-08-26T06:00:00.000Z",
      status: "pending",
      doctor_id: "doctor-1",
      doctor_name: "Dr. Alan",
      reminder_status: "pending",
      arrival_signal: null,
      patient_name: "Must Not Leave Server",
      patient_phone: "+9647500000000",
    },
    {
      appointment_at: "2026-08-26T08:00:00.000Z",
      status: "confirmed",
      doctor_id: "doctor-1",
      doctor_name: "Dr. Alan",
      reminder_status: "sent",
      arrival_signal: "on_my_way",
      patient_name: "Private Patient",
      patient_phone: "+9647510000000",
    },
    {
      appointment_at: "2026-08-25T07:00:00.000Z",
      status: "no_show",
      doctor_id: "doctor-1",
      doctor_name: "Dr. Alan",
      reminder_status: "sent",
      arrival_signal: null,
    },
    {
      appointment_at: "2026-08-25T08:00:00.000Z",
      status: "completed",
      doctor_id: "doctor-1",
      doctor_name: "Dr. Alan",
      reminder_status: "sent",
      arrival_signal: null,
    },
    {
      appointment_at: "2026-08-27T07:00:00.000Z",
      status: "confirmed",
      doctor_id: "doctor-2",
      doctor_name: "Dr. Sara",
      reminder_status: "failed",
      arrival_signal: null,
    },
  ] as Array<AtlasAiAppointment & { patient_name?: string; patient_phone?: string }>;

  return buildAtlasAiClinicContext(rows, {
    now: new Date("2026-08-26T07:00:00.000Z"),
    clinicName: "Atlas Test Clinic",
  });
}

test("builds useful clinic-operation summaries without patient identifiers", () => {
  const context = fixtureContext();

  assert.equal(context.today.total, 2);
  assert.equal(context.today.active, 2);
  assert.equal(context.today.arrivalSignals, 1);
  assert.equal(context.trailing7.statuses.no_show, 1);
  assert.equal(context.trailing7.noShowRatePercent, 50);
  assert.equal(context.next7.total, 1);
  assert.equal(context.reminders.failedInScope, 1);
  assert.equal(context.doctors.length, 2);

  const serialized = JSON.stringify(context);
  assert.equal(serialized.includes("Must Not Leave Server"), false);
  assert.equal(serialized.includes("Private Patient"), false);
  assert.equal(serialized.includes("+9647500000000"), false);
  assert.equal(serialized.includes("+9647510000000"), false);
});

test("uses Baghdad calendar days across month boundaries", () => {
  assert.equal(shiftAtlasDay("2026-08-31", 1), "2026-09-01");
  assert.equal(shiftAtlasDay("2026-09-01", -1), "2026-08-31");
});

test("keeps Atlas AI useful but read-only and outside patient-specific clinical decisions", () => {
  assert.match(atlasAiSystemPrompt, /read-only/i);
  assert.match(atlasAiSystemPrompt, /Do not provide diagnosis/i);
  assert.match(atlasAiSystemPrompt, /Never claim that you booked/i);
  assert.match(atlasAiSystemPrompt, /general-knowledge questions/i);
  assert.match(atlasAiSystemPrompt, /conversation history/i);
});

test("Atlas Core answers useful clinic questions even without a paid model", () => {
  const context = fixtureContext();

  assert.match(buildAtlasCoreAnswer("How busy are we today?", context), /2 appointments/i);
  assert.match(buildAtlasCoreAnswer("How many no-shows in the last 7 days?", context), /1 no-shows/i);
  assert.match(buildAtlasCoreAnswer("Which day is busiest next week?", context), /2026-08-27/);
  assert.match(buildAtlasCoreAnswer("What should reception focus on today?", context), /pending appointments/i);
  assert.match(buildAtlasCoreAnswer("What is our clinic name?", context), /Atlas Test Clinic/);
  assert.match(buildAtlasCoreAnswer("چەند تەمەنیت؟", context), /Atlas AI/);
});

test("Atlas Core is honest when a general model is unavailable", () => {
  const context = fixtureContext();
  const answer = buildAtlasCoreAnswer("Explain quantum gravity in detail", context);
  assert.match(answer, /Full general-purpose chat needs an external AI model provider/i);
});

test("Atlas AI has an honest conversation privacy boundary", () => {
  const client = read("app/dashboard/assistant/atlas-ai-client.tsx");
  assert.match(client, /Atlas sends this conversation plus aggregated appointment statistics/);
  assert.match(client, /Do not include patient names, phone numbers, message contents, or patient-specific clinical information/);
  assert.match(client, /لا تكتب اسم المريض أو رقم الهاتف/);
});

test("Atlas AI sends multi-turn history without allowing system-role injection", () => {
  const route = read("app/api/atlas-ai/route.ts");
  assert.match(route, /body\.messages/);
  assert.match(route, /role !== "user" && role !== "assistant"/);
  assert.match(route, /ATLAS_AI_MAX_HISTORY_MESSAGES/);
  assert.match(route, /ATLAS_AI_MAX_HISTORY_CHARS/);
  assert.match(route, /\.\.\.conversation/);
});

test("Atlas AI falls back cleanly when the external model provider is blocked", () => {
  const route = read("app/api/atlas-ai/route.ts");
  assert.match(route, /buildAtlasCoreAnswer/);
  assert.match(route, /mode: "atlas_core"/);
  assert.match(route, /MODEL_RETRY_DELAY_MS/);
  assert.match(route, /modelUnavailableUntil/);
  assert.match(route, /status === 401 \|\| gatewayResponse\.status === 402 \|\| gatewayResponse\.status === 403/);
});

test("Atlas AI Gateway OIDC includes the protocol auth headers Vercel requires", () => {
  const gateway = read("lib/atlas-ai-gateway.ts");
  const route = read("app/api/atlas-ai/route.ts");
  assert.match(gateway, /x-vercel-oidc-token/);
  assert.match(gateway, /@vercel\/request-context/);
  assert.match(gateway, /AI_GATEWAY_API_KEY/);
  assert.match(gateway, /ai-gateway-protocol-version/);
  assert.match(gateway, /ai-gateway-auth-method/);
  assert.match(route, /atlasGatewayHeaders\(request\)/);
  assert.doesNotMatch(route, /reasoning_effort/);
  assert.doesNotMatch(route, /console\.(?:log|error)\([^\n]*token/);
});

test("Atlas AI voice is free browser speech, not a paid server audio route", () => {
  const client = read("app/dashboard/assistant/atlas-ai-client.tsx");

  assert.match(client, /SpeechRecognition/);
  assert.match(client, /webkitSpeechRecognition/);
  assert.match(client, /speechSynthesis/);
  assert.match(client, /SpeechSynthesisUtterance/);
  assert.match(client, /voiceMode/);
  assert.match(client, /Listening/);
  assert.doesNotMatch(client, /\/api\/atlas-ai\/transcribe/);
  assert.doesNotMatch(client, /\/api\/atlas-ai\/speech/);
});
