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

Do not merge or deploy, modify production data or infrastructure, change authentication or tenant policies, change Meta/WhatsApp configuration, change payments, use real patient data, add a paid recurring service, or make irreversible/destructive changes without explicit human authorization.

Read-only investigation and a reviewable proposal or branch are allowed.

## Engineering discipline

- Production and real-device behavior are runtime truth; tests are evidence, not a substitute for production verification.
- Never weaken authorization, tenant isolation, privacy, or security to make a test pass.
- Never fabricate external integrations, approvals, delivery success, or test results.
- Use synthetic data for tests and demos.
- Keep changes as small as practical and avoid unrelated refactors.
- Respect existing repository conventions and documentation.
