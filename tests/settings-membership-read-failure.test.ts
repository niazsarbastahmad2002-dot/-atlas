import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/settings/page.tsx", import.meta.url), "utf8");

test("settings fails visibly for staff membership read errors without blocking direct owners", () => {
  assert.match(source, /data: membership, error: membershipError/);
  assert.match(source, /doctorsError \|\| \(membershipError && clinic\.owner_id !== userData\.user\.id\)/);
  assert.ok(
    source.indexOf("membershipError && clinic.owner_id !== userData.user.id") < source.indexOf("const canManage ="),
    "staff membership errors must stop before Atlas derives settings permissions",
  );
});
