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
2. Explicitly revoke inherited client privileges in the same migration.
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
clearly marked private table. It rejects anonymous write grants by default.

This is a **static regression check**, not a SQL parser or proof of isolation.
It does not exercise the production database, retroactively edit historical
migrations, confirm SQL role privileges, validate RLS policy correctness,
or cover dynamically constructed SQL/unqualified table names. Review real
database privileges and run isolated multi-clinic integration tests before
deploying migrations. No production default-privilege changes are part of
this PR.

## Production change gate

Current Atlas production remains unchanged. Any production GRANT/REVOKE,
DEFAULT PRIVILEGES, migration, RLS, function or Supabase setting adjustment
needs separate explicit founder approval and a reviewed rollback/test plan.
