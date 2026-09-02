import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { appointmentDestination } from "../lib/dashboard-booking-navigation.ts";
import { localizedDashboardMessage } from "../lib/dashboard-message-copy.ts";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("saved appointments carry a deterministic local time focus target", () => {
  const url = new URL(appointmentDestination({
    clinicId: "11111111-1111-4111-8111-111111111111",
    doctorId: "22222222-2222-4222-8222-222222222222",
    appointmentAt: new Date("2026-09-03T13:30:00+03:00"),
  }), "https://atlas.local");

  assert.equal(url.searchParams.get("notice"), "appointment_created");
  assert.equal(url.searchParams.get("day"), "2026-09-03");
  assert.equal(url.searchParams.get("after"), "2026-09-03T13:30");
});

test("dashboard success and error messages localize with the selected Atlas language", () => {
  assert.equal(localizedDashboardMessage("appointment_created", "en"), "Appointment saved.");
  assert.equal(localizedDashboardMessage("appointment_created", "ku"), "وادەکە پاشەکەوت کرا.");
  assert.equal(localizedDashboardMessage("appointment_created", "bd"), "وادە هاتە پاراستن.");
  assert.equal(localizedDashboardMessage("appointment_created", "ar"), "تم حفظ الموعد.");
  assert.match(localizedDashboardMessage("appointment_create_failed", "ku") ?? "", /وادەکە/);
});

test("responsive dashboard enhancement fills iPad stats and focuses the appointment just saved", () => {
  const experience = source("app/dashboard/responsive-dashboard-experience.tsx");
  assert.match(experience, /atlas-tablet-six-stats/);
  assert.match(experience, /appointmentStatusCount\("no_show"\)/);
  assert.match(experience, /appointmentStatusCount\("cancelled"\)/);
  assert.match(experience, /searchParams\.get\("after"\)/);
  assert.match(experience, /is-atlas-post-save-focus/);
  assert.match(experience, /scrollIntoView/);
  assert.match(experience, /is-atlas-phone-expanded/);
});

test("same-document bottom navigation explicitly scrolls instead of depending on repeated Next navigation", () => {
  const experience = source("app/dashboard/responsive-dashboard-experience.tsx");
  assert.match(experience, /handleSameDocumentBottomNavigation/);
  assert.match(experience, /app-bottom-add/);
  assert.match(experience, /window\.scrollTo\(\{ top: 0, behavior: "smooth" \}\)/);
  assert.match(experience, /event\.stopImmediatePropagation\(\)/);
});

test("touch iPads receive search and standalone icons while compact appointment disclosure stays phone-owned", () => {
  const css = source("app/atlas-responsive-final.css");
  const phoneCss = source("app/atlas-phone.css");
  assert.match(css, /max-width: 1400px/);
  assert.match(css, /any-pointer: coarse/);
  assert.match(css, /atlas-phone-appointment-search[\s\S]*display: grid !important/);
  assert.match(css, /settings-page \.settings-card-icon[\s\S]*background: transparent !important/);
  assert.match(css, /composer-shortcut[\s\S]*display: none !important/);
  assert.match(css, /grid-template-columns: repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(phoneCss, /@media \(max-width: 560px\)/);
});

test("Atlas refreshes valid Supabase sessions when the user reopens the home page", () => {
  const proxy = source("proxy.ts");
  assert.match(proxy, /matcher: \["\/", "\/dashboard\/:path\*", "\/login", "\/auth\/:path\*"\]/);
});

test("final responsive stylesheet loads after previous phone layers", () => {
  const layout = source("app/layout.tsx");
  const phoneFinal = layout.indexOf('import "./atlas-phone-final.css";');
  const responsiveFinal = layout.indexOf('import "./atlas-responsive-final.css";');
  assert.ok(phoneFinal >= 0);
  assert.ok(responsiveFinal > phoneFinal);
});
