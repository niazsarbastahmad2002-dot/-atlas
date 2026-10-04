import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");

test("dashboard does not render healthy reminder defaults when reminder settings fail to load", () => {
  assert.match(source, /data: reminderSettings, error: reminderSettingsError/);
  assert.match(
    source,
    /membershipError \|\| appointmentError \|\| occupiedError \|\| reminderSettingsError \|\| workflowError \|\| doctorsError/,
  );
  assert.ok(
    source.indexOf("reminderSettingsError") < source.indexOf("defaultReminderLanguage"),
    "reminder settings failures must stop before fallback reminder values are rendered",
  );
});
