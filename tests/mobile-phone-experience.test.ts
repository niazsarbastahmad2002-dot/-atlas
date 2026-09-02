import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("phone appointments use compact searchable disclosure rows without replacing desktop cards", () => {
  const enhancer = source("app/dashboard/mobile-appointment-experience.tsx");
  const css = source("app/atlas-phone.css");
  const layout = source("app/dashboard/layout.tsx");

  assert.match(layout, /MobileAppointmentExperience locale=\{locale\}/);
  assert.match(enhancer, /atlas-phone-appointment-search/);
  assert.match(enhancer, /Patient name or phone number/);
  assert.match(enhancer, /patient-cell strong/);
  assert.match(enhancer, /patient-cell span/);
  assert.match(enhancer, /atlas-phone-appointment-summary/);
  assert.match(enhancer, /is-atlas-phone-expanded/);
  assert.match(enhancer, /appointment-status-select/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /grid-template-columns: minmax\(52px, auto\) minmax\(0,1fr\) minmax\(0,auto\) 18px/);
  assert.match(css, /polished-appointment\.is-atlas-phone-managed:not\(\.is-atlas-phone-expanded\) > :not\(\.atlas-phone-appointment-summary\)/);
});

test("phone collapsing is explicitly scoped to dashboard-managed appointments", () => {
  const enhancer = source("app/dashboard/mobile-appointment-experience.tsx");
  const css = source("app/atlas-phone.css");
  assert.match(enhancer, /row\.classList\.add\("is-atlas-phone-managed"\)/);
  assert.match(css, /appointments-panel \.polished-appointment\.is-atlas-phone-managed/);
  assert.doesNotMatch(css, /\n  \.polished-appointment:not\(\.is-atlas-phone-expanded\)/);
});

test("phone appointment search and disclosure copy exists for all Atlas locales", () => {
  const enhancer = source("app/dashboard/mobile-appointment-experience.tsx");
  for (const phrase of [
    "Search appointments",
    "Patient name or phone number",
    "گەڕان لە وادەکان",
    "ناوی نەخۆش یان ژمارەی مۆبایل",
    "لێگەڕین ل وادەیان",
    "ناڤێ نەخۆشی یان ژمارا موبایلێ",
    "بحث بالمواعيد",
    "اسم المريض أو رقم الهاتف",
  ]) assert.match(enhancer, new RegExp(phrase));
});

test("phone search separates patient names from phone numbers and avoids one-digit false focus", () => {
  const enhancer = source("app/dashboard/mobile-appointment-experience.tsx");
  assert.match(enhancer, /function normalizeName/);
  assert.match(enhancer, /function normalizePhone/);
  assert.match(enhancer, /dataset\.atlasPhoneName/);
  assert.match(enhancer, /dataset\.atlasPhonePhone/);
  assert.match(enhancer, /phoneDigits\.length < 3/);
  assert.match(enhancer, /nameTokens\.every/);
  assert.match(enhancer, /is-atlas-phone-search-match/);
  assert.match(enhancer, /is-atlas-phone-search-focus/);
  assert.match(enhancer, /matches\.length === 1/);
  assert.match(enhancer, /atlas-phone-search-clear/);
  assert.match(enhancer, /atlas-phone-search-meta/);
});

test("phone search always filters the current appointment list after navigation or refresh", () => {
  const enhancer = source("app/dashboard/mobile-appointment-experience.tsx");
  assert.match(enhancer, /const currentList = \(\) => panel\.querySelector<HTMLElement>\("\.polished-appointment-list"\)/);
  assert.match(enhancer, /const activeList = currentList\(\)/);
  assert.match(enhancer, /if \(activeList\) applyFilter\(activeList\)/);
});

test("saved appointment time advances from the just-booked slot using the active interval", () => {
  const field = source("app/dashboard/appointment-time-field-v2.tsx");
  assert.match(field, /const \[savedAdvance, setSavedAdvance\] = useState\(false\)/);
  assert.match(field, /if \(!doctorId \|\| !occupied\.has\(value\)\) return/);
  assert.match(field, /let candidate = addLocalMinutes\(value, interval\)/);
  assert.match(field, /!occupied\.has\(candidate\)/);
  assert.match(field, /setSavedAdvance\(true\)/);
  assert.match(field, /custom \|\| touched \|\| savedAdvance \|\| !nextDefault/);
});

test("phone theme layer removes bright selected controls and preserves status meaning in dark mode", () => {
  const css = source("app/atlas-phone.css");
  assert.match(css, /atlas-ai-launcher > a[\s\S]*background: var\(--surface\) !important/);
  assert.match(css, /atlas-period-tabs button\.is-selected/);
  assert.match(css, /background: var\(--accent-soft\) !important/);
  assert.doesNotMatch(css, /color-mix\(/);
  for (const status of ["pending", "confirmed", "completed", "no_show", "cancelled"]) {
    assert.match(css, new RegExp(`appointment-status-select\\.is-${status}`));
    assert.match(css, new RegExp(`atlas-phone-appointment-status\\.is-${status}`));
  }
});

test("phone settings icons drop decorative tiles while keeping the icon visually prominent", () => {
  const css = source("app/atlas-phone.css");
  assert.match(css, /\.settings-card-icon \{/);
  assert.match(css, /background: transparent !important/);
  assert.match(css, /border: 0 !important/);
  assert.match(css, /font-size: 22px !important/);
});
