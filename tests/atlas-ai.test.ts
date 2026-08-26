import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  atlasAiSystemPrompt,
  buildAtlasAiClinicContext,
  shiftAtlasDay,
  type AtlasAiAppointment,
} from "../lib/atlas-ai.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("builds useful clinic-operation summaries without patient identifiers", () => {
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

  const context = buildAtlasAiClinicContext(rows, {
    now: new Date("2026-08-26T07:00:00.000Z"),
    clinicName: "Atlas Test Clinic",
  });

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

test("keeps Atlas AI operational and read-only", () => {
  assert.match(atlasAiSystemPrompt, /read-only/i);
  assert.match(atlasAiSystemPrompt, /Do not provide diagnosis/i);
  assert.match(atlasAiSystemPrompt, /Never claim that you booked/i);
});

test("Atlas AI has an honest user-question privacy boundary", () => {
  const client = read("app/dashboard/assistant/atlas-ai-client.tsx");
  assert.match(client, /Atlas sends your question plus aggregated appointment statistics/);
  assert.match(client, /Do not include patient names, phone numbers, message contents, or clinical information/);
  assert.match(client, /لا تكتب اسم المريض أو رقم الهاتف/);
});

test("Atlas AI reads Vercel OIDC from runtime context without logging credentials", () => {
  const route = read("app/api/atlas-ai/route.ts");
  assert.match(route, /x-vercel-oidc-token/);
  assert.match(route, /@vercel\/request-context/);
  assert.match(route, /AI_GATEWAY_API_KEY/);
  assert.doesNotMatch(route, /console\.(?:log|error)\([^\n]*gatewayToken/);
});
