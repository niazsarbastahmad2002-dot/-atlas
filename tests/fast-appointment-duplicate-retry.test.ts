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
