import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { complaints, findComplaint, searchComplaints, specialtyLabels } from "../lib/patient/complaint-guide.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const locales = ["en", "ku", "bd", "ar"] as const;
const context = read("app/care/complaints/flow-context.tsx");
const screen = read("app/care/complaints/complaint-screen.tsx");
const copy = read("app/care/complaints/complaint-copy.ts");
const style = read("app/care/complaints/complaint-screen.css");
const welcome = read("app/page.tsx");
const discovery = read("app/care/page.tsx");
const review = read("docs/patient/complaint-discovery-review.md");

test("minimum ten understandable complaints have localized questions and bounded specialty keys", () => {
  assert.ok(complaints.length >= 10);
  assert.equal(new Set(complaints.map((complaint) => complaint.id)).size, complaints.length);
  for (const complaint of complaints) {
    assert.match(complaint.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(complaint.specialties.length >= 1 && complaint.specialties.length <= 2);
    for (const key of complaint.specialties) {
      assert.ok(specialtyLabels[key], `Unknown specialty: ${key}`);
    }
    for (const locale of locales) {
      assert.ok(complaint.name[locale].trim().length > 3);
      assert.ok(complaint.concern[locale].trim().length > 15);
      assert.ok(complaint.keywords[locale].trim().length > 3);
    }
    assert.equal(findComplaint(complaint.id)?.id, complaint.id);
  }
  for (const specialty of Object.values(specialtyLabels)) {
    for (const locale of locales) assert.ok(specialty.name[locale].trim());
    assert.ok(specialty.searchTerm.trim());
  }
});

test("chief complaint search is genuinely searchable in English, Sorani, Badini, Arabic", () => {
  assert.equal(searchComplaints("", "en").length, complaints.length);
  assert.ok(searchComplaints("knee", "en").some((x) => x.id === "knee-pain"));
  assert.ok(searchComplaints("ئەژنۆ", "ku").some((x) => x.id === "knee-pain"));
  assert.ok(searchComplaints("چاڤ", "bd").some((x) => x.id === "eyes"));
  assert.ok(searchComplaints("الركبة", "ar").some((x) => x.id === "knee-pain"));
  assert.equal(searchComplaints("no matching symptom xzy", "en").length, 0);
});

test("three independently named Patient pages exist with noindex until clinical review", () => {
  for (const file of [
    "app/care/complaints/page.tsx",
    "app/care/complaints/questions/page.tsx",
    "app/care/complaints/specialties/page.tsx",
  ]) {
    const page = read(file);
    assert.match(page, /robots: \{ index: false, follow: false \}/);
    assert.match(page, /resolvePatientLocale\(query\.lang\)/);
    assert.match(page, /<ComplaintScreen locale=\{locale\} step=/);
  }
  assert.match(read("app/care/complaints/layout.tsx"), /PatientComplaintFlowProvider/);
  assert.match(discovery, /patientLocaleHref\("\/care\/complaints", locale\)/);
  assert.match(welcome, /href="\/care"/);
  assert.match(welcome, /href="\/dashboard"/);
});

test("symptoms remain ephemeral, never logged, uploaded, or entered in URLs", () => {
  assert.match(context, /useState<ComplaintId \| null>\(null\)/);
  assert.match(context, /createContext/);
  assert.match(context, /setComplaint\(null\)/);
  assert.doesNotMatch(context + screen, /localStorage|sessionStorage|document\.cookie|analytics|fetch\(|\.rpc\(|createAdminClient|\.from\(|sendBeacon/);
  assert.match(screen, /router\.push\(href\("\/care\/complaints\/questions", locale\)\)/);
  assert.match(screen, /router\.push\(href\("\/care\/complaints\/specialties", locale\)\)/);
  assert.match(screen, /encodeURIComponent\(specialty\.searchTerm\)/);
  assert.doesNotMatch(screen, /complaint=|symptom=|redFlag=|duration=|patient_phone/);
});

test("warning-positive or unanswered questions block routine specialist recommendations", () => {
  assert.match(screen, /flow\.emergencyAnswer === "yes"/);
  assert.match(screen, /flow\.emergencyAnswer !== "no"/);
  assert.match(screen, /disabled=\{flow\.emergencyAnswer !== "no"\}/);
  assert.match(screen, /role="alert"/);
  assert.match(screen, /\{copy\.globalDanger\}/);
  assert.match(screen, /\{copy\.noDiagnosis\}/);
  assert.match(screen, /\{copy\.directSearch\}/);
  assert.match(copy, /emergencyTitle: "Please seek urgent medical help"/);
  assert.match(copy, /emergencyTitle: "تکایە زوو یارمەتی پزیشکی وەربگرە"/);
  assert.match(copy, /emergencyTitle: "اطلب مساعدة طبية عاجلة"/);
});

test("existing publication gates, booking and Doctor workspace remain unchanged", () => {
  assert.match(discovery, /search_public_doctors_with_availability/);
  assert.match(screen, /\x60\/care\?lang=\$\{locale\}&specialty=/);
  assert.doesNotMatch(screen, /\/book|appointment\.insert|patient_notes|clinic_members/);
  assert.match(review, /NOT CLINICALLY APPROVED/);
  assert.match(review, /DO NOT MERGE OR DEPLOY/);
  assert.match(review, /MedlinePlus/);
});

test("iPhone iPad desktop layouts retain RTL and accessible targets", () => {
  assert.match(screen, /lang=\{meta\.language\} dir=\{meta\.direction\}/);
  assert.match(screen, /aria-pressed/);
  assert.match(screen, /aria-current/);
  assert.match(screen, /type="search" dir="auto"/);
  assert.match(style, /@media\(max-width:710px\)/);
  assert.match(style, /@media\(max-width:380px\)/);
  assert.match(style, /min-height:56px/);
  assert.match(style, /focus-visible/);
  assert.match(style, /prefers-reduced-motion/);
});
