# Atlas Supabase Migration History

## Important source-history note

The production database predates complete migration-file capture in this GitHub repository. Supabase currently records 26 migrations, while the repository contains SQL files only for the most recent migrations that were recovered or created during the current source-control hardening work.

**Do not invent or backfill historical SQL from migration names alone.** A migration name proves that a migration was recorded, not the exact SQL that ran.

For the current application contract, use together:

- the live production database
- `lib/database.types.ts`, regenerated from production
- the checked-in recent forward migrations
- the security/tenant regression tests
- the Atlas README and pilot runbook

If Atlas later needs reproducible creation of a brand-new Supabase project, create and validate an explicit current-schema baseline rather than pretending the missing historical migration bodies are known.

## Production migration ledger

Recorded in production, oldest first:

| Version | Name | SQL file in repository? |
|---|---|---|
| 20260809125010 | atlas_auth_rls_hardening | No — historical SQL not captured |
| 20260809160831 | harden_tenant_security | No — historical SQL not captured |
| 20260812152430 | atlas_pilot_hardening | No — historical SQL not captured |
| 20260812152754 | fix_reminder_template_constraints | No — historical SQL not captured |
| 20260812153251 | index_reminder_delivery_events_clinic | No — historical SQL not captured |
| 20260812160017 | harden_whatsapp_activation_and_races | No — historical SQL not captured |
| 20260812160246 | document_pending_event_rls_policy | No — historical SQL not captured |
| 20260812160351 | serialize_whatsapp_global_quota | No — historical SQL not captured |
| 20260813110954 | complete_atlas_pilot_mvp | No — historical SQL not captured |
| 20260813112740 | reset_reminder_approval_on_template_change | No — historical SQL not captured |
| 20260813113751 | enforce_appointment_outcome_timing | No — historical SQL not captured |
| 20260813113838 | enable_private_patient_rls | No — historical SQL not captured |
| 20260813113921 | restrict_clinic_hard_delete | No — historical SQL not captured |
| 20260813114019 | bound_patient_link_rate_limit_storage | No — historical SQL not captured |
| 20260813114303 | bind_rls_to_trusted_auth_sessions | No — historical SQL not captured |
| 20260813114404 | close_legacy_session_bootstrap | No — historical SQL not captured |
| 20260813114512 | revoke_current_trusted_device | No — historical SQL not captured |
| 20260813115011 | require_device_proof_for_rls | No — historical SQL not captured |
| 20260813115015 | harden_reminder_claim_serialization | No — historical SQL not captured |
| 20260813115021 | rebuild_all_revision_reminders | No — historical SQL not captured |
| 20260813115211 | close_patient_past_cancellation | No — historical SQL not captured |
| 20260813120317 | advisor_indexes_and_private_deny | No — historical SQL not captured |
| 20260815015730 | prevent_double_booked_doctor_slots | Yes |
| 20260815212139 | staff_onboarding_codes | Yes |
| 20260815234332 | auth_cleanup_prepare_security | Yes |
| 20260816193416 | drop_legacy_patient_token_rpc | Yes |

## Current migration discipline

For every production schema/security change from now on:

1. Make the smallest forward-only change needed.
2. Apply it to Supabase using a named migration.
3. Read the exact migration version recorded by production.
4. Mirror the exact SQL into `supabase/migrations/<version>_<name>.sql`.
5. Regenerate `lib/database.types.ts` from production.
6. Run TypeScript, unit/security tests, production build, dependency audit, and browser smoke tests.
7. Re-run Supabase security/performance advisors after DDL/security changes.
8. Run the tenant-isolation SQL smoke test when authorization/RLS behavior changes.
9. Deploy application/database changes in a compatibility-safe order when one depends on the other.
10. Verify the canonical production site and review runtime/auth logs after rollout.

## Current security checkpoint — 2026-08-16

After migration `20260816193416_drop_legacy_patient_token_rpc`:

- the retired signed-in `create_patient_access_token(uuid, text, timestamptz)` RPC is absent
- `create_patient_access_token_server(uuid, uuid, text, timestamptz)` remains present
- `anon` cannot execute the server RPC
- `authenticated` cannot execute the server RPC
- `service_role` can execute the server RPC
- the Supabase security advisor no longer reports the authenticated SECURITY DEFINER patient-token warning

The remaining Supabase security-advisor warning is the project-level leaked-password-protection setting. Atlas's current login model is passkey-first with magic-link recovery rather than password login, but the warning should still be reviewed if password authentication is ever enabled.
