import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const actions = readFileSync(join(process.cwd(), "app/patient/[token]/actions.ts"), "utf8");
const page = readFileSync(join(process.cwd(), "app/patient/[token]/page.tsx"), "utf8");

test("patient can explicitly opt into and out of Smart Fill", () => {
  assert.match(actions, /patient_set_earlier_slot_preference/);
  assert.match(actions, /p_enabled: enabled/);
  assert.match(actions, /patient-mutation:/);
  assert.match(actions, /revalidatePath\(`\/patient\/\$\{token\}`\)/);
});

test("patient page reads Smart Fill preference only on active appointments", () => {
  assert.match(page, /if \(isActive\) \{/);
  assert.match(page, /patient_get_earlier_slot_preference/);
  assert.match(page, /wantsEarlierSlot = preference === true/);
});

test("earlier-slot opt-in is available in every patient language", () => {
  assert.equal((page.match(/earlierTitle:/g) ?? []).length, 4);
  assert.equal((page.match(/earlierJoin:/g) ?? []).length, 4);
  assert.equal((page.match(/earlierJoined:/g) ?? []).length, 4);
  assert.equal((page.match(/earlierLeave:/g) ?? []).length, 4);
});

test("Smart Fill opt-in never sends a patient message directly", () => {
  assert.doesNotMatch(actions, /sendApprovedWhatsAppTemplate|routeReminder|fetch\(/);
  assert.doesNotMatch(page, /sendApprovedWhatsAppTemplate|routeReminder/);
});
