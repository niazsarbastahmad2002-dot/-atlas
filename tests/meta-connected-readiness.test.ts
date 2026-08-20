import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("reminder worker claims clinic IDs and resolves Meta transport per clinic", () => {
  const source = readFileSync("app/api/cron/reminders/route.ts", "utf8");

  assert.match(source, /clinic_id: string/);
  assert.match(source, /claim_due_whatsapp_reminders_v2/);
  assert.match(source, /readClinicMetaWhatsAppConfig\(admin, reminder\.clinic_id\)/);
  assert.match(source, /createWhatsAppReminderTransport\(clinicConfig\.config\)/);
  assert.match(source, /whatsapp_connection_missing/);
  assert.doesNotMatch(source, /import \{ readWhatsAppConfig \} from "@\/lib\/reminders\/whatsapp"/);
});

test("Meta readiness prefers clinic Coexistence connection and keeps legacy sender diagnostic-only", () => {
  const source = readFileSync("app/api/whatsapp/readiness/route.ts", "utf8");

  assert.match(source, /readClinicMetaWhatsAppConfig\(admin, row\.clinic_id\)/);
  assert.match(source, /withExplicitMetaWabaCandidate\(connection\.wabaId\)/);
  assert.match(source, /connectionSource: "coexistence"/);
  assert.match(source, /connectionSource === "coexistence" && audit\.ready/);
  assert.match(source, /legacy environment sender remains diagnostic only/i);
  assert.doesNotMatch(source, /accessToken:\s*audit\.accessToken/);
  assert.doesNotMatch(source, /accessToken:\s*connection\.config\.accessToken[\s\S]*NextResponse\.json/);
});

test("clinic Meta config is loaded only through service-role Vault RPC", () => {
  const source = readFileSync("lib/reminders/meta-clinic-config.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260820182855_claim_whatsapp_reminders_with_clinic.sql", "utf8");

  assert.match(source, /get_meta_whatsapp_delivery_config/);
  assert.match(source, /row\.access_token/);
  assert.match(source, /phoneNumberId: row\.phone_number_id/);
  assert.doesNotMatch(source, /NEXT_PUBLIC.*TOKEN/);

  assert.match(migration, /claim_due_whatsapp_reminders_v2/);
  assert.match(migration, /reminder_id uuid,\s*clinic_id uuid/);
  assert.match(migration, /revoke all on function public\.claim_due_whatsapp_reminders_v2[\s\S]*authenticated/);
  assert.match(migration, /grant execute on function public\.claim_due_whatsapp_reminders_v2[\s\S]*service_role/);
});
