import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("signed-in interface language changes save immediately and reload the workspace", () => {
  const settings = read("app/dashboard/settings/page.tsx");
  const control = read("app/dashboard/settings/interface-language-control.tsx");

  assert.match(settings, /<InterfaceLanguageControl/);
  assert.match(control, /onChange=\{\(event\) => \{/);
  assert.match(control, /void applyLanguage\(nextLocale\)/);
  assert.match(control, /fetch\("\/api\/ui-language"/);
  assert.match(control, /credentials: "same-origin"/);
  assert.match(control, /cache: "no-store"/);
  assert.match(control, /window\.location\.reload\(\)/);
});

test("interface language endpoint keeps the preference in a secure site-wide cookie", () => {
  const route = read("app/api/ui-language/route.ts");

  assert.match(route, /response\.cookies\.set\(uiLocaleCookie, locale/);
  assert.match(route, /path: "\/"/);
  assert.match(route, /sameSite: "lax"/);
  assert.match(route, /httpOnly: true/);
});


test("settings load failures stay in the selected Atlas language", () => {
  const settings = read("app/dashboard/settings/page.tsx");

  assert.match(settings, /loadFailed: string/);
  assert.match(settings, /The clinic settings could not load\. Go back to the schedule and try again\./);
  assert.match(settings, /ڕێکخستنەکانی کلینیک بار نەبوون/);
  assert.match(settings, /ڕێکخستنێن کلینیکێ بار نەبوون/);
  assert.match(settings, /تعذر تحميل إعدادات العيادة/);
  assert.match(settings, /error=\{copy\.loadFailed\}/);
  assert.match(settings, /role="alert">\{error\}<\/p>/);
});


test("dashboard clinic load failures stay in the selected Atlas language", () => {
  const dashboard = read("app/dashboard/page.tsx");

  assert.match(dashboard, /dashboardErrorCopy: Record<UiLocale/);
  assert.match(dashboard, /Atlas could not load this clinic\./);
  assert.match(dashboard, /Atlas نەیتوانی ئەم کلینیکە بار بکات\./);
  assert.match(dashboard, /Atlas نەشیا ڤێ کلینیکێ بار بکەت\./);
  assert.match(dashboard, /تعذر على Atlas تحميل هذه العيادة\./);
  assert.match(dashboard, /<DashboardError locale=\{locale\} \/>/);
  assert.match(dashboard, /function DashboardError\(\{ locale \}: \{ locale: UiLocale \}\)/);
});

test("settings action results stay in the selected Atlas language", () => {
  const settings = read("app/dashboard/settings/page.tsx");

  assert.match(settings, /settingsResultCopy: Record<UiLocale/);
  assert.match(settings, /manager_required: "بۆ گۆڕینی ئەم ڕێکخستنە/);
  assert.match(settings, /doctor_archived: "دکتۆر ژ وادەیێن نوو هاتە لابرن/);
  assert.match(settings, /save_failed: "تعذر حفظ هذا الإعداد/);
  assert.match(settings, /language_saved: "تم تحديث لغة الواجهة/);
  for (const code of ["manager_required", "language_invalid", "clinic_invalid", "doctor_invalid", "save_failed", "interval_invalid", "reminders_invalid", "approval_required"]) {
    assert.match(settings, new RegExp(`${code}:`));
  }
  assert.match(settings, /approval_required: "پێش چالاککردنی بیرخستنەوەکان/);
  assert.match(settings, /reminders_invalid: "راجع توقيت التذكير ولغته/);
  assert.match(settings, /const resultCopy = settingsResultCopy\[locale\]/);
  assert.match(settings, /resultCopy\.errors\[params\.error\]/);
  assert.match(settings, /resultCopy\.notices\[params\.notice\]/);
});

