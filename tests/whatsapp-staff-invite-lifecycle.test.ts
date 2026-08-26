import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("WhatsApp staff invites are phone-bound and activate only after accepted delivery", () => {
  const action = source("app/dashboard/staff/invite-actions.ts");

  assert.match(action, /create_phone_staff_invite_link_service/);
  assert.match(action, /p_invited_phone_hash: invitedPhoneHash/);
  assert.match(action, /activate_phone_staff_invite_link_service/);
  assert.match(action, /p_provider_message_id: sent\.providerMessageId/);
  assert.match(action, /preview_staff_invite_link_service/);
  assert.doesNotMatch(action, /rpc\("create_staff_invite_link_service"/);

  const rejectedDelivery = action.indexOf("if (!sent.accepted)");
  const activation = action.indexOf('rpc("activate_phone_staff_invite_link_service"');
  assert.ok(rejectedDelivery >= 0);
  assert.ok(activation > rejectedDelivery);
});

test("staff invitation UI requires a recipient phone and fails closed until direct WhatsApp is ready", () => {
  const form = source("app/dashboard/staff/invite-link-form.tsx");

  assert.match(form, /name="recipient_phone"/);
  assert.match(form, /required/);
  assert.match(form, /!directWhatsAppInvites \|\| !recipientPhone\.trim\(\)/);
  assert.doesNotMatch(form, /phoneHelp: "Optional/);
});

test("staff invite redemption requires the authenticated user's verified invited phone", () => {
  const finish = source("app/join/[token]/finish/route.ts");

  assert.match(finish, /phone_confirmed_at/);
  assert.match(finish, /normalizeAuthPhone\(userData\.user\.phone/);
  assert.match(finish, /redeem_phone_staff_invite_link_service/);
  assert.match(finish, /p_verified_phone_hash: verifiedPhoneHash/);
  assert.doesNotMatch(finish, /rpc\("redeem_staff_invite_link_service"/);
});
