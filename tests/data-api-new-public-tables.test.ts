import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

// Existing Atlas migrations are immutable history. Enforce the contract on new
// timestamped migration files; never change previously applied migrations here.
const LAST_REVIEWED_MIGRATION = "20261004160000";
const migrationsUrl = new URL("../supabase/migrations/", import.meta.url);

function statementsOf(sql: string): string[] {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function tablePermissionIssues(sql: string): string[] {
  const statements = statementsOf(sql);
  const plainSql = statements.join(";\n");
  const gaps: string[] = [];

  // Explicitly flag attempts to restore broad public-schema defaults, even
  // when the migration doesn't itself create a table.
  for (const statement of statements) {
    if (/^alter\s+default\s+privileges\b/i.test(statement)
      && /\bin\s+schema\s+public\b/i.test(statement)
      && /\bgrant\b/i.test(statement)
      && /\bto\b[\s\S]*\b(?:anon|authenticated|public)\b/i.test(statement)) {
      gaps.push("migration: broad default Data API privileges require security review");
    }
  }

  const createdTables = [...plainSql.matchAll(
    /\bcreate\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?public\.([a-z_]\w*)\b/gi,
  )].map((match) => match[1].toLowerCase());

  for (const table of new Set(createdTables)) {
    const name = "public\\." + table;
    const rls = new RegExp(
      "^alter\\s+table\\s+(?:if\\s+exists\\s+)?" + name
      + "\\s+enable\\s+row\\s+level\\s+security\\b", "i",
    );
    const grantExpr = new RegExp(
      "^grant\\s+([\\s\\S]+?)\\s+on\\s+(?:table\\s+)?" + name
      + "\\s+to\\s+([\\s\\S]+)$", "i",
    );
    const revokeExpr = new RegExp(
      "^revoke\\s+all\\s+on\\s+(?:table\\s+)?" + name
      + "\\s+from\\s+([\\s\\S]+)$", "i",
    );
    const policyExpr = new RegExp(
      "^create\\s+policy\\s+(?:\"[^\"]+\"|[a-z_]\\w*)\\s+on\\s+" + name + "\\b", "i",
    );

    const directGrants = statements.flatMap((statement) => {
      const match = statement.match(grantExpr);
      if (!match) return [];
      return [{
        privileges: match[1].toLowerCase(),
        recipients: match[2].toLowerCase().split(",").map((role) => role.trim()),
      }];
    });
    const revoked = new Set(statements.flatMap((statement) => {
      const match = statement.match(revokeExpr);
      return match ? match[1].toLowerCase().split(",").map((role) => role.trim()) : [];
    }));
    const clientGrants = directGrants.filter(
      (grant) => grant.recipients.some(
        (role) => role === "anon" || role === "authenticated" || role === "public",
      ),
    );
    const explicitlyPrivate = new RegExp(
      "^\\s*--\\s*atlas-data-api:\\s*private\\s+" + name + "\\s*$", "im",
    ).test(sql);

    if (!statements.some((statement) => rls.test(statement))) {
      gaps.push(table + ": missing ENABLE ROW LEVEL SECURITY");
    }
    if (!revoked.has("anon") || !revoked.has("authenticated")) {
      gaps.push(table + ": missing explicit REVOKE ALL FROM anon, authenticated");
    }
    if (clientGrants.length === 0 && !explicitlyPrivate) {
      gaps.push(table + ": choose explicit role-specific GRANT or -- atlas-data-api: private public." + table);
    }
    if (explicitlyPrivate && clientGrants.length > 0) {
      gaps.push(table + ": marked private but has client Data API GRANT");
    }
    if (clientGrants.length > 0 && !statements.some((statement) => policyExpr.test(statement))) {
      gaps.push(table + ": client-granted table requires a reviewed RLS policy");
    }

    // PUBLIC is inherited by anon; list order of grant recipients must not
    // change the outcome. Column-scoped INSERT/UPDATE also count as writes.
    if (clientGrants.some((grant) =>
      grant.recipients.some((role) => role === "anon" || role === "public")
      && /\b(all|insert|update|delete|truncate)\b/i.test(grant.privileges))) {
      gaps.push(table + ": anonymous write privilege requires separate security review");
    }
    if (clientGrants.some((grant) =>
      grant.recipients.includes("authenticated") && /\ball\b/i.test(grant.privileges))) {
      gaps.push(table + ": GRANT ALL to authenticated is not least privilege");
    }

  }

  return gaps;
}

function checkFutureMigrations(): void {
  const filenames = readdirSync(migrationsUrl).filter((filename) => filename.endsWith(".sql"));
  for (const filename of filenames) {
    assert.match(filename, /^\d{14}_[\w-]+\.sql$/, "All migrations must use timestamped filenames");
    if (filename.slice(0, 14) <= LAST_REVIEWED_MIGRATION) continue;
    const sql = readFileSync(new URL(filename, migrationsUrl), "utf8");
    assert.deepEqual(tablePermissionIssues(sql), [], filename);
  }
}

test("future public schema migrations explicitly choose grants and RLS", checkFutureMigrations);

test("regression: implicit grants and missing RLS fail closed", () => {
  assert.deepEqual(tablePermissionIssues("create table public.future_records (id uuid);"), [
    "future_records: missing ENABLE ROW LEVEL SECURITY",
    "future_records: missing explicit REVOKE ALL FROM anon, authenticated",
    "future_records: choose explicit role-specific GRANT or -- atlas-data-api: private public.future_records",
  ]);
});

const baseTable = [
  "create table public.future_records (id uuid);",
  "alter table public.future_records enable row level security;",
];

test("regression: reviewed authenticated access with clinic policy is accepted", () => {
  const sql = [
    ...baseTable,
    "revoke all on table public.future_records from public, anon, authenticated;",
    "grant select on table public.future_records to authenticated;",
    "create policy future_select on public.future_records for select to authenticated using (false);",
  ].join("\n");
  assert.deepEqual(tablePermissionIssues(sql), []);
});

test("regression: separate revokes and reversed role order are accepted", () => {
  const sql = [
    ...baseTable,
    "revoke all on table public.future_records from authenticated;",
    "revoke all on table public.future_records from anon;",
    "grant select on table public.future_records to authenticated;",
    "create policy future_select on public.future_records for select to authenticated using (false);",
  ].join("\n");
  assert.deepEqual(tablePermissionIssues(sql), []);
});

test("regression: private table can grant service_role, never client roles", () => {
  const sql = [
    "-- atlas-data-api: private public.future_records",
    ...baseTable,
    "revoke all on table public.future_records from public, anon, authenticated;",
    "grant select, insert on table public.future_records to service_role;",
  ].join("\n");
  assert.deepEqual(tablePermissionIssues(sql), []);
  assert.match(
    tablePermissionIssues(sql + "\ngrant select on table public.future_records to anon;").join("\n"),
    /marked private but has client Data API GRANT/,
  );
});

test("regression: unrelated table grant does not satisfy missing grants", () => {
  const sql = [
    ...baseTable,
    "revoke all on table public.future_records from anon, authenticated;",
    "grant select on table public.unrelated_table to authenticated;",
  ].join("\n");
  assert.match(tablePermissionIssues(sql).join("\n"), /choose explicit role-specific GRANT/);
});

test("regression: grant without RLS policy is rejected", () => {
  const sql = [
    ...baseTable,
    "revoke all on table public.future_records from anon, authenticated;",
    "grant select on table public.future_records to authenticated;",
  ].join("\n");
  assert.match(tablePermissionIssues(sql).join("\n"), /requires a reviewed RLS policy/);
});

test("regression: anonymous write grants are flagged regardless of role order", () => {
  const sql = [
    ...baseTable,
    "revoke all on table public.future_records from anon, authenticated;",
    "grant select, update on table public.future_records to authenticated, anon;",
    "create policy future_select on public.future_records for select to authenticated using (false);",
  ].join("\n");
  assert.match(tablePermissionIssues(sql).join("\n"), /anonymous write privilege/);
});

test("regression: broad grants and public default privileges are flagged", () => {
  const sql = [
    ...baseTable,
    "revoke all on table public.future_records from anon, authenticated;",
    "grant all on table public.future_records to authenticated;",
    "create policy future_select on public.future_records for select to authenticated using (false);",
    "alter default privileges for role postgres in schema public grant select on tables to service_role, anon;",
  ].join("\n");
  const issues = tablePermissionIssues(sql).join("\n");
  assert.match(issues, /GRANT ALL to authenticated/);
  assert.match(issues, /broad default Data API privileges/);
});
