import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("Atlas visual feedback and readability layers remain loaded", () => {
  const layout = source("app/layout.tsx");
  assert.match(layout, /atlas-interactions\.css/);
  assert.match(layout, /atlas-readability\.css/);
  assert.match(layout, /patient-clarity\.css/);
});

test("doctor workflow keeps the five supported clinic intervals and receptionist assignment boundary", () => {
  const route = source("app/api/settings/doctor-workflow/route.ts");
  assert.match(route, /new Set\(\[5, 10, 15, 20, 30\]\)/);
  assert.match(route, /membership\?\.role === "receptionist" \? membership\.assigned_doctor_id/);
  assert.match(route, /doctorSpecialty/);
  assert.match(route, /receptionPhone/);
});

test("patient appointment stays doctor-aware, localized, and queue-aware", () => {
  const patientPage = source("app/patient/[token]/page.tsx");
  assert.match(patientPage, /doctor_specialty/);
  assert.match(patientPage, /receptionist_phone/);
  assert.match(patientPage, /queue_position/);
  assert.match(patientPage, /پێش نیوەڕۆ/);
  assert.match(patientPage, /دوای نیوەڕۆ/);
  assert.match(patientPage, /Confirm appointment/);
});

test("appointment history remains administration-only", () => {
  const history = source("app/dashboard/history/page.tsx");
  assert.match(history, /membership\?\.role === "owner" \|\| membership\?\.role === "manager"/);
  assert.match(history, /if \(!canManageRecords\) redirect/);
});

test("Meta webhook signature verification and bounded reminder worker stay in place", () => {
  const webhook = source("app/api/whatsapp/webhook/route.ts");
  const whatsapp = source("lib/reminders/whatsapp.ts");
  const cron = source("app/api/cron/reminders/route.ts");
  assert.match(webhook, /verifyWebhookSignature/);
  assert.match(whatsapp, /maximumBytes/);
  assert.match(cron, /validate_whatsapp_reminder_claim/);
  assert.match(cron, /p_global_daily_limit/);
});

test("database keeps double-booking and doctor-specific reminder protections", () => {
  const doubleBooking = source("supabase/migrations/20260815015730_prevent_double_booked_doctor_slots.sql");
  const doctorReminder = source("supabase/migrations/20260819192000_fix_doctor_specific_reminder_preparation.sql");
  assert.match(doubleBooking, /unique/i);
  assert.match(doubleBooking, /doctor/i);
  assert.match(doctorReminder, /doctor_workflow_settings/);
  assert.match(doctorReminder, /reminders_enabled/);
});

test("feature branches do not consume the production Vercel deployment budget", () => {
  const vercel = JSON.parse(source("vercel.json")) as { git?: { deploymentEnabled?: Record<string, boolean> } };
  assert.equal(vercel.git?.deploymentEnabled?.["atlas-*"], false);
});

test("the durable Atlas product contract is part of the repository", () => {
  const contract = source("docs/ATLAS_PRODUCT_CONTRACT.md");
  assert.match(contract, /Product standard:/);
  assert.match(contract, /patient-facing appointment contract/i);
  assert.match(contract, /Security and privacy invariants/);
  assert.match(contract, /Quality bar for every future Atlas change/);
});
