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

test("responsive dashboard enhancement keeps React-owned summary content server-controlled", () => {
  const experience = source("app/dashboard/responsive-dashboard-experience.tsx");
  assert.match(experience, /syncSummaryLayout/);
  assert.match(experience, /atlas-tablet-six-stats/);
  assert.match(experience, /atlas-phone-six-stats/);
  assert.doesNotMatch(experience, /appointmentStatusCounts/);
  assert.doesNotMatch(experience, /statusFromRow/);
  assert.doesNotMatch(experience, /upsertTabletStat/);
  assert.doesNotMatch(experience, /createElement\("article"\)/);
  assert.match(experience, /min-width: 700px/);
  assert.doesNotMatch(experience, /any-pointer: coarse/);
  assert.match(experience, /params\.get\("after"\)/);
  assert.match(experience, /is-atlas-post-save-focus/);
  assert.match(experience, /scrollIntoView/);
  assert.match(experience, /is-atlas-phone-expanded/);
});

test("six summary labels exist in every Atlas interface language on the server-rendered dashboard", () => {
  const dashboard = source("app/dashboard/page.tsx");
  for (const locale of ["en", "ku", "bd", "ar"]) {
    assert.match(dashboard, new RegExp(`${locale}: \\{[\\s\\S]*all:[\\s\\S]*notConfirmed:[\\s\\S]*confirmed:[\\s\\S]*completed:[\\s\\S]*noShow:[\\s\\S]*cancelled:`));
  }
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
  assert.match(css, /atlas-phone-appointment-search[\s\S]*display: grid !important/);
  assert.match(css, /settings-page \.settings-card-icon[\s\S]*background: transparent !important/);
  assert.match(css, /composer-shortcut[\s\S]*display: none !important/);
  assert.match(phoneCss, /@media \(max-width: 560px\)/);
});

test("iPad summary layout uses available width instead of pointer capability", () => {
  const css = source("app/atlas-ipad-summary-final.css");
  assert.match(css, /@media \(min-width: 700px\)/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(min-width: 1024px\)/);
  assert.match(css, /grid-template-columns: repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(css, /schedule-stat[\s\S]*display: grid !important/);
  assert.match(css, /schedule-stat-total/);
  assert.match(css, /schedule-stat-no-show/);
  assert.match(css, /schedule-stat-cancelled/);
  assert.doesNotMatch(css, /any-pointer/);
});

test("Atlas refreshes valid Supabase sessions when the user reopens the home page", () => {
  const proxy = source("proxy.ts");
  assert.match(proxy, /matcher: \["\/", "\/dashboard\/:path\*", "\/login", "\/auth\/:path\*"\]/);
});

test("final iPad summary stylesheet loads after previous responsive layers", () => {
  const layout = source("app/layout.tsx");
  const phoneFinal = layout.indexOf('import "./atlas-phone-final.css";');
  const responsiveFinal = layout.indexOf('import "./atlas-responsive-final.css";');
  const ipadSummaryFinal = layout.indexOf('import "./atlas-ipad-summary-final.css";');
  assert.ok(phoneFinal >= 0);
  assert.ok(responsiveFinal > phoneFinal);
  assert.ok(ipadSummaryFinal > responsiveFinal);
});


test("dashboard server output includes all six receptionist outcome metrics before client enhancement", () => {
  const dashboard = source("app/dashboard/page.tsx");
  assert.match(dashboard, /const noShow = visibleRows\.filter\(\(row\) => row\.status === "no_show"\)\.length/);
  assert.match(dashboard, /const cancelled = visibleRows\.filter\(\(row\) => row\.status === "cancelled"\)\.length/);
  assert.match(dashboard, /className="stats workspace-stats schedule-summary"/);
  assert.match(dashboard, /tone="no-show"/);
  assert.match(dashboard, /tone="cancelled"/);
  assert.match(dashboard, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
});
