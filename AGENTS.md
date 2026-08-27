# Atlas Project Instructions

## Deployment verification — mandatory

Whenever an Atlas change is deployed to Vercel:

1. Do not report the deployment as ready merely because a deployment was triggered.
2. Wait for the deployment to finish and verify the final Vercel status.
3. Confirm the target deployment is `Ready` and not `Error`, `Canceled`, or otherwise failed.
4. If the deployment fails, inspect the relevant build/deployment logs and diagnose the failure before reporting success.
5. Double-check this automatically after every deployment; do not wait for the user to ask whether it succeeded.
6. Only tell the user that the deployment is ready after the final status has been verified.

This is a standing Atlas project rule for future deployment work.
