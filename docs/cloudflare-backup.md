# Atlas Cloudflare Backup

Vercel remains the primary Atlas host. Cloudflare Workers is an isolated fallback deployment target.

## Worker

- Worker name: `atlas-cloudflare-backup`
- Git branch during validation: `infra/cloudflare-backup`
- Runtime: Cloudflare Workers via OpenNext
- Production traffic must not be switched until the Workers copy passes smoke tests.

## Cloudflare Workers Builds settings

Build command:

```bash
npm ci && npm install --no-save --package-lock=false @opennextjs/cloudflare@latest wrangler@latest && npx opennextjs-cloudflare build
```

Deploy command:

```bash
npx wrangler deploy
```

The repository contains `wrangler.jsonc` and `open-next.config.ts` for this backup target.

## Environment variables

Configure Atlas environment values in Cloudflare Workers settings. Do not commit secret values.

At minimum the backup must receive the same required production-safe application configuration used by Atlas, including the Supabase public configuration and any server-side values required by the routes being exercised. Use `.env.example` as the names-only reference.

Never place Supabase secret/service-role keys, Meta/WhatsApp access tokens, Apple private keys, cron secrets, or other credentials in GitHub.

## Validation order

1. Deploy to the generated `workers.dev` URL only.
2. Verify public pages and authentication UI.
3. Verify server-side Supabase access without writing test data to production.
4. Verify an authenticated read-only clinic flow.
5. Only after validation, consider adding a controlled custom backup domain/failover rule.

The normal Vercel deployment remains unchanged throughout validation.
