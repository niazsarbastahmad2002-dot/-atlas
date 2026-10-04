import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = source("app/patient/[token]/page.tsx");

test("private appointment management uses the shared Atlas Patient identity", () => {
  assert.match(page, /import \{ AtlasPatientNav \} from "@\/app\/care\/patient-nav"/);
  assert.match(page, /<AtlasPatientNav[\s\S]*locale=\{locale\}[\s\S]*actionLabel=\{patientNavLabel\}[\s\S]*actionHref=\{patientNavHref\}/);
  assert.doesNotMatch(page, /<a className="app-brand" href="\/">/);
});

test("signed account continuity controls My appointments in the shared header", () => {
  assert.match(page, /const patientNavLabel = accountOwned \? text\.myAppointments : text\.findCare/);
  assert.match(page, /const patientNavHref = accountOwned[\s\S]*?\/patient-account\?lang=\$\{locale\}[\s\S]*?\/api\/ui-language\?locale=\$\{locale\}/);
  assert.match(page, /verifyPatientAccountContinuityMarker\(token, query\.account\)/);
});

test("private appointment and unavailable states keep Find care localized", () => {
  assert.match(page, /findCare: "Find care"/);
  assert.match(page, /findCare: "چارەسەر بدۆزەرەوە"/);
  assert.match(page, /findCare: "دکتۆر بدیتەوە"/);
  assert.match(page, /findCare: "ابحث عن رعاية"/);
  assert.match(page, /function Unavailable[\s\S]*AtlasPatientNav[\s\S]*actionLabel=\{text\.findCare\}/);
  assert.match(page, /actionHref=\{`\/api\/ui-language\?locale=\$\{locale\}`\}/);
});

test("shared Patient shell does not alter appointment authorization or actions", () => {
  assert.match(page, /hashPatientToken\(token\)/);
  assert.match(page, /admin\.rpc\("get_patient_appointment"/);
  assert.match(page, /reschedulePatientAppointment\.bind\(null, token, slot\.slot_at\)/);
  assert.match(page, /updatePatientAppointment\.bind\(null, token, "confirmed"\)/);
  assert.match(page, /updateEarlierSlotPreference\.bind\(null, token, !wantsEarlierSlot\)/);
});
