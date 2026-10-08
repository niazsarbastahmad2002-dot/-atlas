import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/history/actions.ts", import.meta.url), "utf8");

test("permanent appointment history delete requires explicit clinic administration", () => {
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /from\("clinics"\)\.select\("id, owner_id"\)/);
  assert.match(source, /from\("clinic_members"\)[\s\S]*\.eq\("user_id", userData\.user\.id\)/);
  assert.match(source, /const isClinicOwner = clinic\.owner_id === userData\.user\.id/);
  assert.match(source, /membership\?\.role === "owner"/);
  assert.match(source, /membership\?\.role === "manager"/);
  assert.doesNotMatch(source, /membership\?\.role === "receptionist"/);

  const guard = source.indexOf('if (!canDelete) return { ok: false, error: "not_allowed" }');
  const deletion = source.indexOf('.from("appointments")\n    .delete()');
  assert.ok(guard >= 0);
  assert.ok(deletion > guard, "authorization must happen before permanent deletion");
});
