import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("active manual receptionist invitations can be listed without exposing invite secrets", () => {
  const migration = read("supabase/migrations/20260926123000_manage_active_manual_staff_invites.sql");
  const page = read("app/dashboard/staff/page.tsx");

  assert.match(migration, /list_manual_staff_invites_service/);
  assert.match(migration, /returns table \(\s*invitation_id uuid,\s*doctor_name text,\s*created_at timestamptz,\s*expires_at timestamptz\s*\)/);
  assert.match(migration, /l\.used_at is null/);
  assert.match(migration, /l\.revoked_at is null/);
  assert.match(migration, /l\.sent_at is not null/);
  assert.match(migration, /l\.invited_phone_hash is null/);
  assert.match(migration, /c\.owner_id = p_owner_id/);

  const resultShape = migration.match(/returns table \(([\s\S]*?)\)\s*language sql/)?.[1] ?? "";
  assert.doesNotMatch(resultShape, /token|hash|phone/i);

  assert.match(page, /list_manual_staff_invites_service/);
  assert.match(page, /activeManualInvites/);
  assert.doesNotMatch(page, /token_hash/);
  assert.doesNotMatch(page, /invited_phone_hash/);
});

test("manual receptionist invitation revocation is owner checked and server-only", () => {
  const migration = read("supabase/migrations/20260926123000_manage_active_manual_staff_invites.sql");
  const actions = read("app/dashboard/staff/actions.ts");

  assert.match(migration, /revoke_manual_staff_invite_service/);
  assert.match(migration, /l\.clinic_id = p_clinic_id/);
  assert.match(migration, /l\.used_at is null/);
  assert.match(migration, /l\.revoked_at is null/);
  assert.match(migration, /l\.sent_at is not null/);
  assert.match(migration, /l\.invited_phone_hash is null/);
  assert.match(migration, /grant execute on function public\.revoke_manual_staff_invite_service[\s\S]*to service_role/);
  assert.match(migration, /revoke all on function public\.revoke_manual_staff_invite_service[\s\S]*from public, anon, authenticated/);

  assert.match(actions, /revokeManualStaffInvitation/);
  assert.match(actions, /await ownerContext\(clinicId\)/);
  assert.match(actions, /revoke_manual_staff_invite_service/);
  assert.match(actions, /p_owner_id: ownerId/);
  assert.match(actions, /notice", "invitation_revoked"/);
});

test("active invitation management is localized across all Atlas interface languages", () => {
  const page = read("app/dashboard/staff/page.tsx");

  assert.match(page, /activeInvites:/);
  assert.match(page, /activeInvitesHelp:/);
  assert.match(page, /expires:/);
  assert.match(page, /revokeInvite:/);
  assert.match(page, /noActiveInvites:/);
  assert.ok((page.match(/revokeInvite:/g) ?? []).length >= 4);
});
