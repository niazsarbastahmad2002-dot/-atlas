import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("manual receptionist invites are activated at creation but remain isolated from phone-bound invites", () => {
  const migration = read("supabase/migrations/20260926090500_harden_legacy_staff_invite_redemption.sql");
  const action = read("app/dashboard/staff/invite-actions.ts");
  const finish = read("app/join/[token]/finish/route.ts");

  assert.match(action, /create_staff_invite_link_service/);
  assert.match(finish, /redeem_staff_invite_link_service/);

  assert.match(migration, /create or replace function public\.create_staff_invite_link_service/);
  assert.match(migration, /created_by,\s*sent_at/);
  assert.match(migration, /p_created_by,\s*now\(\)/);

  assert.match(migration, /create or replace function public\.redeem_staff_invite_link_service/);
  assert.match(migration, /l\.revoked_at is null/);
  assert.match(migration, /l\.sent_at is not null/);
  assert.match(migration, /l\.invited_phone_hash is null/);
  assert.match(migration, /and revoked_at is null[\s\S]*and sent_at is not null[\s\S]*and invited_phone_hash is null/);
});

test("legacy receptionist invite RPCs stay service-role only", () => {
  const migration = read("supabase/migrations/20260926090500_harden_legacy_staff_invite_redemption.sql");

  assert.match(migration, /revoke all on function public\.create_staff_invite_link_service[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /revoke all on function public\.redeem_staff_invite_link_service[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.create_staff_invite_link_service[\s\S]*to service_role/);
  assert.match(migration, /grant execute on function public\.redeem_staff_invite_link_service[\s\S]*to service_role/);
});
