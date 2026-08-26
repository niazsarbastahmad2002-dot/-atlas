import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildClinicArchive,
  clinicAppointmentsCsvFilename,
  clinicArchiveFilename,
  clinicReadableReportFilename,
  CLINIC_EXPORT_MAX_BYTES,
  serializeClinicAppointmentsCsv,
  serializeClinicArchive,
  serializeClinicReadableHtml,
} from "../lib/clinic-export.ts";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function sampleArchive(patientName = "Test Patient") {
  return buildClinicArchive({
    generatedAt: "2026-08-26T08:00:00.000Z",
    clinic: {
      name: "Atlas Test Clinic",
      createdAt: "2026-08-01T00:00:00.000Z",
      appointmentIntervalMinutes: 15,
    },
    doctors: [{
      name: "Dr Test",
      active: true,
      displayOrder: 0,
      specialty: "Cardiology",
      receptionistPhone: "+9647500000000",
    }],
    clinicReminderSettings: {
      enabled: true,
      leadMinutes: 1440,
      secondLeadMinutes: 120,
      dailyMessageLimit: 100,
      defaultReminderLanguage: "ku",
    },
    doctorWorkflowSettings: [{
      doctorName: "Dr Test",
      appointmentIntervalMinutes: 15,
      remindersEnabled: true,
      reminderLeadMinutes: 1440,
      reminderSecondLeadMinutes: 120,
      defaultReminderLanguage: "ku",
      updatedAt: "2026-08-25T10:00:00.000Z",
    }],
    appointments: [{
      patientName,
      patientPhone: "+9647501111111",
      contactRelationship: "patient",
      doctorName: "Dr Test",
      appointmentAt: "2026-08-27T09:00:00.000Z",
      status: "confirmed",
      reminderStatus: "pending",
      reminderConsent: true,
      reminderConsentAt: "2026-08-26T08:00:00.000Z",
      reminderLanguage: "ku",
      arrivalSignal: null,
      arrivalSignalAt: null,
      voidedAt: null,
      voidReason: null,
      createdAt: "2026-08-26T08:00:00.000Z",
      updatedAt: "2026-08-26T08:00:00.000Z",
    }],
    smartFillWaitlist: [{
      patientName: "Waitlist Patient",
      patientPhone: "+9647502222222",
      doctorName: "Dr Test",
      reminderLanguage: "ku",
      latestAcceptableAt: "2026-08-27T12:00:00.000Z",
      contactConsentAt: "2026-08-26T08:00:00.000Z",
      status: "waiting",
      createdAt: "2026-08-26T08:00:00.000Z",
      updatedAt: "2026-08-26T08:00:00.000Z",
    }],
    activityHistory: [{
      actorType: "staff",
      action: "created",
      fromStatus: null,
      toStatus: "pending",
      reason: null,
      occurredAt: "2026-08-26T08:00:00.000Z",
      entityType: "appointment",
    }],
  });
}

test("clinic archive keeps useful operational data while excluding internal identifiers and secrets", () => {
  const archive = sampleArchive();
  const serialized = serializeClinicArchive(archive);
  assert.equal(archive.schema, "atlas_clinic_archive_v1");
  assert.match(serialized.text, /Test Patient/);
  assert.match(serialized.text, /\+9647501111111/);
  assert.match(serialized.text, /Cardiology/);
  assert.ok(serialized.byteCount < CLINIC_EXPORT_MAX_BYTES);
  assert.equal(serialized.recordCount, 5);

  for (const forbidden of [
    "clinic_id",
    "owner_id",
    "user_id",
    "doctor_id",
    "appointment_id",
    "idempotency_key",
    "actor_id",
    "entity_id",
    "provider_message_id",
    "template_name",
    "meta_template",
    "access_token",
    "token_hash",
  ]) {
    assert.equal(serialized.text.includes(forbidden), false, `${forbidden} must not be exported`);
  }
});

