import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildPatientCalendar } from "../lib/patient-calendar.ts";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("patient calendar exports only the appointment details needed by a calendar", () => {
  const calendar = buildPatientCalendar({
    clinicName: "Atlas, Clinic",
    doctorName: "Dr. Sara",
    doctorSpecialty: "Orthopedics; Trauma",
    appointmentAt: "2026-10-03T12:00:00+03:00",
    appointmentIntervalMinutes: 20,
    uidSeed: "abcdef123456",
  }, new Date("2026-10-01T09:30:00Z"));

  assert.match(calendar, /DTSTART:20261003T090000Z/);
  assert.match(calendar, /DTSTAMP:20261001T093000Z/);
  assert.match(calendar, /DURATION:PT20M/);
  assert.match(calendar, /SUMMARY:Atlas\\, Clinic — Dr\. Sara/);
  assert.match(calendar, /DESCRIPTION:Dr\. Sara · Orthopedics\\; Trauma/);
  assert.match(calendar, /UID:atlas-abcdef123456@atlasclinic/);
  assert.doesNotMatch(calendar, /https?:\/\/|\/patient\/|phone|token/i);
});

test("patient calendar rejects invalid appointment intervals", () => {
  assert.throws(() => buildPatientCalendar({
    clinicName: "Atlas Clinic",
    doctorName: "Dr. Sara",
    appointmentAt: "2026-10-03T12:00:00+03:00",
    appointmentIntervalMinutes: 0,
    uidSeed: "abcdef123456",
  }), /interval/i);
});

test("patient calendar folds long multilingual content without splitting UTF-8 lines", () => {
  const calendar = buildPatientCalendar({
    clinicName: "کلینیکی تەندروستی و چارەسەری پزیشکی زۆر درێژ بۆ تاقیکردنەوە",
    doctorName: "د. سارا ئەحمەد عەبدولڕەحمان",
    doctorSpecialty: "پسپۆڕی ئێسک و جومگە و تراوما",
    appointmentAt: "2026-10-03T12:00:00+03:00",
    appointmentIntervalMinutes: 15,
    uidSeed: "abcdef123456",
  }, new Date("2026-10-01T09:30:00Z"));

  const encoder = new TextEncoder();
  for (const line of calendar.split("\r\n")) {
    assert.ok(encoder.encode(line).length <= 75, `calendar line exceeded 75 UTF-8 octets: ${line}`);
  }
  assert.match(calendar, /\r\n /);
});

test("calendar download stays behind the existing private patient token boundary", () => {
  const route = source("app/patient/[token]/calendar.ics/route.ts");
  const page = source("app/patient/[token]/page.tsx");
  const migration = source("supabase/migrations/20261003172547_expose_patient_appointment_interval.sql");

  assert.match(route, /isPatientToken\(token\)/);
  assert.match(route, /consume_patient_link_rate_limit/);
  assert.match(route, /get_patient_appointment/);
  assert.match(route, /appointment\.doctor_specialty/);
  assert.match(route, /appointment\.appointment_interval_minutes/);
  assert.match(route, /uidSeed: tokenHash/);
  assert.match(route, /private, no-store, max-age=0/);
  assert.match(route, /text\/calendar; charset=utf-8/);
  assert.doesNotMatch(route, /uidSeed: token[,\n]/);

  assert.match(page, /calendar\.ics/);
  assert.match(page, /Add to calendar/);
  assert.match(page, /زیادی بکە بۆ ڕۆژژمێر/);
  assert.match(page, /أضف إلى التقويم/);

  assert.match(migration, /appointment_interval_minutes integer/);
  assert.match(migration, /doctor_workflow_settings/);
  assert.match(migration, /revoke all on function public\.get_patient_appointment\(text\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.get_patient_appointment\(text\) to service_role/);
});
