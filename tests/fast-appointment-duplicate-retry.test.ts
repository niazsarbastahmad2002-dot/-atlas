import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("fast appointment retries treat idempotency conflicts as already saved", () => {
  const action = read("app/dashboard/instant-actions.ts");
  const client = read("app/dashboard/dashboard-client-polish.tsx");

  assert.match(action, /classifyAppointmentCreateError/);
  assert.match(action, /createFailure === "duplicate"[\s\S]*return \{ ok: true, created: false, duplicate: true \}/);
  assert.match(action, /createFailure === "slot_taken"[\s\S]*return \{ ok: false, reason: "slot_taken" \}/);

  assert.match(client, /duplicate: "Appointment was already added"/);
  assert.match(client, /notice: result\.duplicate \? "appointment_duplicate" : "appointment_created"/);
  assert.match(client, /toast\.success\(Boolean\(result\.duplicate\)\)/);
  assert.match(client, /result\.duplicate \? fastSaveCopy\[locale\]\.duplicate : fastSaveCopy\[locale\]\.saved/);
});

test("fast duplicate confirmation is localized across Atlas languages", () => {
  const client = read("app/dashboard/dashboard-client-polish.tsx");

  assert.match(client, /duplicate: "وادەکە پێشتر دانراوە"/);
  assert.match(client, /duplicate: "وادە پێشتر هاتیە زێدەکرن"/);
  assert.match(client, /duplicate: "الموعد مضاف مسبقاً"/);
});


test("fast appointment save locks the whole form and restores prior disabled states", () => {
  const client = read("app/dashboard/dashboard-client-polish.tsx");

  assert.ok(client.includes('"input, select, textarea, button"'));
  assert.match(client, /const disabledBeforeSave = controls\.map\(\(control\) => control\.disabled\)/);
  assert.match(client, /controls\.forEach\(\(control\) => \{ control\.disabled = true; \}\)/);
  assert.match(client, /control\.disabled = disabledBeforeSave\[index\] \?\? false/);
});
