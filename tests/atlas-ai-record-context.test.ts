import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  resolveAtlasRecordRequest,
  type AtlasAiRecordAppointmentV2,
} from "../lib/atlas-ai-record-context-v2.ts";

const rows: AtlasAiRecordAppointmentV2[] = [
  {
    appointment_at: "2026-08-27T06:00:00.000Z",
    status: "pending",
    doctor_id: "doctor-niaz-ahmad",
    doctor_name: "Niaz Ahmad",
    patient_name: "Ari Hassan",
    patient_phone: "+9647501111111",
    contact_relationship: "self",
    reminder_status: "sent",
    reminder_language: "ku",
    arrival_signal: null,
  },
  {
    appointment_at: "2026-08-27T08:30:00.000Z",
    status: "confirmed",
    doctor_id: "doctor-niaz-ahmad",
    doctor_name: "Niaz Ahmad",
    patient_name: "Shilan Karim",
    patient_phone: "+9647502222222",
    contact_relationship: "self",
    reminder_status: "pending",
    reminder_language: "ku",
    arrival_signal: "on_my_way",
  },
  {
    appointment_at: "2026-08-27T10:15:00.000Z",
    status: "pending",
    doctor_id: "doctor-niaz-ahmad",
    doctor_name: "Niaz Ahmad",
    patient_name: "Soran Ahmed",
    patient_phone: "+9647503333333",
    contact_relationship: "parent",
    reminder_status: "failed",
    reminder_language: "bd",
    arrival_signal: null,
  },
  {
    appointment_at: "2026-08-27T11:00:00.000Z",
    status: "pending",
    doctor_id: "doctor-niaz-sarbast",
    doctor_name: "Niaz Sarbast",
    patient_name: "Dara Ali",
    patient_phone: "+9647504444444",
    contact_relationship: "self",
    reminder_status: "pending",
    reminder_language: "bd",
    arrival_signal: null,
  },
  {
    appointment_at: "2026-08-28T07:00:00.000Z",
    status: "confirmed",
    doctor_id: "doctor-niaz-ahmad",
    doctor_name: "Niaz Ahmad",
    patient_name: "Tomorrow Patient",
    patient_phone: "+9647505555555",
    contact_relationship: "self",
    reminder_status: "pending",
    reminder_language: "en",
    arrival_signal: null,
  },
];

const now = new Date("2026-08-27T12:00:00.000Z");
const routeSource = () => readFileSync(new URL("../app/api/atlas-ai/route.ts", import.meta.url), "utf8");

test("Atlas AI resolves the screenshot-style Sorani request to real Atlas records without a table", () => {
  const result = resolveAtlasRecordRequest(
    rows,
    [
      { role: "user", content: "ئەمڕۆ دکتۆر Niaz Ahmad چەند مەوعیدی هەیە؟" },
      { role: "assistant", content: "دکتۆر Niaz Ahmad ئەمڕۆ ٣ مەوعیدی هەیە." },
      { role: "user", content: "هەموو وردەکارییەکانی ئەو سێ مەوعیدەم پێ بڵێ." },
    ],
    "ku",
    { now },
  );

  assert.ok(result);
  assert.equal(result.localOnly, true);
  assert.equal(result.matchedCount, 3);
  assert.deepEqual(result.appointments.map((item) => item.patientName), ["Ari Hassan", "Shilan Karim", "Soran Ahmed"]);
  assert.ok(result.answer);
  assert.match(result.answer, /Ari Hassan/);
  assert.match(result.answer, /Shilan Karim/);
  assert.match(result.answer, /Soran Ahmed/);
  assert.match(result.answer, /بیرخستنەوە/);
  assert.doesNotMatch(result.answer, /\|---|\|\s*ژمارە|"Appointments"|Atlas UI/);
  assert.doesNotMatch(result.answer, /\+964750/);
});

test("Atlas AI carries doctor and date context across a natural follow-up", () => {
  const result = resolveAtlasRecordRequest(
    rows,
    [
      { role: "user", content: "Tell me about Niaz Ahmad on 27-08-2026." },
      { role: "assistant", content: "Niaz Ahmad has 3 appointments that day." },
      { role: "user", content: "Show me each one with the status and reminder." },
    ],
    "en",
    { now },
  );

  assert.ok(result);
  assert.equal(result.matchedCount, 3);
  assert.match(result.answer ?? "", /status:/);
  assert.match(result.answer ?? "", /reminder:/);
  assert.equal((result.answer ?? "").includes("Dara Ali"), false);
  assert.equal((result.answer ?? "").includes("Tomorrow Patient"), false);
});

test("Atlas AI includes phone numbers only when the latest authorized question asks for them", () => {
  const withoutPhone = resolveAtlasRecordRequest(
    rows,
    [{ role: "user", content: "Tell me all details for Niaz Ahmad today." }],
    "en",
    { now },
  );
  assert.ok(withoutPhone);
  assert.equal(JSON.stringify(withoutPhone.appointments).includes("+964750"), false);

  const withPhone = resolveAtlasRecordRequest(
    rows,
    [{ role: "user", content: "Give me the phone numbers for Niaz Ahmad's appointments today." }],
    "en",
    { now },
  );
  assert.ok(withPhone);
  assert.deepEqual(withPhone.appointments.map((item) => item.patientPhone), ["+9647501111111", "+9647502222222", "+9647503333333"]);
});

test("ordinary aggregate questions stay on the non-patient Atlas path", () => {
  const result = resolveAtlasRecordRequest(
    rows,
    [{ role: "user", content: "How many appointments do we have today?" }],
    "en",
    { now },
  );
  assert.equal(result, null);
});

test("patient-detail questions without a safe selector ask for clarification rather than going to an external model", () => {
  const result = resolveAtlasRecordRequest(
    rows,
    [{ role: "user", content: "Show me the patient names and all their details." }],
    "en",
    { now },
  );
  assert.ok(result);
  assert.equal(result.localOnly, true);
  assert.equal(result.matchedCount, 0);
  assert.match(result.answer ?? "", /doctor, day, or patient name/i);
});

test("requesting clinical notes gets an honest Atlas boundary, not invented patient information", () => {
  const result = resolveAtlasRecordRequest(
    rows,
    [{ role: "user", content: "Show me Niaz Ahmad's appointments today with all notes." }],
    "en",
    { now },
  );
  assert.ok(result?.answer);
  assert.match(result.answer, /does not store patient clinical notes/i);
});

test("Atlas patient-detail resolution stays before external AI and inside the role-scoped appointment query", () => {
  const route = routeSource();
  assert.match(route, /patient_name, patient_phone, contact_relationship/);
  assert.match(route, /membership\?\.role === "receptionist"[\s\S]*appointmentQuery = appointmentQuery\.eq\("doctor_id", membership\.assigned_doctor_id\)/);
  assert.match(route, /resolveAtlasRecordRequest\(authorizedRows, conversation, responseLocale\)/);
  const localAnswer = route.indexOf("if (recordResolution?.localOnly && recordResolution.answer)");
  const externalModel = route.indexOf("const result = await callCloudflareModel", localAnswer);
  assert.ok(localAnswer >= 0 && externalModel > localAnswer);
  assert.doesNotMatch(route, /modelContext[^\n]*authorizedRows/);
});
