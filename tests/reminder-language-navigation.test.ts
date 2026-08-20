import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const navigation = source("../app/dashboard/schedule-navigation-polish.tsx");
const perfectCss = source("../app/atlas-perfect.css");
const dashboard = source("../app/dashboard/page.tsx");
const editor = source("../app/dashboard/appointment-editor.tsx");
const settings = source("../app/dashboard/settings-reminder-card.tsx");
const actions = source("../app/dashboard/actions.ts");
const instantActions = source("../app/dashboard/instant-actions.ts");
const settingsActions = source("../app/dashboard/settings/actions.ts");
const workflowRoute = source("../app/api/settings/doctor-workflow/route.ts");
const patient = source("../app/patient/[token]/page.tsx");

test("schedule day navigation never leaves the row faded", () => {
  assert.doesNotMatch(navigation, /classList\.add\(["']is-navigating["']\)/);
  assert.doesNotMatch(perfectCss, /\.day-navigation\.is-navigating\s*\{[^}]*opacity\s*:/);
});

test("patient reminder selectors include Sorani Badini Iraqi Arabic and English", () => {
  for (const value of [dashboard, editor, settings]) {
    assert.match(value, /Kurdish \(Sorani\)/);
    assert.match(value, /Kurdish \(Badini\)/);
    assert.match(value, /Iraqi Arabic/);
    assert.match(value, /English/);
  }
});

test("Badini reminder language is accepted by appointment and doctor settings validators", () => {
  for (const value of [actions, instantActions, settingsActions, workflowRoute]) {
    assert.match(value, /new Set\(\["ku", "bd", "ar", "en"\]\)/);
  }
});

test("new appointments use the selected doctor's reminder language default", () => {
  assert.match(dashboard, /doctor_workflow_settings/);
  assert.match(dashboard, /defaultReminderLanguage = \(doctorWorkflowRows/);
});

test("Iraqi Arabic patient copy uses simple Iraqi wording", () => {
  assert.match(patient, /راح تجي/);
  assert.match(patient, /ما أگدر أجي/);
});
