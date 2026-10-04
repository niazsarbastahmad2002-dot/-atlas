import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("protected history views fail visibly for staff membership read errors but preserve direct owners", () => {
  for (const path of ["app/dashboard/history/page.tsx", "app/dashboard/activity/page.tsx"]) {
    const source = read(path);
    assert.match(source, /data: membership, error: membershipError/);
    assert.match(source, /membershipError && clinic\.owner_id !== userData\.user\.id/);
    assert.ok(
      source.indexOf("membershipError && clinic.owner_id !== userData.user.id")
        < source.indexOf(path.includes("/activity/") ? "const canView" : "const canManageRecords"),
      `${path} must stop before deriving staff access when membership failed`,
    );
  }
});
