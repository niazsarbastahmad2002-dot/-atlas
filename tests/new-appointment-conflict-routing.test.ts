import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("new appointment creation routes occupied slots separately from duplicate submissions", () => {
  const actions = read("app/dashboard/actions.ts");
  const messages = read("lib/messages.ts");
  const localized = read("lib/dashboard-message-copy.ts");

  assert.match(actions, /classifyAppointmentCreateError/);
  assert.match(actions, /conflict === "duplicate"[\s\S]*notice: "appointment_duplicate"/);
  assert.match(actions, /conflict === "slot_taken"[\s\S]*notice: "appointment_slot_taken"/);
  assert.match(messages, /appointment_slot_taken: "That doctor already has an appointment at this time\. Choose another time\."/);

  assert.ok((localized.match(/appointment_slot_taken:/g) ?? []).length >= 3);
  assert.match(localized, /ئەم پزیشکە لەم کاتەدا وادەیەکی تری هەیە/);
  assert.match(localized, /ڤی دکتۆری ل ڤی دەمی وادە هەیە/);
  assert.match(localized, /لدى هذا الطبيب موعد في هذا الوقت/);
});
