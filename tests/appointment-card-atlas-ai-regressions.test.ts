import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("appointment cards separate numeric date from time and preserve LTR phone scanning", () => {
  const component = source("app/components/atlas-appointment-card-polish.tsx");
  const css = source("app/atlas-appointment-card-polish.css");
  const layout = source("app/layout.tsx");

  assert.match(component, /localizeDigits\(`\$\{date\}\/\$\{month\}\/\$\{year\}`/);
  assert.match(component, /appointment-date-detail/);
  assert.match(component, /appointment-date-value/);
  assert.match(component, /appointment-time-detail/);
  assert.match(component, /atlasSeparatedClock/);
  assert.match(component, /atlas-phone-appointment-phone/);
  assert.match(component, /setAttribute\("dir", "ltr"\)/);

  assert.match(css, /\.appointment-date-value, \.appointment-time-value/);
  assert.match(css, /direction: ltr !important/);
  assert.match(css, /font-variant-numeric: tabular-nums !important/);
  assert.match(css, /height: auto !important/);
  assert.match(css, /min-height: 0 !important/);
  assert.match(css, /grid-template-columns: repeat\(auto-fit, minmax\(138px, 1fr\)\)/);
  assert.match(css, /\.atlas-phone-appointment-phone/);

  const finalReadability = layout.indexOf('import "./atlas-final-readability.css";');
  const cardPolish = layout.indexOf('import "./atlas-appointment-card-polish.css";');
  assert.ok(cardPolish > finalReadability, "appointment card polish must win over older fixed-height rules");
  assert.match(layout, /<AtlasAppointmentCardPolish locale=\{locale\} \/>/);
});

test("Atlas AI exposes five clinic-safe localized quick questions without fictional doctors", () => {
  const client = source("app/dashboard/assistant/atlas-ai-client-v8.tsx");
  const entry = source("app/dashboard/assistant/atlas-ai-client.tsx");

  assert.match(entry, /atlas-ai-client-v8/);
  assert.doesNotMatch(client, /Dr\. Sara|دکتۆر سارا|الدكتور سارة/);
  assert.match(client, /"Show me today's appointments\."/);
  assert.match(client, /"How busy is the clinic today\?"/);
  assert.match(client, /"What should reception focus on today\?"/);
  assert.match(client, /"How do I change the appointment interval\?"/);
  assert.match(client, /"Are reminders enabled for this clinic\?"/);

  for (const locale of ["en", "ku", "bd", "ar"] as const) {
    const block = new RegExp(`${locale}: \\{[\\s\\S]*?examples: \\[([\\s\\S]*?)\\]`, "u").exec(client)?.[1] ?? "";
    const questions = block.match(/"[^"\n]+"/g) ?? [];
    assert.equal(questions.length, 5, `${locale} should expose exactly five example questions`);
  }
});

test("Atlas AI product knowledge and safety separate authorized clinic data from general medical education", () => {
  const knowledge = source("lib/atlas-ai-product-knowledge.ts");
  const quality = source("lib/atlas-ai-response-quality.ts");
  const route = source("app/api/atlas-ai/route.ts");

  assert.match(knowledge, /Atlas Local is a separate device-only\/offline mode/);
  assert.match(knowledge, /appointment interval/);
  assert.match(knowledge, /roles include owner, manager, and receptionist/);
  assert.match(knowledge, /General medical education/);
  assert.match(knowledge, /does not store diagnoses or clinical notes/);
  assert.match(quality, /general educational medical questions/);
  assert.match(quality, /must never be presented as a diagnosis/);
  assert.match(quality, /Do not diagnose, recommend patient-specific treatment/);

  assert.match(route, /resolveAtlasRecordRequest\(authorizedRows, conversation, responseLocale\)/);
  assert.match(route, /recordResolution\?\.localOnly/);
  assert.match(route, /buildAtlasAiOperationalContext/);
  assert.match(knowledge, /No patient names or phone numbers are included in this context/);
});
