# Atlas production deployment

Atlas keeps the normal Vercel Git deployment path as the default production route.

A second GitHub Actions workflow can build Atlas outside Vercel and upload prebuilt output to Vercel. This is a documented fallback for periods when Vercel's remote-build quota is temporarily exhausted.

Fallback flow:

1. Run the `Atlas prebuilt production deploy` GitHub Actions workflow.
2. GitHub Actions checks out `main` and pulls the production Vercel settings.
3. GitHub Actions builds Atlas outside Vercel.
4. The resulting prebuilt output is deployed to Vercel production.

Automatic Vercel Git builds remain enabled so Atlas still deploys normally when the Vercel build quota is available.
