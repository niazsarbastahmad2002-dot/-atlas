import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const path = (value: string) => join(process.cwd(), value);
const source = (value: string) => readFileSync(path(value), "utf8");

test("Atlas home has one primary product entry and signed-in users skip it", () => {
  const home = source("app/page.tsx");
  const config = source("next.config.mjs");
  assert.match(home, /if \(data\.user\) redirect\("\/dashboard"\)/);
  assert.equal((home.match(/>Open Atlas</g) ?? []).length, 1);
  assert.match(home, /Try a sample clinic/);
  assert.doesNotMatch(config, /source:\s*"\/"[\s\S]*destination:\s*"\/dashboard"/);
});

test("primary daily navigation stays Schedule, Add, Settings", () => {
  const navigation = source("app/dashboard/app-navigation.tsx");
  assert.match(navigation, /Schedule/);
  assert.match(navigation, /Settings/);
  assert.match(navigation, /mobile-nav-add/);
  assert.doesNotMatch(navigation, />History</);
  assert.doesNotMatch(navigation, />Clinic access</);
  assert.doesNotMatch(navigation, />Reminders</);
});

test("doctor workflow settings are consolidated instead of DOM-injected", () => {
  const settings = source("app/dashboard/settings/page.tsx");
  const workflow = source("app/dashboard/doctor-workflow-card.tsx");
  const layout = source("app/dashboard/layout.tsx");

  assert.match(settings, /DoctorWorkflowCard/);
  assert.match(workflow, /Appointment interval/);
  assert.match(workflow, /Patient-facing details/);
  assert.match(workflow, /Patient reminders/);
  assert.match(workflow, /WhatsApp connection/);
  assert.doesNotMatch(layout, /InstantSettingChoices|SettingsClientPolish|SettingsHistoryShortcut|QuickHourPolish|ScheduleNavigationPolish/);

  for (const removed of [
    "app/dashboard/instant-setting-choices.tsx",
    "app/dashboard/settings-client-polish.tsx",
    "app/dashboard/settings-history-shortcut.tsx",
    "app/dashboard/quick-hour-polish.tsx",
    "app/dashboard/schedule-navigation-polish.tsx",
    "app/dashboard/doctor-patient-details-card.tsx",
    "app/dashboard/settings-reminder-card.tsx",
    "app/dashboard/settings/layout.tsx",
  ]) {
    assert.equal(existsSync(path(removed)), false, `${removed} should stay removed`);
  }
});

test("rare administration tools live behind Settings and duplicated invite page redirects", () => {
  const settings = source("app/dashboard/settings/page.tsx");
  const invite = source("app/dashboard/staff/invite/page.tsx");
  assert.match(settings, /Team access/);
  assert.match(settings, /Appointment history/);
  assert.match(settings, /Delete this clinic/);
  assert.match(invite, /redirect\(`\/dashboard\/staff\?clinic=\$\{clinic\}`\)/);
  assert.doesNotMatch(invite, /InviteLinkForm/);
});

test("clinic deletion shows only the clinic selected from Settings", () => {
  const page = source("app/dashboard/settings/delete/page.tsx");
  const action = source("app/dashboard/settings/delete/actions.ts");
  assert.match(page, /params\.clinic && isUuid\(params\.clinic\)/);
  assert.match(page, /\.eq\("id", clinicId\)/);
  assert.doesNotMatch(page, /clinics\.map/);
  assert.match(action, /new URLSearchParams\(\{ clinic: clinicId, error \}\)/);
});

test("simple schedule removes repeated status and appointment metadata without removing date abilities", () => {
  const css = source("app/atlas-simple-core.css");
  const dashboard = source("app/dashboard/page.tsx");
  assert.match(css, /workspace-stats \.stat:first-child/);
  assert.match(css, /nth-child\(5\)/);
  assert.match(css, /nth-child\(6\)/);
  assert.match(css, /polished-details > div:nth-child\(n \+ 2\)/);
  assert.doesNotMatch(css, /\.day-navigation\s*\{[\s\S]*?display:\s*none/);
  assert.match(dashboard, /schedule-date-shortcuts/);
  assert.match(dashboard, /day-navigation/);
});

test("healthcare scope stays operational rather than clinical decision support", () => {
  const home = source("app/page.tsx");
  assert.match(home, /Scheduling and patient communication only/);
  assert.match(home, /keep medical notes in the clinic&apos;s approved record system/);
  assert.doesNotMatch(home, /diagnos|treat|prescri/i);
});
