import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260820093000_whatsapp_kurdish_arabic_fallback.sql"),
  "utf8",
);
const readinessRoute = readFileSync(
  join(process.cwd(), "app/api/whatsapp/readiness/route.ts"),
  "utf8",
);
const patientLoop = readFileSync(
  join(process.cwd(), "lib/reminders/patient-loop.ts"),
  "utf8",
);

test("Kurdish patient languages use Iraqi Arabic only at the WhatsApp provider boundary", () => {
  assert.match(migration, /when 'ku' then 'ar'/);
  assert.match(migration, /when 'ckb' then 'ar'/);
  assert.match(migration, /when 'bd' then 'ar'/);
  assert.match(migration, /when 'ar' then 'ar'/);
  assert.match(migration, /when 'en' then 'en_US'/);
});

test("WhatsApp activation requires only provider-supported Atlas variants", () => {
  assert.match(patientLoop, /ATLAS_PATIENT_LOOP_REQUIRED_LANGUAGES = \["ar", "en_US"\]/);
  assert.doesNotMatch(patientLoop, /language: "ckb"/);
  assert.match(readinessRoute, /expectedLanguages: \[\.\.\.ATLAS_PATIENT_LOOP_REQUIRED_LANGUAGES\]/);
  assert.match(readinessRoute, /ATLAS_PATIENT_CONFIRM_TEMPLATE/);
  assert.match(readinessRoute, /ATLAS_PATIENT_DAY_TEMPLATE/);
});

test("Iraqi Arabic provider templates stay Iraqi in wording", () => {
  assert.match(patientLoop, /ويّا د\./);
  assert.match(patientLoop, /راح أجي/);
  assert.match(patientLoop, /ما أگدر أجي/);
  assert.match(patientLoop, /بطريقي/);
});
