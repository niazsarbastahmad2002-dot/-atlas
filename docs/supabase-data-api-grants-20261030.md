# Supabase Data API grants — October 30, 2026

## What changes

Supabase will stop implicitly granting Data API access to newly created
`public` tables in existing projects on **2026-10-30**. Existing tables,
grants, and RLS policies are **not** revoked or replaced by the rollout.

Official sources:
- https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
- https://supabase.com/docs/guides/api/securing-your-api

## Mandatory future migration pattern

For every newly created `public` table, make a deliberate decision:

1. Enable row-level security immediately.
2. Explicitly revoke inherited client privileges in the same migration from
   **three principals**: PostgreSQL pseudo-role `PUBLIC`, `anon`, and
   `authenticated`. The uppercase SQL role `PUBLIC` means *every database
   role* and is distinct from the lowercase `public` schema. Revoking only
   `anon` and `authenticated` does **not** remove access inherited from `PUBLIC`.
3. If a Data API client genuinely needs it, GRANT only required SQL operations
   to the appropriate role(s) and add clinic-scoped RLS policies.
4. Otherwise do not grant Data API access. Include a review marker like
   `-- atlas-data-api: private public.internal_table`.
5. Review column-level permissions, sequences, functions and views separately.
   Remember that RLS does not secure callable RPC functions.
6. Negative-test anonymous access, unaffiliated authenticated users,
   receptionist/doctor scope, and another clinic before approving a migration.

Example for **authenticated, read-only, clinic-scoped** access:

```sql
create table public.example_records (
  id uuid primary key,
  clinic_id uuid not null references public.clinics(id)
);

alter table public.example_records enable row level security;

revoke all on table public.example_records from public, anon, authenticated;
grant select on table public.example_records to authenticated;

create policy example_records_select on public.example_records
  for select to authenticated
  using (private.is_clinic_member(clinic_id));
```

This is a template, **not an instruction to execute**. Choose the real
authorization predicate and exact operations for each table. Never bulk-grant
all `public` tables to `anon` or `authenticated`.

## Guardrail and limits

`tests/data-api-new-public-tables.test.ts` checks SQL migration files added
after the last reviewed migration (20261004160000), requiring explicit RLS,
revocation of client defaults, and either a role-specific Data API GRANT or a
clearly marked private table. It requires explicit `REVOKE ALL` from
`PUBLIC`, `anon`, and `authenticated` (together or in separate statements),
and flags **any** new table `GRANT` to `PUBLIC` (even `SELECT`) because all
database roles inherit it. This is intentionally conservative, even if another
statement would revoke the grant later. It also requires a policy alongside
client grants, tests grant/revoke role-order variations, rejects anonymous
writes and broad authenticated `GRANT ALL`, and flags renewed broad public-schema
defaults.

The synthetic negative tests include `GRANT SELECT ON public.future_records
TO PUBLIC` with only `anon`/`authenticated` revocations and an
`authenticated`-only RLS policy. Positive cases include all three explicit
revocations with reordered or separate statements. PostgreSQL grants and RLS
are distinct layers: an authenticated-only policy alone cannot remove an
inherited `PUBLIC` table privilege.

This is a **static regression check**, not a SQL parser or proof of isolation.
It does not exercise the production database, retroactively edit historical
migrations, confirm SQL role privileges, validate RLS policy correctness,
or cover dynamically constructed SQL, identifiers requiring quoting, unqualified table names, or every possible DDL form. Review real
database privileges and run isolated multi-clinic integration tests before
deploying migrations. No production default-privilege changes are part of
this PR.

## Production change gate

Current Atlas production remains unchanged. Any production GRANT/REVOKE,
DEFAULT PRIVILEGES, migration, RLS, function or Supabase setting adjustment
needs separate explicit founder approval and a reviewed rollback/test plan.

## Read-only production access review — 2026-10-21

- All 20 currently existing `public` tables have RLS enabled.
- `public.doctor_workflow_settings` retains table-level
  `SELECT/INSERT/UPDATE/DELETE` grants for `anon`, even though its two
  RLS policies target `authenticated` only.
- Catalog checks confirmed `anon` does **not** inherit `authenticated`
  and no `anon`/`PUBLIC` RLS policy exists for this table.
- A **read-only** transaction using `SET LOCAL ROLE anon` returned
  `readable_rows = 0`. The transaction was rolled back. No patient records
  or rows were returned. This confirms no anonymous row visibility in that
  particular check, **not** a comprehensive offensive security audit.
- A future targeted revoke of `anon` table privileges is appropriate
  defense in depth, but **has not been executed or authorized**. Review any
  direct/indirect callers and isolate negative tests first. Do not revoke
  legitimate `authenticated` access or modify RLS solely to silence lint.
- Live Supabase advisor also lists 7 callable public-directory/availability
  `SECURITY DEFINER` functions and 4 authenticated clinic-export variants
  (11 total warnings in the signed-in category). Published-row guards and
  export ownership checks were inspected, but negative-role tests for the
  functions remain outstanding.

### Migration replay caution

The GitHub directory has 60 SQL migration files and the production history
lists 94 migration entries. Only 31 timestamps match exactly. Other entries
may represent the same operation under different versions; this **does not
prove production schema drift**. Do not replay GitHub migration files against
production or rewrite migration history based on filename comparison. Reconcile
SQL effects separately in an isolated environment before future schema changes.

### Approval gate

PR #685 is **test/documentation-only**. The separate production grant cleanup,
any default-privilege changes, or function edits require founder approval after
reviewed negative-case tests and a rollback plan.
