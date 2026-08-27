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
const voiceClient = () => read("app/dashboard/assistant/atlas-ai-client-v4.tsx");

function fixtureContext() {
  const rows = [
    { appointment_at: "2026-08-26T06:00:00.000Z", status: "pending", doctor_id: "doctor-1", doctor_name: "Dr. Alan", reminder_status: "pending", arrival_signal: null, patient_name: "Must Not Leave Server", patient_phone: "+9647500000000" },
    { appointment_at: "2026-08-26T08:00:00.000Z", status: "confirmed", doctor_id: "doctor-1", doctor_name: "Dr. Alan", reminder_status: "sent", arrival_signal: "on_my_way", patient_name: "Private Patient", patient_phone: "+9647510000000" },
    { appointment_at: "2026-08-25T07:00:00.000Z", status: "no_show", doctor_id: "doctor-1", doctor_name: "Dr. Alan", reminder_status: "sent", arrival_signal: null },
    { appointment_at: "2026-08-25T08:00:00.000Z", status: "completed", doctor_id: "doctor-1", doctor_name: "Dr. Alan", reminder_status: "sent", arrival_signal: null },
    { appointment_at: "2026-08-27T07:00:00.000Z", status: "confirmed", doctor_id: "doctor-2", doctor_name: "Dr. Sara", reminder_status: "failed", arrival_signal: null },
  ] as Array<AtlasAiAppointment & { patient_name?: string; patient_phone?: string }>;
  return buildAtlasAiClinicContext(rows, { now: new Date("2026-08-26T07:00:00.000Z"), clinicName: "Atlas Test Clinic" });
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

test("Atlas Core answers useful clinic questions even without an external model", () => {
  const context = fixtureContext();
  assert.match(buildAtlasCoreAnswer("How busy are we today?", context), /2 appointments/i);
  assert.match(buildAtlasCoreAnswer("How many no-shows in the last 7 days?", context), /1 no-shows/i);
  assert.match(buildAtlasCoreAnswer("Which day is busiest next week?", context), /2026-08-27/);
  assert.match(buildAtlasCoreAnswer("What should reception focus on today?", context), /pending appointments/i);
  assert.match(buildAtlasCoreAnswer("What is our clinic name?", context), /Atlas Test Clinic/);
  assert.match(buildAtlasCoreAnswer("چەند تەمەنیت؟", context), /Atlas AI/);
});

test("Atlas Core is honest when a general model is unavailable", () => {
  assert.match(buildAtlasCoreAnswer("Explain quantum gravity in detail", fixtureContext()), /Full general-purpose chat needs an external AI model provider/i);
});

test("Atlas AI explains its current privacy boundary accurately", () => {
  const client = voiceClient();
  assert.match(client, /clinic statistics and non-patient Atlas configuration/);
  assert.match(client, /Patient-specific appointment lookups are answered inside Atlas/);
  assert.match(client, /Do not enter diagnoses, clinical notes/);
  assert.match(client, /أسئلة تفاصيل مواعيد المرضى تنجاوب داخل Atlas/);
});

test("Atlas AI sends multi-turn history without allowing system-role injection", () => {
  const route = read("app/api/atlas-ai/route.ts");
  assert.match(route, /body\.messages/);
  assert.match(route, /role !== "user" && role !== "assistant"/);
  assert.match(route, /ATLAS_AI_MAX_HISTORY_MESSAGES/);
  assert.match(route, /ATLAS_AI_MAX_HISTORY_CHARS/);
  assert.match(route, /\.\.\.conversation/);
});

test("Atlas AI retains Cloudflare fallback models with locale-aware routing", () => {
  const provider = read("lib/atlas-ai-cloudflare.ts");
  const route = read("app/api/atlas-ai/route.ts");
  const quality = read("lib/atlas-ai-model-quality.ts");
  assert.match(provider, /CLOUDFLARE_ACCOUNT_ID/);
  assert.match(provider, /CLOUDFLARE_WORKERS_AI_TOKEN/);
  assert.match(provider, /@cf\/openai\/gpt-oss-120b/);
  assert.match(provider, /\/ai\/v1\/chat\/completions/);
  assert.match(quality, /@cf\/zai-org\/glm-4\.7-flash/);
  assert.match(route, /callCloudflareModel/);
  assert.match(route, /atlasCloudflareModelOrder/);
  assert.match(route, /cloudflare_workers_ai/);
  assert.doesNotMatch(route, /ATLAS_AI_FULL_MODEL_ENABLED/);
  assert.doesNotMatch(route, /response\.text\(/);
});

test("Atlas AI uses GPT-5.6 Sol through Vercel Gateway first and supports OIDC", () => {
  const provider = read("lib/atlas-ai-cloudflare.ts");
  const route = read("app/api/atlas-ai/route.ts");
  assert.match(provider, /atlasPaidVercelGatewayEnabled/);
  assert.match(provider, /AI_GATEWAY_API_KEY/);
  assert.match(provider, /VERCEL_OIDC_TOKEN/);
  assert.match(provider, /process\.env\.VERCEL === "1"/);
  assert.match(route, /ATLAS_CHAT_MODEL = "openai\/gpt-5\.6-sol"/);
  assert.match(route, /if \(!atlasPaidVercelGatewayEnabled\(\)\) return null/);
  const paid = route.indexOf("const paidResult = await callPaidVercelModel");
  const cloudflare = route.indexOf("const config = atlasCloudflareAiConfig", paid);
  assert.ok(paid >= 0 && cloudflare > paid);
});

test("Atlas AI falls back cleanly when models are unavailable or quota-limited", () => {
  const route = read("app/api/atlas-ai/route.ts");
  assert.match(route, /buildAtlasCoreAnswer/);
  assert.match(route, /mode: "atlas_core"/);
  assert.match(route, /MODEL_RETRY_DELAY_MS/);
  assert.match(route, /modelUnavailableUntil/);
  assert.match(route, /if \(!response\.ok\)/);
  assert.doesNotMatch(route, /diagnostic/);
});

test("Atlas AI Gateway helper protects primary model credentials", () => {
  const gateway = read("lib/atlas-ai-gateway.ts");
  const route = read("app/api/atlas-ai/route.ts");
  assert.match(gateway, /AI_GATEWAY_API_KEY/);
  assert.match(gateway, /ai-gateway-protocol-version/);
  assert.match(gateway, /ai-gateway-auth-method/);
  assert.match(route, /atlasGatewayHeaders\(request\)/);
  assert.doesNotMatch(route, /reasoning_effort/);
  assert.doesNotMatch(route, /console\.(?:log|error)\([^\n]*token/);
});

test("Atlas Voice transcription stays server-side, authenticated, bounded, and secret-free", () => {
  const provider = read("lib/atlas-ai-cloudflare.ts");
  const route = read("app/api/atlas-ai/transcribe/route.ts");
  const voice = read("lib/atlas-voice.ts");
  assert.match(provider, /ATLAS_AI_TRANSCRIPTION_MODEL/);
  assert.match(provider, /@cf\/openai\/whisper-large-v3-turbo/);
  assert.match(provider, /\/ai\/run\//);
  assert.match(route, /supabase\.auth\.getUser\(\)/);
  assert.match(route, /sameOriginRequest/);
  assert.match(route, /checkAtlasVoiceUpload/);
  assert.match(voice, /ATLAS_VOICE_MAX_AUDIO_BYTES/);
  assert.match(route, /Buffer\.from\(await audio\.arrayBuffer\(\)\)\.toString\("base64"\)/);
  assert.match(route, /vad_filter: true/);
  assert.match(route, /Cache-Control[\s\S]*no-store, private/);
  assert.doesNotMatch(route, /service[_-]?role/i);
  assert.doesNotMatch(route, /console\./);
  assert.doesNotMatch(route, /patient_name|patient_phone/);
});

test("Atlas Voice V4 stays intact behind the V5 table-capable client", () => {
  const active = read("app/dashboard/assistant/atlas-ai-client.tsx");
  const tableClient = read("app/dashboard/assistant/atlas-ai-client-v5.tsx");
  const client = voiceClient();
  const recorder = read("app/dashboard/assistant/atlas-pcm-recorder.ts");
  assert.match(active, /atlas-ai-client-v5/);
  assert.match(tableClient, /AtlasAiClientV4/);
  assert.match(tableClient, /atlas-ai-table/);
  assert.match(tableClient, /MutationObserver/);
  assert.match(client, /startAtlasPcmCapture/);
  assert.match(client, /atlas-voice\.wav/);
  assert.match(client, /"starting"/);
  assert.match(client, /setVoiceStage\("starting"\)/);
  assert.match(client, /setVoiceStage\("transcribing"\)/);
  assert.match(client, /LoadingRing/);
  assert.match(client, /aria-busy/);
  assert.match(client, /Converting voice to text/);
  assert.match(client, /atlas-ai-record-dot/);
  assert.match(recorder, /TARGET_SAMPLE_RATE = 16_000/);
  assert.match(recorder, /RIFF/);
  assert.match(recorder, /WAVE/);
  assert.match(recorder, /createScriptProcessor/);
  assert.doesNotMatch(client, /MediaRecorder/);
  assert.doesNotMatch(client, /SpeechRecognition/);
  assert.doesNotMatch(client, /webkitSpeechRecognition/);
});

test("Kurdish Atlas voice uses multi-pass ASR and rejects low-confidence gibberish", () => {
  const route = read("app/api/atlas-ai/transcribe/route.ts");
  const helper = read("lib/atlas-voice.ts");
  assert.match(route, /atlasKurdishAsrPasses/);
  assert.match(route, /Promise\.all/);
  assert.match(route, /reconcileKurdishTranscript/);
  assert.match(route, /confidence === "low"/);
  assert.match(route, /unclear_speech/);
  assert.match(helper, /persian_hint/);
  assert.match(helper, /arabic_hint/);
  assert.match(helper, /turkish_hint/);
  assert.match(helper, /Arabic-based Kurdish script/);
});

test("Atlas dictation leaves recognized text for review and never auto-sends it", () => {
  const client = voiceClient();
  assert.match(client, /purpose==="dictation"/);
  assert.match(client, /setQuestion\(current=>/);
  assert.match(client, /Tap, speak, then stop/);
  assert.match(client, /stopCapture\(false\)/);
  assert.doesNotMatch(client, /doneSpeaking/i);
});

test("Atlas live voice exposes recording and transcription activity without fake delay", () => {
  const client = voiceClient();
  assert.match(client, /Live voice/);
  assert.match(client, /Atlas Voice/);
  assert.match(client, /Send now/);
  assert.match(client, /Interrupt/);
  assert.match(client, /Try again/);
  assert.match(client, /setMicLevel/);
  assert.match(client, /Recording — microphone is hearing you/);
  assert.match(client, /atlas-ai-loading-ring/);
  assert.match(client, /atlasSpin/);
  assert.doesNotMatch(client, /setTimeout\([^\n]*(?:2000|3000)/);
});

test("Atlas AI renders rich responses instead of exposing raw markdown decoration", () => {
  const client = voiceClient();
  const tableClient = read("app/dashboard/assistant/atlas-ai-client-v5.tsx");
  assert.match(client, /function RichMessage/);
  assert.match(client, /inlineRichText/);
  assert.match(client, /<strong/);
  assert.match(client, /atlas-ai-bullet/);
  assert.match(client, /\[-\*•\]/);
  assert.match(tableClient, /parseTableRow/);
  assert.match(tableClient, /document\.createElement\("table"\)/);
});

test("Atlas AI model responses are receptionist-first, Atlas-grounded, table-capable, and voice-aware", () => {
  const route = read("app/api/atlas-ai/route.ts");
  const knowledge = read("lib/atlas-ai-product-knowledge.ts");
  assert.match(route, /operating assistant inside Atlas/i);
  assert.match(route, /Start with the useful answer/i);
  assert.match(route, /plain, familiar words/i);
  assert.match(route, /Sorani, Badini, and Iraqi Arabic/i);
  assert.match(route, /if the user asks for a table/i);
  assert.match(route, /use a clean Markdown table/i);
  assert.match(route, /do not tell the user to click an "Appointments" page/i);
  assert.match(route, /This turn came from Atlas Voice/);
  assert.match(route, /Usually use 1-3 short sentences/);
  assert.match(route, /interaction === "voice"/);
  assert.match(knowledge, /verified daily appointment surface is Schedule/i);
  assert.match(knowledge, /Atlas Online/);
  assert.match(knowledge, /Atlas Local/);
  assert.match(knowledge, /Smart Fill/);
});

test("Atlas external model context contains configuration but not patient record rows", () => {
  const route = read("app/api/atlas-ai/route.ts");
  const knowledge = read("lib/atlas-ai-product-knowledge.ts");
  assert.match(route, /resolveAtlasRecordRequest\(authorizedRows, conversation, responseLocale\)/);
  assert.match(route, /if \(recordResolution\?\.localOnly && recordResolution\.answer\)/);
  assert.match(route, /modelContext = \{ clinicOperations: clinicContext, atlasConfiguration: operationalContext \}/);
  assert.doesNotMatch(route, /modelContext =[^\n]*authorizedRows/);
  assert.match(knowledge, /No patient names or phone numbers are included in this context/);
});
