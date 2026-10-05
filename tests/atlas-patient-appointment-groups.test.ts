import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/patient-account/page.tsx", import.meta.url), "utf8");

test("My Appointments separates actionable upcoming visits from appointment history", () => {
  assert.match(page, /function isUpcomingAppointment\(appointment: AccountAppointment, nowMs: number\)/);
  assert.match(page, /appointmentMs >= nowMs/);
  assert.match(page, /appointment\.appointment_status === "pending" \|\| appointment\.appointment_status === "confirmed"/);
  assert.match(page, /const upcomingAppointments = appointments\.filter/);
  assert.match(page, /const historyAppointments = appointments\.filter/);
  assert.match(page, /upcomingAppointments\.map/);
  assert.match(page, /historyAppointments\.map/);
});

test("past and cancelled appointments stay visible without looking actionable", () => {
  assert.match(page, /className="patient-account-appointment is-history"/);
  assert.match(page, /button button-ghost patient-account-manage/);
  assert.match(page, /\{t\.view\}/);
  assert.match(page, /history: "Past & cancelled"/);
});

test("patients with history but no upcoming visit get a direct find-care next step", () => {
  assert.match(page, /noUpcoming: "No upcoming appointments\."/);
  assert.match(page, /noUpcomingHelp: "When you book your next appointment with Atlas, it will appear here\."/);
  assert.match(page, /upcomingAppointments\.length \? \(/);
  assert.match(page, /href=\{findCareHref\}>\{t\.findCare\}/);
});

test("appointment grouping stays multilingual and before secondary profile settings", () => {
  assert.match(page, /history: "پێشوو و هەڵوەشاوەکان"/);
  assert.match(page, /history: "یێن بوری و هەلوەشاندی"/);
  assert.match(page, /history: "السابقة والملغاة"/);
  const appointments = page.indexOf('<section className="patient-account-appointments"');
  const profile = page.indexOf('<section className="patient-account-profile"');
  assert.ok(appointments >= 0);
  assert.ok(profile > appointments);
});

test("grouping reuses the existing private account RPC and manage route", () => {
  assert.match(page, /admin\.rpc\("list_patient_account_appointments_service"/);
  assert.match(page, /\/patient-account\/api\/appointments\/\$\{appointment\.appointment_id\}\/manage/);
  assert.doesNotMatch(page, /\.from\("appointments"\)|clinic_members|patient_phone|patient_name/);
});
