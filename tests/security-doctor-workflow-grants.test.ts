import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const proposal = readFileSync(
  new URL("../docs/security/doctor-workflow-grants-proposal-20261026.sql", import.meta.url),
  "utf8",
);

// This is a regression test of a proposed ACL correction, NOT a live SQL test.
// Use the 2026-10-26 catalog snapshot as the starting privilege inventory.
const allRights = ["SELECT", "UPDATE", "INSERT", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER", "MAINTAIN"];
type Role = "public" | "anon" | "authenticated" | "service_role";
const roleNames: Role[] = ["public", "anon", "authenticated", "service_role"];

function resultingPrivileges(sql: string) {
  const roles = new Map<Role, Set<string>>([
    ["public", new Set()],
    ["anon", new Set(allRights)],
    ["authenticated", new Set(["SELECT", "UPDATE", "TRUNCATE", "REFERENCES", "TRIGGER", "MAINTAIN"])],
    ["service_role", new Set(allRights)],
  ]);
  const statements = sql
    .split("\n").filter((line) => !/^\s*--/.test(line)).join("\n")
    .split(";").map((x) => x.trim()).filter(Boolean);
  let changes = 0;
  for (const statement of statements) {
    if (/^(begin|commit)$/i.test(statement)) continue;
    const revoke = statement.match(/^revoke all privileges on table public\.doctor_workflow_settings from ([a-z_,\s]+)$/i);
    const grant = statement.match(/^grant (select, update) on table public\.doctor_workflow_settings to ([a-z_,\s]+)$/i);
    assert.ok(revoke || grant, "unexpected or broad SQL statement: " + statement);
    const recipients = (revoke?.[1] ?? grant?.[2] ?? "").split(",").map((s) => s.trim().toLowerCase() as Role);
    for (const role of recipients) {
      assert.ok(roleNames.includes(role), "unexpected recipient: " + role);
      if (revoke) roles.set(role, new Set());
      if (grant) {
        for (const privilege of ["SELECT", "UPDATE"]) roles.get(role)!.add(privilege);
      }
      changes++;
    }
  }
  assert.ok(changes >= 4, "missing expected scoped revocations/regrant");
  return roles;
}

test("proposed SQL removes all PUBLIC and anonymous rights, including TRUNCATE", () => {
  const roles = resultingPrivileges(proposal);
  assert.deepEqual([...roles.get("public")!], []);
  assert.deepEqual([...roles.get("anon")!], []);
});

test("proposed SQL preserves only authenticated SELECT and UPDATE", () => {
  const roles = resultingPrivileges(proposal);
  assert.deepEqual([...roles.get("authenticated")!].sort(), ["SELECT", "UPDATE"]);
  assert.deepEqual([...roles.get("service_role")!].sort(), [...allRights].sort());
});

test("negative: missing anonymous revoke or a broad grant must fail", () => {
  assert.notDeepEqual(
    [...resultingPrivileges(proposal.replace(", anon;", ";")).get("anon")!],
    [],
  );
  assert.throws(() => resultingPrivileges(
    proposal.replace(
      "grant select, update on table public.doctor_workflow_settings to authenticated;",
      "grant all on table public.doctor_workflow_settings to authenticated;",
    ),
  ));
});

test("proposal may not change RLS, table schema, or auth configuration", () => {
  const statements = proposal.split("\n").filter((s) => !/^\s*--/.test(s)).join("\n");
  assert.doesNotMatch(statements, /\b(?:alter table|create policy|drop policy|alter default privileges|create table|drop table|alter role)\b/i);
  assert.match(proposal, /DO NOT execute on production without separate founder approval/i);
});
