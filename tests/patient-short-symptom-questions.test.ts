import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { guideCopy } from "../app/care/complaints/complaint-copy.ts";
import { complaints } from "../lib/patient/complaint-guide.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const question = read("app/care/complaints/short-symptom-questions.tsx");
const context = read("app/care/complaints/flow-context.tsx");
const screen = read("app/care/complaints/complaint-screen.tsx");
const css = read("app/care/complaints/complaint-screen.css");
const route = read("app/care/complaints/questions/page.tsx");
const review = read("docs/patient/short-symptom-questions-review.md");

test("one complaint-specific warning question, with explicit yes/no/unsure in every supported language", () => {
  assert.equal(complaints.length, 10);
  for (const complaint of complaints) {
    for (const locale of ["en", "ku", "bd", "ar"] as const) {
      assert.ok(complaint.concern[locale].trim().length > 15);
    }
  }
  for (const locale of ["en", "ku", "bd", "ar"] as const) {
    for (const key of ["riskTitle", "riskYes", "riskNo", "riskUnsure", "riskNoWarning", "emergencyHelp", "riskUnanswered"] as const) {
      assert.ok(guideCopy[locale][key].trim().length >= 2, `${locale} missing ${key}`);
    }
    assert.notEqual(guideCopy[locale].riskYes, guideCopy[locale].riskUnsure);
  }
  assert.match(question, /const answers = \[/);
  assert.match(question, /answerEmergency\(answer\.value\)/);
  assert.match(question, /aria-pressed/);
  assert.match(question, /aria-labelledby="atlas-patient-risk-question"/);
});

test("yes and unsure both stop suggested specialties; no never claims clinical clearance", () => {
  assert.match(context, /"yes" \| "no" \| "unsure" \| null/);
  assert.match(question, /emergencyAnswer === "yes" \|\| flow\.emergencyAnswer === "unsure"/);
  assert.match(screen, /emergencyAnswer === "yes" \|\| flow\.emergencyAnswer === "unsure"/);
  assert.match(screen, /emergencyAnswer !== "no"/);
  assert.match(question, /disabled=\{flow\.emergencyAnswer !== "no"\}/);
  assert.match(question, /role="alert"/);
  assert.match(question, /role="note"/);
  assert.match(question, /copy\.riskNoWarning/);
  assert.match(screen, /copy\.emergencyHelp/);
  assert.match(screen, /copy\.noDiagnosis/);
});

test("patient can go back or search directly without supplying a symptom history", () => {
  assert.match(question, /flow\.reset\(\)/);
  assert.match(question, /\/care\/complaints\?lang=/);
  assert.match(screen, /copy\.directSearch/);
  assert.doesNotMatch(context + screen + question, /(?:window|globalThis)\.(?:localStorage|sessionStorage)|sendBeacon\(|document\.cookie|fetch\(|\.rpc\(|\.from\(|patient_phone|symptom=|complaint=|answer=|duration=/);
  assert.doesNotMatch(question, /<input|<textarea/);
});

test("question remains separate, responsive, inaccessible before release and pending signed clinical review", () => {
  assert.match(route, /ATLAS_PATIENT_COMPLAINT_GUIDE_ENABLED !== "true"\) notFound\(\)/);
  assert.match(route, /robots: \{ index: false, follow: false \}/);
  assert.match(screen, /<ShortSymptomQuestions locale=\{locale\}/);
  assert.match(css, /min-height:60px/);
  assert.match(css, /grid-template-columns:repeat\(3/);
  assert.match(css, /atlas-complaint-answers\\{grid-template-columns:1fr/);
  assert.match(review, /NOT CLINICALLY APPROVED/);
  assert.match(review, /DO NOT MERGE OR DEPLOY/);
  assert.match(review, /English, Sorani, Badini, and Iraqi Arabic/);
  assert.match(review, /Clinical reviewer/);
});
