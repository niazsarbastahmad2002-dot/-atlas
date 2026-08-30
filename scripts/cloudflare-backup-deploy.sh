#!/usr/bin/env bash
set -euo pipefail

# Cloudflare backup deployment for Atlas.
# Vercel remains the primary host; this script builds an isolated Workers copy.
# No secrets are stored in the repository. Configure them in Cloudflare.

npm ci
npm install --no-save --package-lock=false @opennextjs/cloudflare@latest wrangler@latest
npx opennextjs-cloudflare build
npx wrangler deploy
