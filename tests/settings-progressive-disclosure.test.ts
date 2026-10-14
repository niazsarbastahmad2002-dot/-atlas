import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settings = readFileSync(new URL("../app/dashboard/settings/page.tsx", import.meta.url), "utf8");

test("doctor management is compact for larger clinics without hiding Add doctor", () => {
  const addDoctor = settings.indexOf('action={createDoctor}');
  const roster = settings.indexOf('className="settings-disclosure settings-doctor-management"');
  assert.ok(addDoctor >= 0 && roster > addDoctor);
  assert.match(settings, /activeDoctors\.length > 0 \? \(/);
  assert.match(settings, /open=\{activeDoctors\.length <= 2\}/);
  assert.match(settings, /key=\{clinic\.id\} className="settings-disclosure settings-doctor-management"/);
  assert.match(settings, /<summary>\{copy\.manageDoctors\} \(\{localizeDigits\(activeDoctors\.length, locale\)\}\)<\/summary>/);
  assert.match(settings, /\{activeDoctors\.map\(\(doctor, index\) => \(/);
  assert.match(settings, /\{archivedDoctors\.length \? \(/);
});

test("rarely used owner operations remain inside owner-only administration", () => {
  const adminStart = settings.indexOf('{isOwner ? (');
  const adminEnd = settings.indexOf('        ) : null}\\n\\n        <section className="settings-card">', adminStart);
  assert.ok(adminStart >= 0 && adminEnd > adminStart);
  const section = settings.slice(adminStart, adminEnd);
  assert.match(section, /href=\{\`\/dashboard\/staff\?clinic=\$\{clinic\.id\}\`\}/);
  assert.match(section, /href=\{\`\/dashboard\/history\?clinic=\$\{clinic\.id\}\`\}/);
  const advanced = section.indexOf('className="settings-disclosure settings-admin-tools"');
  assert.ok(advanced > 0);
  assert.match(section.slice(advanced), /<summary>\{copy\.moreAdminTools\}<\/summary>/);
  assert.match(section.slice(advanced), /action="\/api\/clinic-export"/);
  assert.match(section.slice(advanced), /href=\{\`\/dashboard\/settings\/delete\?clinic=\$\{clinic\.id\}\`\}/);
});

test("all four interface languages explain the doctor and owner disclosures", () => {
  assert.match(settings, /manageDoctors: "Manage existing doctors"/);
  assert.match(settings, /moreAdminTools: "Reports, backup & clinic deletion"/);
  assert.match(settings, /manageDoctors: "بەڕێوەبردنی پزیشکەکانی ئێستا"/);
  assert.match(settings, /moreAdminTools: "ڕاپۆرت، پاڵپشتی و سڕینەوەی کلینیک"/);
  assert.match(settings, /manageDoctors: "بەڕێڤەبرنا دکتۆرێن هەیی"/);
  assert.match(settings, /moreAdminTools: "ڕاپۆرت، پشتگیری و ژێبرنا کلینیکێ"/);
  assert.match(settings, /manageDoctors: "إدارة الأطباء الحاليين"/);
  assert.match(settings, /moreAdminTools: "التقارير والنسخ الاحتياطي وحذف العيادة"/);
  assert.match(settings, /settings-doctor-management>summary,.settings-admin-tools>summary\{min-height:44px\}/);
});
