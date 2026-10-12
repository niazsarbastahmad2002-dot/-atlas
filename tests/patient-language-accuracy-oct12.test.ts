import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const discovery = read("app/care/page.tsx");
const doctor = read("app/care/[clinicSlug]/[doctorSlug]/page.tsx");
const times = read("app/care/[clinicSlug]/[doctorSlug]/times/page.tsx");
const account = read("app/patient-account/page.tsx");
const appointment = read("app/patient/[token]/page.tsx");

test("Patient discovery has meaningful Sorani and Arabic no-results copy", () => {
  assert.match(discovery, /noResults: "هیچ پزیشکێکی بڵاوکراوە بە گەڕانەکەت نەدۆزرایەوە\."/);
  assert.match(discovery, /noResults: "لم نجد أطباء منشورين يطابقون بحثك\."/);
  assert.match(discovery, /const hasActiveFilters = hasSearch \|\| sort === "soonest"/);
  assert.match(discovery, /hasActiveFilters \? <Link className="atlas-care-clear-filters"/);
});

test("Patient profiles and time views use clear, honest read-only booking text", () => {
  assert.match(doctor, /noPreviewTimes: "لا توجد أوقات متاحة خلال الأيام السبعة القادمة\."/);
  assert.match(times, /الحجز عبر Atlas غير متاح حاليًا/);
  assert.match(times, /دانانی مەوعید لە Atlas هێشتا چالاک نییە/);
  assert.match(times, /readOnlyIntro/);
  assert.doesNotMatch(times, /تواصل ويا العيادة حتى تحجز/);
});

test("Private appointments explain the no-show status without treating it as a completed visit", () => {
  assert.match(account, /no_show: "Marked as missed"/);
  assert.match(account, /no_show: "بە نەهاتن تۆمارکراوە"/);
  assert.match(account, /no_show: "وەک نەهاتن هاتییە تۆمارکرن"/);
  assert.match(account, /no_show: "مسجّل كعدم حضور"/);
  assert.match(appointment, /noShow: "This appointment was marked as missed\."/);
  assert.match(appointment, /noShow: "سُجّل عدم حضورك لهذا الموعد\."/);
  assert.match(account, /admin\.rpc\("list_patient_account_appointments_service"/);
  assert.match(appointment, /isPatientToken\(token\)/);
});

test("Empty-account language never implies public booking is switched on", () => {
  assert.match(account, /noUpcomingHelp: "Upcoming appointments linked to your patient account will appear here\."/);
  assert.match(account, /noUpcomingHelp: "ستظهر هنا المواعيد القادمة المرتبطة بحسابك\."/);
  assert.doesNotMatch(account, /When you book your next appointment with Atlas|لما تحجز موعدك الجاي عبر Atlas/);
  assert.match(account, /robots: \{ index: false, follow: false \}/);
});
