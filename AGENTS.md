# Atlas agent instructions

Atlas is clinic SaaS for independent clinics. Optimize for real receptionist usefulness, not feature count.

## Priorities

- Keep the core loop excellent: open Atlas, see today, manage appointments and patients quickly, move on.
- Preserve strict clinic and tenant isolation.
- Prefer small improvements to receptionist workflows, appointments, patient operations, Atlas AI, multilingual usability, mobile/tablet usability, reliability, privacy, accessibility, and security.
- Treat Sorani Kurdish, Iraqi Arabic, English, RTL/LTR behavior, iPhone/iPad, and desktop as first-class.
- Do not expand Atlas into a general EMR or add clinical-record scope without an explicit product decision.
- Do not make clinical decisions or unsupported compliance or clinical-effect claims.

## When asked to continue Atlas development autonomously

1. Inspect current code, tests, and relevant open work before choosing a change.
2. Choose the highest-value safe, bounded improvement aligned with the priorities above.
3. Implement one coherent change at a time and preserve completed behavior unless evidence shows it is wrong.
4. Run relevant verification. At minimum for code changes run `npm run check`; run focused browser E2E when the changed workflow warrants it.
5. Repair failures caused by the change before moving on.
6. Re-review the diff for tenant isolation, privacy, security, multilingual/RTL behavior, mobile usability, and unnecessary scope.
7. Continue to the next safe bounded improvement while useful work and execution time remain. Do not stop merely to ask whether to do more.
8. Keep changes reviewable and report what changed, what was verified, and remaining uncertainty.

## Stop for human authorization

Routine safe Atlas code changes may be merged and deployed when the user has already given standing authorization for autonomous development; do not interrupt the run to re-ask for each ordinary merge or deployment.

Still stop before changing production data, databases, authentication or tenant policies, DNS/domains, Meta/WhatsApp configuration, payments/subscriptions, paid services, or other irreversible/destructive infrastructure unless the user explicitly authorizes that consequential scope. Never use real patient data for testing. Money-related commitments always require explicit approval.

Read-only investigation and a reviewable proposal or branch are allowed without additional approval.

## Engineering discipline

- Production and real-device behavior are runtime truth; tests are evidence, not a substitute for production verification.
- Never weaken authorization, tenant isolation, privacy, or security to make a test pass.
- Never fabricate external integrations, approvals, delivery success, or test results.
- Use synthetic data for tests and demos.
- Keep changes as small as practical and avoid unrelated refactors.
- Respect existing repository conventions and documentation.
