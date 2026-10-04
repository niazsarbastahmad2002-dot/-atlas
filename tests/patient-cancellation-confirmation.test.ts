import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = source("app/patient/[token]/page.tsx");
const button = source("app/patient/[token]/patient-submit-button.tsx");

test("every patient appointment cancellation asks for confirmation", () => {
  const cancellationActions = page.match(/updatePatientAppointment\.bind\(null, token, "cancelled"\)/g) ?? [];
  const cancellationConfirms = page.match(/confirmMessage=\{text\.cancelConfirm\}/g) ?? [];

  assert.equal(cancellationActions.length, 3);
  assert.equal(cancellationConfirms.length, cancellationActions.length);
  assert.match(button, /window\.confirm\(confirmMessage\)/);
});

test("cancellation confirmation is localized in all Patient languages", () => {
  assert.match(page, /cancelConfirm: "Cancel this appointment\?"/);
  assert.match(page, /cancelConfirm: "دڵنیایت دەتەوێت ئەم مەوعیدە هەڵوەشێنیتەوە\؟"/);
  assert.match(page, /cancelConfirm: "تو پشتڕاستی کو دخوازیت ئەڤ وادەیێ هەلوەشێنی\؟"/);
  assert.match(page, /cancelConfirm: "متأكد تريد تلغي هذا الموعد\؟"/);
});

test("confirmation remains UI-only and appointment authorization stays unchanged", () => {
  const actions = source("app/patient/[token]/actions.ts");
  assert.match(actions, /patientMutationAdmin\(token\)/);
  assert.match(actions, /patient_update_appointment/);
  assert.match(actions, /p_token_hash: context\.tokenHash/);
});
