import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { specialtyLabels, matchingPublishedSpecialties } from "../lib/patient/complaint-guide.ts";
import { specialtyPageCopy, specialtyScope } from "../app/care/complaints/specialties/specialty-copy.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const locales = ["en", "ku", "bd", "ar"] as const;
const cards = read("app/care/complaints/specialties/suggested-specialty-cards.tsx");
const screen = read("app/care/complaints/complaint-screen.tsx");
const server = read("app/care/complaints/specialties/page.tsx");
const css = read("app/care/complaints/complaint-screen.css");
const review = read("docs/patient/complaint-discovery-review.md");

test("Page 05 explains all existing specialties in four locales without owning medical mapping", () => {
  assert.deepEqual(Object.keys(specialtyScope).sort(), Object.keys(specialtyLabels).sort());
  for (const role of Object.values(specialtyScope)) {
    for (const locale of locales) assert.ok(role[locale].trim().length > 18, `Missing ${locale} specialty explanation`);
  }
  for (const locale of locales) {
    const copy = specialtyPageCopy[locale];
    for (const text of Object.values(copy)) assert.ok(text.trim().length > 4, `Missing ${locale} Page 05 label`);
  }
  const copySource = read("app/care/complaints/specialties/specialty-copy.ts");
  assert.doesNotMatch(copySource, /export const complaints|\bconcern:|\bspecialties: \[/);
  assert.match(cards, /specialtyKeys\.map/);
  assert.match(cards, /specialtyScope\[key\]\[locale\]/);
});

test("Page 05 only links to specialty names returned by the published public directory", () => {
  assert.deepEqual(matchingPublishedSpecialties("orthopedics", ["Orthopaedic Surgery", "Unlisted Specialty"]), ["Orthopaedic Surgery"]);
  assert.deepEqual(matchingPublishedSpecialties("urology", ["Unlisted Specialty"]), []);
  assert.match(cards, /matchingPublishedSpecialties\(key, publishedSpecialties\)/);
  assert.match(cards, /matches\.length \? matches\.map/);
  assert.match(cards, /encodeURIComponent\(name\)/);
  assert.match(cards, /copy\.noPublishedMatch/);
  assert.match(server, /search_public_doctors_with_availability/);
  assert.match(server, /p_limit: 30/);
  assert.match(server, /ATLAS_PATIENT_COMPLAINT_GUIDE_ENABLED !== "true"\) notFound\(\)/);
  assert.match(server, /robots: \{ index: false, follow: false \}/);
  assert.doesNotMatch(server, /complaint:|emergencyAnswer|patient_phone|createAdminClient/);
});

test("Emergency or unanswered safety question overrides Page 05 routine recommendations", () => {
  assert.match(screen, /flow\.emergencyAnswer !== "no"/);
  assert.match(screen, /riskPositive \? <div className="atlas-complaint-alert" role="alert"/);
  assert.match(screen, /\) : notCleared \? \(/);
  assert.match(screen, /<SuggestedSpecialtyCards/);
  assert.match(screen, /<p className="atlas-complaint-emergency-short" role="note">\{copy\.globalDanger\}<\/p>/);
  assert.match(screen, /flow\.reset\(\)/);
  assert.match(screen, /copy\.directSearch/);
  assert.match(review, /NOT CLINICALLY APPROVED/);
});

test("Comparison and navigation are usable without exposing symptom answers", () => {
  assert.match(cards, /setComparedKey/);
  assert.match(cards, /aria-expanded=\{comparedKey === other\}/);
  assert.match(cards, /aria-controls="atlas-complaint-comparison"/);
  assert.match(cards, /hidden=\{!comparedKey\}/);
  assert.match(cards, /<bdi>/);
  assert.match(css, /\.atlas-complaint-comparison\[hidden\]\{display:none\}/);
  assert.match(css, /@media\(max-width:710px\)/);
  assert.match(css, /@media\(max-width:380px\)/);
  assert.match(css, /min-height:48px/);
  assert.doesNotMatch(cards, /fetch\(|\.rpc\(|\.from\(|localStorage|sessionStorage|sendBeacon\(|patient_phone|\/(?:book|dashboard)/);
  assert.doesNotMatch(cards, /complaint=|symptom=|redFlag=|emergencyAnswer=/);
});
