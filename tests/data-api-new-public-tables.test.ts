import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

// Historical migrations predate the platform rollout. Check future additions,
// not previously applied migrations that cannot safely be rewritten in place.
const LAST_REVIEWED_MIGRATION = "20261004160000";
const migrationsUrl = new URL("../supabase/migrations/", import.meta.url);

function gapsForNewPublicTables(sql: string): string[] {
  const uncommented = sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "");
  const statements = uncommented.split(";").map((statement) => statement.trim());
  const gaps: string[] = [];
  const newTables =
    uncommented.matchAll(/\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z_]\w*)\b/gi);

  for (const match of newTables) {
    const table = match[1].toLowerCase();
    const escapedName = "public\\." + table;
    const rls = new RegExp(
      "\\balter\\s+table\\s+(?:if\\s+exists\\s+)?" + escapedName
        + "\\s+enable\\s+row\\s+level\\s+security\\b",
      "i",
    );
    const tableGrant = new RegExp(
      "\\bgrant\\s+[\\s\\S]*?\\bon\\s+table\\s+" + escapedName
        + "\\s+to\\s+(?:anon|authenticated|service_role)\\b",
      "i",
    );
    const tableRevoke = new RegExp(
      "\\brevoke\\s+all\\s+on\\s+table\\s+" + escapedName
        + "\\s+from\\s+[\\s\\S]*?\\banon\\b[\\s\\S]*?\\bauthenticated\\b",
      "i",
    );
    const grants = statements.filter((statement) => tableGrant.test(statement));
    const explicitPrivate = new RegExp(
      "^\\s*--\\s*atlas-data-api:\\s*private\\s+" + escapedName + "\\s*$",
      "im",
    ).test(sql);
    const explicitlyRevoked = statements.some((statement) => tableRevoke.test(statement));

    if (!rls.test(uncommented)) {
      gaps.push(table + ": missing ENABLE ROW LEVEL SECURITY");
    }
    if (!explicitlyRevoked) {
      gaps.push(table + ": missing explicit REVOKE ALL FROM anon, authenticated");
    }
    if (grants.length === 0 && !explicitPrivate) {
      gaps.push(table + ": choose explicit role-specific GRANT or -- atlas-data-api: private public." + table);
    }
    if (explicitPrivate && grants.length > 0) {
      gaps.push(table + ": marked private but has client Data API GRANT");
    }
    if (grants.some((grant) => /\bgrant\s+(?:all|insert|update|delete)\b[\s\S]*\bto\s+anon\b/i.test(grant))) {
      gaps.push(table + ": anonymous write privilege requires separate security review");
    }
  }
  return gaps;
}

test("new public tables explicitly choose Data API exposure and enable RLS", () => {
  const pending = readdirSync(migrationsUrl).filter(
    (file) => file.endsWith(".sql") && file.slice(0, 14) > LAST_REVIEWED_MIGRATION,
  );
  for (const file of pending) {
    const sql = readFileSync(new URL(file, migrationsUrl), "utf8");
    assert.deepEqual(gapsForNewPublicTables(sql), [], file);
  }
});

test("regression: implicit grants and missing RLS fail closed", () => {
  const sql = "create table public.future_records (id uuid);";
  assert.deepEqual(gapsForNewPublicTables(sql), [
    "future_records: missing ENABLE ROW LEVEL SECURITY",
    "future_records: missing explicit REVOKE ALL FROM anon, authenticated",
    "future_records: choose explicit role-specific GRANT or -- atlas-data-api: private public.future_records",
  ]);
});

test("regression: reviewed signed-in-only access is accepted", () => {
  const sql = [
    "create table public.future_records (id uuid);",
    "alter table public.future_records enable row level security;",
    "revoke all on table public.future_records from public, anon, authenticated;",
    "grant select on table public.future_records to authenticated;",
    "create policy future_select on public.future_records for select to authenticated using (false);",
  ].join("\n");
  assert.deepEqual(gapsForNewPublicTables(sql), []);
});

test("regression: a deliberately private public table must be marked and revoked", () => {
  const sql = [
    "-- atlas-data-api: private public.future_records",
    "create table public.future_records (id uuid);",
    "alter table public.future_records enable row level security;",
    "revoke all on table public.future_records from public, anon, authenticated;",
  ].join("\n");
  assert.deepEqual(gapsForNewPublicTables(sql), []);
});

test("regression: anonymous writes cannot slip into future grants", () => {
  const sql = [
    "create table public.future_records (id uuid);",
    "alter table public.future_records enable row level security;",
    "revoke all on table public.future_records from public, anon, authenticated;",
    "grant insert on table public.future_records to anon;",
  ].join("\n");
  assert.match(gapsForNewPublicTables(sql).join("\n"), /anonymous write privilege/);
});
