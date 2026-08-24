import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("doctor workflow launches Meta Coexistence and completes it server-side without activating reminders", () => {
  const panel = readFileSync("app/dashboard/whatsapp-coexistence-panel.tsx", "utf8");
  const workflow = readFileSync("app/dashboard/doctor-workflow-card.tsx", "utf8");
  const launch = readFileSync("lib/reminders/meta-coexistence.ts", "utf8");

  assert.match(workflow, /WhatsAppCoexistencePanel/);
  assert.match(workflow, /WhatsApp connection/);
  assert.match(panel, /\/api\/whatsapp\/onboarding\/status/);
  assert.match(panel, /FB\.login/);
  assert.match(panel, /FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING/);
  assert.match(panel, /WA_EMBEDDED_SIGNUP/);
  assert.match(panel, /\/api\/whatsapp\/onboarding\/complete/);
  assert.match(panel, /response_type: launch\.responseType/);
  assert.match(panel, /override_default_response_type: launch\.overrideDefaultResponseType/);
  assert.match(panel, /extras: launch\.extras/);
  assert.match(launch, /featureType: "whatsapp_business_app_onboarding"/);
  assert.match(launch, /sessionInfoVersion: "3"/);

  assert.doesNotMatch(panel, /accessToken/);
  assert.doesNotMatch(panel, /\/api\/whatsapp\/readiness/);
  assert.doesNotMatch(panel, /\/api\/cron\/reminders/);
});

test("settings only accepts Embedded Signup completion messages from Facebook origins", () => {
  const panel = readFileSync("app/dashboard/whatsapp-coexistence-panel.tsx", "utf8");
  assert.match(panel, /url\.protocol === "https:"/);
  assert.match(panel, /url\.hostname\.endsWith\("\.facebook\.com"\)/);
  assert.match(panel, /String\(root\.version\) !== "3"/);
});
