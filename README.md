# Atlas

Atlas is a mobile-first appointment and reminder workflow for private clinics in Erbil/Kurdistan. The normal daily user is the receptionist.

**Product principle:** open Atlas → see the schedule → perform the task → move on.

Atlas is intentionally **not** an EMR, diagnostic system, treatment tool, hospital-management suite, or general clinic ERP. Do not store diagnoses, treatment plans, clinical notes, or other medical-record content in Atlas.

## What Atlas does

- Day-by-day appointment schedule
- Appointment creation with Iraqi mobile-number normalization
- Doctor assignment and doctor-specific double-booking protection
- 5/10/15/20/30-minute scheduling intervals plus custom times
- Pending, Confirmed, Cancelled, Completed, and No-show states
- Retained appointment history instead of destructive deletion
- Sorani Kurdish, Arabic, and English UI
- Independent reminder language and consent settings
- Appointment-specific patient self-service links
- Clinic membership and role-based authorization
- Tenant isolation enforced at the database layer
- Privacy-conscious audit and reminder workflows
- Synthetic `/demo` workspace for testing without clinic data

## Authentication

Atlas uses a simple clinic-provisioned access model:

1. Existing valid sessions open directly to the dashboard.
2. Prepared devices can use platform passkey authentication.
3. New devices and recovery use a pre-provisioned clinic work email.
4. Atlas does not create accounts from arbitrary sign-in attempts.
5. Explicit logout invalidates the current session.

## Security principles

- Tenant-sensitive data is protected with database row-level security.
- Server-only credentials are never intended for browser code.
- Patient self-service tokens are high-entropy, hashed at rest, expiring, revocable, and rate controlled.
- Audit records avoid unnecessary patient-identifying data.
- Logs should not contain raw patient-link tokens, secrets, medical notes, or unnecessary PII.
- `/demo` uses synthetic data and must remain isolated from production data.
- No healthcare or regulatory compliance claim is made without dedicated validation.

## WhatsApp reminders

WhatsApp integration is deliberately gated behind real external prerequisites. The production default remains disabled until business verification, approved templates, server-side credentials, webhook verification, scheduling, quotas, and end-to-end testing are complete.

The project does not fake successful activation or delivery.

## Pilot philosophy

Atlas is designed to be validated with real receptionist workflows before broad rollout. The project tracks operational questions such as appointment-entry time, scheduling corrections, confirmation rate, cancellations, no-shows, reminder workload, and continued use.

Claims about reducing no-shows or improving clinic outcomes should be based on measured pilot evidence rather than assumptions.

## Development

Typical local verification:

```bash
npm ci
npm run check
npm audit --omit=dev --audit-level=high
```

Browser E2E coverage lives under `e2e/` and uses synthetic data for public development workflows.

## Project status

Atlas is an actively developed product project. Some production integrations remain intentionally disabled or dependent on external configuration and real-world clinic validation.

## License

Atlas is currently published publicly for transparency and review, but **no open-source license has been granted at this time**. All rights remain with the copyright holder.

If Atlas is later released as open source, this section will be replaced with the applicable license.
