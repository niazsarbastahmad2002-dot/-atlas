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
  assert.match(page, /history: "Past"/);
  assert.match(page, /cancelled: "Cancelled"/);
});

test("patients with history but no upcoming visit get a direct find-care next step", () => {
  assert.match(page, /noUpcoming: "No upcoming appointments\."/);
  assert.match(page, /noUpcomingHelp: "Upcoming appointments linked to your patient account will appear here\."/);
  assert.match(page, /upcomingAppointments\.length \? \(/);
  assert.match(page, /href=\{findCareHref\}>\{t\.findCare\}/);
});

test("appointment grouping stays multilingual and before secondary profile settings", () => {
  assert.match(page, /history: "مەوعیدە پێشووەکان"/);
  assert.match(page, /cancelled: "مەوعیدە هەڵوەشاوەکان"/);
  assert.match(page, /history: "وادەیێن بوری"/);
  assert.match(page, /cancelled: "وادەیێن هەلوەشاندی"/);
  assert.match(page, /history: "المواعيد السابقة"/);
  assert.match(page, /cancelled: "المواعيد الملغاة"/);
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

test("cancelled visits have a distinct section, including future-dated cancellations", () => {
  assert.match(page, /const historyAppointments = appointments\.filter\(\(appointment\) =>\s*appointment\.appointment_status !== "cancelled"/);
  assert.match(page, /const cancelledAppointments = appointments\.filter\(\(appointment\) => appointment\.appointment_status === "cancelled"\)/);
  assert.match(page, /cancelledAppointments\.map/);
  assert.match(page, /aria-label=\{t\.cancelled\}/);
});

test("upcoming visits sort soonest first and other groups sort most recent first", () => {
  assert.match(page, /const upcomingAppointments = appointments\.filter[\s\S]*?\.sort\(\(a, b\) => appointmentSortTime\(a\) - appointmentSortTime\(b\)\)/);
  assert.match(page, /const historyAppointments = appointments\.filter[\s\S]*?\.sort\(\(a, b\) => appointmentSortTime\(b\) - appointmentSortTime\(a\)\)/);
  assert.match(page, /const cancelledAppointments = appointments\.filter[\s\S]*?\.sort\(\(a, b\) => appointmentSortTime\(b\) - appointmentSortTime\(a\)\)/);
  assert.match(page, /timeZone: "Asia\/Baghdad"/);
});

test("all groups preserve doctor, clinic, time, status, secure view and verified account", () => {
  assert.equal(page.split("<bdi>{appointment.doctor_name}</bdi>").length - 1, 3);
  assert.equal(page.split("<bdi>{appointment.clinic_name}</bdi>").length - 1, 3);
  assert.equal(page.split("appointmentDate(appointment.appointment_at, locale)").length - 1, 3);
  assert.equal(page.split("t.statuses[appointment.appointment_status]").length - 1, 3);
  assert.equal(page.split("/patient-account/api/appointments/").length - 1, 3);
  assert.match(page, /resolvePatientAccountSession\(admin, rawSession\)/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
});
