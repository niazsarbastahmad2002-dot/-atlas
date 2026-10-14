import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const staff = readFileSync(new URL("../app/dashboard/staff/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/dashboard/staff/staff-page.module.css", import.meta.url), "utf8");
const actions = readFileSync(new URL("../app/dashboard/staff/actions.ts", import.meta.url), "utf8");

test("staff page explains existing clinic roles in all four locales", () => {
  for (const key of ["teamMembers", "pendingInvites", "rolesTitle", "ownerExplanation", "managerExplanation", "receptionistExplanation", "doctorHelp"]) {
    assert.equal(staff.split(key + ":").length - 1, 5, key);
  }
  assert.match(staff, /memberRows\.length, locale/);
  assert.match(staff, /pendingRows\.length \+ activeManualInvites\.length/);
});

test("staff distinguishes pending invitations from active memberships", () => {
  const pendingIndex = staff.indexOf("{pendingRows.map(");
  const memberIndex = staff.indexOf("{memberRows.map(");
  assert.ok(pendingIndex > 0 && pendingIndex < memberIndex);
  assert.match(staff, /identity: identityById\.get\(user\.id\)/);
  assert.match(staff, /text\.joinLinkLabel/);
  assert.match(staff, /text\.legacyLabel/);
  assert.match(staff, /text\.noPending/);
});

test("staff UI preserves owner-only restriction and destructive confirmations", () => {
  assert.match(staff, /if \(!isOwner\)/);
  assert.match(staff, /invitation\.clinic_id === clinic\.id/);
  assert.match(staff, /revokeInviteConfirm\.replace/);
  assert.match(staff, /removePendingConfirm/);
  assert.match(staff, /removeConfirm\.replace/);
  assert.match(staff, /name="confirm_transfer".*required/);
  assert.match(actions, /clinic\.owner_id !== userData\.user\.id/);
  assert.match(actions, /\.eq\("clinic_id", clinicId\)/);
  assert.match(actions, /\.neq\("role", "owner"\)/);
});

test("staff layout remains compact on mobile and safe for RTL", () => {
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /border-inline-start/);
  assert.match(staff, /<bdi data-atlas-user-content="true">/);
});
