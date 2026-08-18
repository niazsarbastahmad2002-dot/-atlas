# Atlas production deployment

Atlas production deploys are built on GitHub Actions and uploaded to Vercel as prebuilt output.

This avoids consuming Vercel's remote-build quota for every Atlas source change while keeping Vercel as the production host.

Production flow:

1. Merge an Atlas pull request into `main`.
2. GitHub Actions checks out `main` and pulls the production Vercel settings.
3. GitHub Actions builds Atlas outside Vercel.
4. The resulting prebuilt output is deployed to Vercel production.

Automatic Vercel Git builds are disabled in `vercel.json` so this pipeline is the single production deployment path.
