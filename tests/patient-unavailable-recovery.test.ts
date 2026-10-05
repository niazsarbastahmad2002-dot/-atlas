import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/patient/[token]/page.tsx", import.meta.url), "utf8");
const unavailable = page.slice(page.indexOf("function Unavailable"));

test("expired or invalid private appointment links offer a safe My Appointments recovery path", () => {
  assert.match(unavailable, /actionLabel=\{text\.myAppointments\}/);
  assert.match(unavailable, /actionHref=\{`\/patient-account\?lang=\$\{locale\}`\}/);
  assert.match(unavailable, /href=\{`\/patient-account\?lang=\$\{locale\}`\}>\{text\.myAppointments\}/);
  assert.match(unavailable, /href=\{`\/api\/ui-language\?locale=\$\{locale\}`\}>\{text\.findCare\}/);
});

test("unavailable-link recovery explains when My Appointments can help in every Patient language", () => {
  assert.match(page, /unavailableHelp: "If you booked through Atlas, try My appointments to open a fresh link\. Otherwise, contact the clinic\."/);
  assert.match(page, /unavailableHelp: "ئەگەر مەوعیدەکەت لە Atlas داناوە، لە «مەوعیدەکانم» دەتوانیت بەستەرێکی نوێ بکەیتەوە\. ئەگەر نا، پەیوەندی بە کلینیکەوە بکە\."/);
  assert.match(page, /unavailableHelp: "ئەگەر وادەیا خۆ ل Atlas دانایە، ژ «وادەیێن من» دشێی لینکەکا نوو ڤەکەی\. ئەگەر نە، پەیوەندی ب کلینیکێ بکە\."/);
  assert.match(page, /unavailableHelp: "إذا حجزت موعدك عبر Atlas، جرّب «مواعيدي» حتى تفتح رابط جديد\. إذا لا، تواصل ويا العيادة\."/);
});

test("recovery does not weaken private appointment authorization", () => {
  assert.match(page, /if \(!isPatientToken\(token\)\) return <Unavailable locale=\{fallbackLocale\} \/>/);
  assert.match(page, /admin\.rpc\(\s*"get_patient_appointment"/);
  assert.match(page, /verifyPatientAccountContinuityMarker\(token, query\.account\)/);
  assert.doesNotMatch(unavailable, /get_patient_appointment|appointments|service_role|\.from\(/);
});
