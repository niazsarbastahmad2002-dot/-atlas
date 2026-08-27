import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildAtlasAuthorizedRecordContext,
  buildAtlasRecordFallbackAnswer,
  type AtlasAiRecordAppointment,
} from "../lib/atlas-ai-record-context.ts";

const rows: AtlasAiRecordAppointment[] = [
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
    appointment_at: "2026-08-27T10:00:00.000Z",
    status: "pending",
    doctor_id: "doctor-niaz-sarbast",
    doctor_name: "Niaz Sarbast",
    patient_name: "Dara Ali",
    patient_phone: "+9647503333333",
    contact_relationship: "parent",
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
    patient_phone: "+9647504444444",
    contact_relationship: "self",
    reminder_status: "pending",
    reminder_language: "en",
    arrival_signal: null,
  },
];

const now = new Date("2026-08-27T12:00:00.000Z");

const routeSource = () => readFileSync(new URL("../app/api/atlas-ai/route.ts", import.meta.url), "utf8");

test("Atlas AI can resolve the exact follow-up from a date summary to one doctor's patient details", () => {
  const context = buildAtlasAuthorizedRecordContext(
    rows,
    [
      { role: "user", content: "How many appointments are there on 27-08-2026?" },
      { role: "assistant", content: "There are 3 appointments. Niaz Ahmad has 2 and Niaz Sarbast has 1." },
      { role: "user", content: "Tell me the details of Niaz Ahmad's two appointments." },
    ],
    { now },
  );

  assert.ok(context);
  assert.equal(context.matchedCount, 2);
  assert.deepEqual(context.appointments.map((item) => item.patientName), ["Ari Hassan", "Shilan Karim"]);
  assert.equal(context.phoneNumbersIncluded, false);
  assert.equal("patientPhone" in context.appointments[0], false);
  assert.equal(JSON.stringify(context).includes("Dara Ali"), false);
  assert.equal(JSON.stringify(context).includes("Tomorrow Patient"), false);
});

test("Atlas AI includes patient phone numbers only when the latest authorized question asks for them", () => {
  const context = buildAtlasAuthorizedRecordContext(
    rows,
    [{ role: "user", content: "What are the phone numbers for Niaz Ahmad's patients on 27-08-2026?" }],
    { now },
  );

  assert.ok(context);
  assert.equal(context.matchedCount, 2);
  assert.equal(context.phoneNumbersIncluded, true);
  assert.deepEqual(context.appointments.map((item) => item.patientPhone), ["+9647501111111", "+9647502222222"]);
});

test("Atlas AI does not load patient-identifying record context for ordinary aggregate questions", () => {
  const context = buildAtlasAuthorizedRecordContext(
    rows,
    [{ role: "user", content: "How many appointments do we have today?" }],
    { now },
  );
  assert.equal(context, null);
});

test("Atlas record fallback gives a useful receptionist answer from Atlas data", () => {
  const context = buildAtlasAuthorizedRecordContext(
    rows,
    [{ role: "user", content: "Tell me details of Niaz Ahmad's patients today." }],
    { now },
  );
  assert.ok(context);
  const answer = buildAtlasRecordFallbackAnswer(context, "ku");
  assert.ok(answer);
  assert.match(answer, /Ari Hassan/);
  assert.match(answer, /Shilan Karim/);
  assert.match(answer, /بیرخستنەوە/);
  assert.doesNotMatch(answer, /\+964750/);
});

test("Atlas patient record lookup stays inside the caller's existing role-scoped query and before external AI", () => {
  const route = routeSource();
  assert.match(route, /patient_name, patient_phone, contact_relationship/);
  assert.match(route, /membership\?\.role === "receptionist"[\s\S]*appointmentQuery = appointmentQuery\.eq\("doctor_id", membership\.assigned_doctor_id\)/);
  assert.match(route, /buildAtlasAuthorizedRecordContext\(authorizedRows, conversation\)/);
  assert.match(route, /Patient-identifying appointment answers stay inside Atlas/);
  const directAnswer = route.indexOf("if (recordAnswer)");
  const externalModel = route.indexOf("callCloudflareFreeModel(conversation");
  assert.ok(directAnswer >= 0 && externalModel > directAnswer);
  assert.doesNotMatch(route, /Authorized Atlas appointment records for this exact question/);
});