test("readable clinic report escapes patient-controlled HTML and remains printable without scripts", () => {
  const report = serializeClinicReadableHtml(sampleArchive('<script>alert("x")</script>'));

  assert.match(report.text, /Atlas Test Clinic/);
  assert.match(report.text, /Appointments/);
  assert.match(report.text, /@media print/);
  assert.match(report.text, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.equal(report.text.includes('<script>alert("x")</script>'), false);
  assert.equal(/<script[\s>]/i.test(report.text), false);
  assert.ok(report.byteCount < CLINIC_EXPORT_MAX_BYTES);
});

test("appointments CSV is spreadsheet-friendly and protects formula-like cells", () => {
  const csv = serializeClinicAppointmentsCsv(sampleArchive("=HYPERLINK(\"https://evil.example\")"));

  assert.ok(csv.text.startsWith("\uFEFF"));
  assert.match(csv.text, /Patient name/);
  assert.match(csv.text, /Appointment time \(Iraq\)/);
  assert.match(csv.text, /'=HYPERLINK/);
  assert.match(csv.text, /'\+9647501111111/);
  assert.equal(csv.recordCount, 1);
});

test("clinic export filenames cannot inject paths or response-header characters", () => {
  const clinic = ' ../../Clinic "One"\r\nInjected: yes ';
  const generated = "2026-08-26T08:00:00.000Z";
  assert.equal(clinicArchiveFilename(clinic, generated), "atlas-Clinic-One-Injected-yes-2026-08-26.json");
  assert.equal(clinicAppointmentsCsvFilename(clinic, generated), "atlas-Clinic-One-Injected-yes-appointments-2026-08-26.csv");
  assert.equal(clinicReadableReportFilename(clinic, generated), "atlas-Clinic-One-Injected-yes-readable-2026-08-26.html");
});

test("clinic export route is owner-only, same-origin, tenant-scoped, audited, and does not use admin credentials", async () => {
  const route = await read("app/api/clinic-export/route.ts");

  assert.match(route, /clinic\.owner_id !== userData\.user\.id/);
  assert.match(route, /cross_origin_request_blocked/);
  assert.match(route, /p_format: format/);
  assert.match(route, /reserve_clinic_export/);
  assert.match(route, /complete_clinic_export/);
  assert.match(route, /fail_clinic_export/);
  assert.ok((route.match(/\.eq\("clinic_id", clinic\.id\)/g) ?? []).length >= 5);
  assert.match(route, /CLINIC_EXPORT_MAX_APPOINTMENTS/);
  assert.match(route, /CLINIC_EXPORT_MAX_BYTES/);
  assert.match(route, /serializeClinicAppointmentsCsv/);
  assert.match(route, /serializeClinicReadableHtml/);
  assert.match(route, /Cache-Control": "no-store, private"/);
  assert.match(route, /X-Content-Type-Options": "nosniff"/);
  assert.match(route, /Content-Security-Policy/);
  assert.equal(route.includes("createAdminClient"), false);
  assert.equal(route.includes("service_role"), false);
  assert.equal(route.includes("appointment_reminders"), false);
  assert.equal(route.includes("provider_message_id"), false);
  assert.equal(route.includes("idempotency_key"), false);
  assert.equal(route.includes('from("clinic_members")'), false);
});

test("clinic export choices are only surfaced inside the owner-only administration block", async () => {
  const settings = await read("app/dashboard/settings/page.tsx");
  const ownerBlock = settings.match(/\{isOwner \? \([\s\S]*?\) : null\}/)?.[0] ?? "";

  assert.ok((ownerBlock.match(/action="\/api\/clinic-export"/g) ?? []).length >= 3);
  assert.match(ownerBlock, /name="format" value="html"/);
  assert.match(ownerBlock, /name="format" value="csv"/);
  assert.match(ownerBlock, /name="format" value="json"/);
  assert.match(ownerBlock, /copy\.exportReadable/);
  assert.match(ownerBlock, /copy\.exportCsv/);
  assert.match(ownerBlock, /copy\.exportJson/);
  assert.match(settings, /save as PDF/);
  assert.match(settings, /Excel, Numbers/);
});

test("clinic export audit is patient-data-free and inaccessible as a direct client table", async () => {
  const migration = await read("supabase/migrations/20260826104500_secure_clinic_export_audit.sql");
  const formatMigration = await read("supabase/migrations/20260826130000_expand_clinic_export_formats.sql");

  assert.match(migration, /alter table public\.clinic_export_audit enable row level security/);
  assert.match(migration, /revoke all on table public\.clinic_export_audit from anon, authenticated/);
  assert.match(migration, /security definer/);
  assert.match(migration, /c\.owner_id = v_user_id/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, />= 3 then/);
  assert.match(migration, /requested_at >= now\(\) - interval '1 hour'/);
  assert.match(migration, /grant execute on function public\.reserve_clinic_export\(uuid\) to authenticated/);

  assert.match(formatMigration, /format in \('json', 'csv', 'html'\)/);
  assert.match(formatMigration, /reserve_clinic_export\(uuid, text\)/);
  assert.match(formatMigration, /v_format not in \('json', 'csv', 'html'\)/);
  assert.match(formatMigration, /c\.owner_id = v_user_id/);
  assert.match(formatMigration, /pg_advisory_xact_lock/);
  assert.match(formatMigration, />= 3 then/);

  for (const source of [migration, formatMigration]) {
    for (const forbidden of ["patient_name", "patient_phone", "provider_message_id", "archive_contents", "access_token", "token_hash"]) {
      assert.equal(source.includes(forbidden), false, `${forbidden} must not be stored in export audit`);
    }
  }
});
