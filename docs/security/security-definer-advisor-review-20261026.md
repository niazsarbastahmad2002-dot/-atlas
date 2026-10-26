# Atlas SECURITY DEFINER advisor review — 2026-10-26
**Status:** Read-only production catalog and GitHub source review; no permission, RLS, Auth, schema, deploy, or production changes. These are **regression guardrails**, not a claim of vulnerability remediation.

## Current advisor inventory
- 7 anonymous executable definer warnings and 11 authenticated executable definer warnings (the same seven intentionally public functions are counted twice).
  Sources: [anon lint 0028](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [auth lint 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- 1 Supabase Auth warning: leaked-password protection disabled. [Official guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- All 20 public tables retain RLS, but row policy ≠ SQL table privilege ≠ function EXECUTE privilege.

## Intentional public RPCs (seven; low observed patient-privacy risk, possible availability side channel)
`get_public_clinic_profile`, `get_public_doctor_profile`, `list_public_doctors`, `search_public_doctors`, `search_public_doctors_with_availability`, `list_public_doctor_slots`, `list_public_doctor_slots_page`.

Live SQL uses `SECURITY DEFINER`, explicit `anon` and `authenticated` EXECUTE, empty `search_path`, filtered published clinic and doctor profiles and active doctors. Slot RPCs additionally require the clinic's public booking setting to be enabled and exclude booked appointment overlaps while **returning times/intervals only**, not patients or appointments. Search results return publication fields only.

**Do not blindly revoke or convert to SECURITY INVOKER:** these are Atlas's deliberately public Find Care/booking data boundaries and the functions rely on controlled reads through otherwise private data. The fact that available slots change can reveal **occupancy** to anyone; clinics should understand this designed visibility and opt-in/publication constraints must remain mandatory.

Bounded read-only negative query under `SET LOCAL ROLE anon` using an explicitly nonexistent clinic/doctor slug returned 0 rows from all seven. This is not proof that published clinics never leak data. Real multi-clinic isolation and unpublish behavior should be exercised with isolated synthetic fixtures before authorizing any function DDL.

## Clinic export RPCs (four additional authenticated warnings; low observed data-leak risk, audit-integrity residual)
`reserve_clinic_export(uuid)`, `reserve_clinic_export(uuid,text)`, `complete_clinic_export(bigint,integer,integer)`, `fail_clinic_export(bigint,text)`.

Live SQL uses `auth.uid()`, exact clinic owner check for reserve, owner **and requester** checks for complete/fail, `status='started'` for completion, and a 3/hour reservation limit. `anon` lacks EXECUTE; authenticated users can call the RPCs directly, but guards constrain their own clinic. The `clinic_export_audit` table contains no archive contents and exposes no client table grants. The Next.js `/api/clinic-export` route checks user and clinic ownership before collecting sensitive records through the caller's scoped session.

Residual integrity caveat: a clinic owner could directly finalize their own audit metadata without the actual application export, because the two complete/fail RPCs are directly executable. That is *not* cross-clinic patient access but can weaken audit trust if used as authoritative proof of completed files. No live changes recommended until isolated negative tests confirm behavior and decide whether to restrict these calls to a server-owned channel.

In a READ ONLY simulation, attempts to call the status-update RPC were refused by PostgreSQL as writes. This prevented mutation but does **not** demonstrate that a non-owner would be rejected under a normal transaction. Do not overclaim a successful negative test.

## Doctor workflow permissions (HIGH remediation priority; separate draft PR)
Live `public.doctor_workflow_settings` table grants `anon` SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN, and `authenticated` SELECT, UPDATE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN. `TRUNCATE` bypasses RLS, despite the configured authenticated-only SELECT/UPDATE clinic-and-doctor policies. A read-only anon role returned 0 table rows, and an unaffiliated synthetic authenticated user saw 0 settings or clinics. This is no observed patient leak but is excessive defense-in-depth privilege, especially if another SQL execution pathway ever becomes accessible.

Draft **PR #702** holds only a review-only SQL proposal plus static negative ACL tests; it is **not** an automatic migration. Requires separate founder authorization and isolated compatibility/rollback validation before any actual SQL execution. Do not remove authenticated SELECT/UPDATE, service_role privileges, appointment scheduling triggers or public availability RPC compatibility.

## Other unresolved security control / Oct 30 deadline
- **Leaked-password protection disabled (MEDIUM security posture risk):** enabling is an Auth configuration change and requires a separate founder approval. Verify password sign-up/reset behavior, support for email OTP and connected sign-in modes, error translation across Sorani/English/Arabic/Badini, and user impact before enabling. No GitHub code-only patch can honestly claim to enable it.
- **Postgres default ACLs still broad as of Oct 26 (MEDIUM future-DDL exposure risk):** for both `postgres` and `supabase_admin`, catalog `pg_default_acl` shows public-schema table client all privileges, sequence client rights, and function EXECUTE grants. This is why later new-table migrations must follow PR #685 explicit `PUBLIC`/`anon`/`authenticated` revokes, explicit scoped grants, RLS and clinic policies. Do not assume the Oct 30 platform rollout has already changed these defaults; recheck after that date manually via Atlas Operations and get separate approval for any default ACL correction. Never blanket-revoke existing RPC EXECUTE rights.
- **Migration history mismatch:** repository vs live migration version counts differ. This is **not** proof of schema drift; do not run old SQL/replay migrations based on filenames.

## Regression scope / limitations
`tests/security-definer-rpc-contracts.test.ts` checks checked-in source SQL contracts for publication, active doctors, slot output, export ownership, and server route ownership. Static checks are intentionally scoped to current known source migration files; they are **not a SQL parser**, do not read live pg_proc, cannot detect an out-of-repo DB edit, and cannot replace two-clinic negative integration tests. Production catalog definitions were reviewed separately on 2026-10-26.

**Next:** Independently validate published/unpublished clinic/doctor scenarios, cross-clinic records, owner/receptionist export isolation, and settings negative writes in an **isolated synthetic environment**. Maintain the seven intentional public RPCs unless evidence warrants a targeted redesign. All schema/grant/RLS/Auth changes need separate founder approval and a reviewed rollback plan.
