import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/dashboard/settings/page.tsx", import.meta.url), "utf8");

test("settings does not silently downgrade staff when membership loading fails", () => {
  assert.match(source, /data: membership, error: membershipError/);
  assert.match(source, /if \(membershipError \|\| doctorsError\) return <SettingsUnavailable/);
  assert.ok(
    source.indexOf("membershipError || doctorsError") < source.indexOf("const canManage ="),
    "membership errors must stop before Atlas derives the user's settings role",
  );
});
