import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");

test("front desk action queue uses only authorized day and doctor rows", () => {
  assert.match(page, /const visibleRows = multiDoctor && selectedDoctor/);
  assert.match(page, /const pendingQueue = visibleRows\.filter\(\(row\) => row\.status === "pending"\)\.slice\(0, 3\)/);
  assert.match(page, /const confirmedQueue = visibleRows\.filter\(\(row\) => row\.status === "confirmed"\)\.slice\(0, 3\)/);
  assert.match(page, /const hasArrivalQueue = pending > 0 \|\| confirmed > 0/);
  assert.match(page, /arrivalLanes\.map\(\(lane\) => <section/);
  assert.match(page, /scheduleHref\(clinic\.id, selectedDay, selectedDoctorId, lane\.status\)/);
  assert.match(page, /#atlas-appointment-\$\{appointment\.id\}/);
  assert.match(page, /id=\{`atlas-appointment-\$\{appointment\.id\}`\}/);
  assert.match(page, /<bdi dir="ltr">\{formatTimeValue/);
  assert.match(page, /data-atlas-user-content="true">\{appointment\.patient_name\}/);
});

test("action lanes distinguish attendance confirmation from physical waiting claims", () => {
  assert.match(page, /needsConfirmation: "Attendance not confirmed"/);
  assert.match(page, /attendanceConfirmed: "Attendance confirmed"/);
  assert.doesNotMatch(page, /waitingPatients|arrivedPatients/);
  for (const language of ["en", "ku", "bd", "ar"]) {
    assert.match(page, new RegExp(`\\b${language}: \\{ title:`));
  }
  assert.match(page, /aria-labelledby="clinic-arrival-heading"/);
  assert.match(page, /aria-label=\{lane\.label\}/);
  assert.match(page, /clinic-arrival-lane a:focus-visible/);
  assert.match(page, /@media\(max-width:700px\)\{\.clinic-arrival-lanes\{grid-template-columns:1fr\}/);
  assert.match(page, /\.appointment-row:target\{/);
});

test("queue surfaces use theme tokens in both light and dark appearance", () => {
  assert.match(page, /\.clinic-arrival-board\{[^\n]*background:linear-gradient\(130deg,var\(--surface-soft\),var\(--surface\)\)/);
  assert.match(page, /\.clinic-arrival-lane\{[^\n]*background:var\(--surface\)/);
  assert.match(page, /\.clinic-arrival-items a\{[^\n]*color:var\(--ink\);background:var\(--surface-soft\)/);
  assert.match(page, /\.clinic-arrival-lane\.is-pending \.clinic-arrival-count\{background:var\(--warning-bg\);color:var\(--warning\)/);
});

test("phone queue links expand appointment actions on direct and in-app hash navigation", () => {
  const mobile = readFileSync(new URL("../app/dashboard/mobile-appointment-experience.tsx", import.meta.url), "utf8");
  assert.match(mobile, /window\.location\.hash\.startsWith\("#atlas-appointment-"\)/);
  assert.match(mobile, /document\.getElementById\(targetId\)/);
  assert.match(mobile, /row\?\.matches\("\.polished-appointment-list \.appointment-row\.is-atlas-phone-managed"\)/);
  assert.match(mobile, /if \(row === lastExpandedHashRow\) return/);
  assert.match(mobile, /if \(!row\.classList\.contains\("is-atlas-phone-expanded"\)\)/);
  assert.match(mobile, /querySelector<HTMLButtonElement>\("\.atlas-phone-appointment-summary"\)\?\.click\(\)/);
  assert.match(mobile, /row\.scrollIntoView\(\{ block: "start" \}\)/);
  assert.match(mobile, /document\.querySelectorAll<HTMLElement>\("\.polished-appointment-list"\)\.forEach\(prepareList\);\s*expandHashTarget\(\)/);
  assert.match(mobile, /window\.addEventListener\("hashchange", schedulePrepare\)/);
  assert.match(mobile, /window\.removeEventListener\("hashchange", schedulePrepare\)/);
});

test("today's front desk queue offers direct attendance actions using the current appointment revision", () => {
  const quick = readFileSync(new URL("../app/dashboard/clinic-arrival-quick-action.tsx", import.meta.url), "utf8");
  assert.match(page, /selectedDay === today \? <ClinicArrivalQuickAction/);
  assert.match(page, /clinicId=\{clinic\.id\}/);
  assert.match(page, /appointmentId=\{appointment\.id\}/);
  assert.match(page, /patientName=\{appointment\.patient_name\}/);
  assert.match(page, /revision=\{appointment\.appointment_revision\}/);
  assert.match(page, /status=\{lane\.status\}/);
  assert.match(page, /appointmentAt=\{appointment\.appointment_at\}/);
  assert.match(quick, /status === "pending" \? "confirmed" : "completed"/);
  assert.match(quick, /updateAppointmentStatusInline\([\s\S]*clinicId, appointmentId, status, revision, nextStatus/);
  assert.match(quick, /result\.reason === "stale"/);
  assert.match(quick, /router\.refresh\(\)/);
});

test("completion is disabled until appointment time while status updates are pending", () => {
  const quick = readFileSync(new URL("../app/dashboard/clinic-arrival-quick-action.tsx", import.meta.url), "utf8");
  assert.match(quick, /appointmentTime <= now \+ 5 \* 60_000/);
  assert.match(quick, /status === "confirmed" && !completionReady/);
  assert.match(quick, /aria-describedby=\{tooEarly \? "clinic-quick-hint-" \+ appointmentId : undefined\}/);
  assert.match(quick, /className="clinic-arrival-quick-hint"/);
  assert.match(quick, /disabled=\{pending \|\| done \|\| tooEarly\}/);
  assert.match(quick, /requestInFlight\.current/);
  assert.match(quick, /aria-label=\{actionLabel \+ ": " \+ patientName\}/);
  assert.match(quick, /window\.setInterval\(updateClock, 30_000\)/);
  assert.match(quick, /window\.clearInterval\(interval\)/);
});

test("arrival quick actions have localized labels and remain touch-friendly", () => {
  const quick = readFileSync(new URL("../app/dashboard/clinic-arrival-quick-action.tsx", import.meta.url), "utf8");
  for (const locale of ["en", "ku", "bd", "ar"]) {
    assert.match(quick, new RegExp('\\b' + locale + ': \\{'));
  }
  assert.match(quick, /Confirm attendance/);
  assert.match(quick, /هاتن پشتڕاست بکەرەوە/);
  assert.match(quick, /تأكيد الحضور/);
  assert.match(page, /\.clinic-arrival-quick-button\{[^\n]*min-height:46px/);
  assert.match(page, /\.clinic-arrival-quick-button:focus-visible/);
  assert.match(page, /\.clinic-arrival-quick\{[^\n]*max-width:210px/);
  assert.match(page, /\.clinic-arrival-items li\{[^\n]*grid-template-columns:minmax\(0,1fr\) auto/);
});
