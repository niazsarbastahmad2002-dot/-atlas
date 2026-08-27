import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Atlas Online uses one native status selector instead of a row of transition buttons", () => {
  const actions = source("app/dashboard/appointment-actions.tsx");
  assert.match(actions, /<select[\s\S]*appointment-status-select/);
  assert.match(actions, /allowedAppointmentTransitions\(optimisticStatus\)/);
  assert.match(actions, /onChange=\{\(event\) => changeStatus/);
  assert.doesNotMatch(actions, /transitions\.map\(\(nextStatus\) => \(\s*<button/);
});

test("online status choices use explicit receptionist language in every Atlas locale", () => {
  const actions = source("app/dashboard/appointment-actions.tsx");
  for (const phrase of [
    "Attendance not confirmed",
    "Attendance confirmed",
    "Visit completed",
    "Did not attend",
    "هێشتا هاتن پشتڕاست نەکراوە",
    "هاتن پشتڕاستکراوە",
    "سەردان تەواوبوو",
    "بۆ مەوعید نەهات",
    "هێشتا هاتن نەهاتیە پشتڕاستکرن",
    "هاتن پشتڕاستکریە",
    "الحضور غير مؤكد بعد",
    "الحضور مؤكد",
  ]) assert.match(actions, new RegExp(phrase));
});

test("online appointment cards remove redundant status and reminder-language clutter", () => {
  const actions = source("app/dashboard/appointment-actions.tsx");
  assert.match(actions, /appointment-badges > \.status:not\(\.status-reminder\) \{ display: none; \}/);
  assert.match(actions, /appointment-details > div:nth-child\(3\) \{ display: none; \}/);
  assert.match(actions, /grid-template-columns: minmax\(120px, \.8fr\) minmax\(180px, 1\.25fr\)/);
});

test("online status selector has state colors and responsive phone/tablet layouts", () => {
  const actions = source("app/dashboard/appointment-actions.tsx");
  for (const state of ["pending", "confirmed", "completed", "no_show", "cancelled"]) {
    assert.match(actions, new RegExp(`appointment-status-select\\.is-${state}`));
  }
  assert.match(actions, /@media \(max-width: 720px\)/);
  assert.match(actions, /@media \(max-width: 520px\)/);
});

test("destructive removal sits behind a visible More menu that opens inside the card", () => {
  const actions = source("app/dashboard/appointment-actions.tsx");
  assert.match(actions, /<details className="appointment-more-menu">/);
  assert.match(actions, /<summary[^>]*>\{workflow\.more\}<\/summary>/);
  assert.match(actions, /bottom: calc\(100% \+ 6px\)/);
  assert.doesNotMatch(actions, /top: calc\(100% \+ 6px\)/);
  assert.match(actions, /archiveAppointmentInline/);
});

test("patient sharing remains available but the everyday row uses a short label", () => {
  const share = source("app/dashboard/patient-link-button.tsx");
  assert.match(share, /shareShort: "Share"/);
  assert.match(share, /shareShort: "ناردن"/);
  assert.match(share, /shareShort: "هنارتن"/);
  assert.match(share, /shareShort: "مشاركة"/);
  assert.match(share, /Send on WhatsApp/);
  assert.match(share, /createPatientAccessLink/);
});

test("online-only Atlas value stays intact while the appointment surface gets simpler", () => {
  const page = source("app/dashboard/page.tsx");
  const actions = source("app/dashboard/appointment-actions.tsx");
  assert.match(page, /LiveClinicClock/);
  assert.match(page, /reminderSettings/);
  assert.match(page, /status-reminder/);
  assert.match(page, /AppointmentEditor/);
  assert.match(actions, /PatientLinkButton/);
  assert.match(actions, /updateAppointmentStatusInline/);
  assert.doesNotMatch(actions, /supabase|service_role|graph\.facebook/i);
});
