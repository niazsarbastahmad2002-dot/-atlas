# Atlas Project Instructions

## Deployment verification — mandatory

Whenever an Atlas change is deployed to Vercel:

1. Do not report the deployment as ready merely because a deployment was triggered.
2. Wait for the deployment to finish and verify the final Vercel status.
3. Confirm the target deployment is `Ready` and not `Error`, `Canceled`, or otherwise failed.
4. Confirm the production alias points to the intended commit/deployment, not an older successful build.
5. If the deployment fails, inspect the relevant build/deployment logs, diagnose the failure, fix it, and redeploy until the intended production deployment is `Ready` or a genuine external blocker requires user action.
6. Double-check this automatically after every deployment; do not wait for the user to ask whether it succeeded.
7. A green deployment is necessary but is not enough to call a user-visible fix complete. Verify the actual effect that was requested. For UI/visual changes, check the rendered behavior or a deterministic regression that proves the real CSS/layout/interaction path, including cascade/specificity and responsive behavior where relevant.
8. If the requested effect cannot be directly verified, say that the code is deployed but visual/user verification is still pending. Do not say “fixed”, “finished”, or “live and correct” yet.
9. If the deployed page does not visibly match the promised result, treat that as a failed fix even when Vercel is `Ready`; investigate the real cause, correct it, redeploy, and re-verify instead of repeating the same ineffective change.
10. Preserve concurrent Atlas work and avoid rolling back unrelated main-branch changes while correcting a failed effect.

## Cloudflare backup deployment — standing rule

Atlas also has a Cloudflare Workers backup deployment project named `atlas-backup`, connected to the same GitHub repository.

1. Cloudflare builds from the `main` production branch independently of Vercel.
2. The Cloudflare build command is `npm run build`.
3. If Vercel is temporarily rate-limited or otherwise unavailable, do not stop Atlas development solely for that reason. Continue normal GitHub work; Cloudflare can still build/deploy the GitHub changes independently.
4. Do not describe this as Cloudflare detecting a Vercel limit and switching automatically. It is a parallel/independent deployment path.
5. Do not assume user traffic automatically fails over from Vercel to Cloudflare unless routing/DNS failover has been explicitly configured and verified.
6. Treat old failed Cloudflare builds as historical once a newer build succeeds; do not retry them unless specifically needed for diagnosis.
7. Preserve concurrent Atlas work and do not make unrelated production changes while handling Cloudflare deployment issues.

This is a standing Atlas project rule for all future deployment and UI-fix work.
