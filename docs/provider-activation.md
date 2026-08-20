# Atlas provider activation

Atlas web and iOS code is already prepared for Google and Apple authentication. This document records the exact external identifiers needed once the provider accounts issue credentials.

## Production identity

- Production origin: `https://atlasdemofixed.vercel.app`
- Supabase project ref: `moazrwbalqiyoafrydkj`
- Supabase OAuth callback: `https://moazrwbalqiyoafrydkj.supabase.co/auth/v1/callback`
- Web callback after provider auth: `https://atlasdemofixed.vercel.app/auth/callback`
- iOS bundle ID: `com.atlasclinic.app`
- Recommended Apple Services ID: `com.atlasclinic.app.web`

## Google

Create a Google Auth Platform OAuth client of type **Web application**.

Authorized JavaScript origin:
- `https://atlasdemofixed.vercel.app`

Authorized redirect URI:
- `https://moazrwbalqiyoafrydkj.supabase.co/auth/v1/callback`

Use only the basic OpenID Connect identity scopes (`openid`, `email`, `profile`). Store the resulting client secret outside the repository.

Then configure Supabase Auth with:
- `external_google_enabled=true`
- `external_google_client_id=<issued client id>`
- `external_google_secret=<issued client secret>`

Atlas detects the enabled provider automatically; no Vercel feature flag is required.

## Apple

Enroll the legal Atlas entity in the Apple Developer Program. Register:

1. App ID / bundle ID: `com.atlasclinic.app`
2. Enable **Sign in with Apple** capability.
3. Services ID: `com.atlasclinic.app.web`
4. Associate the Services ID with the App ID.
5. Website domain: use the final Atlas custom domain once purchased and attached to production.
6. Return URL for Supabase web OAuth: `https://moazrwbalqiyoafrydkj.supabase.co/auth/v1/callback`
7. Create a Sign in with Apple key and securely retain the `.p8` private key.

Configure Supabase Auth with the Apple Services ID first in the Client IDs list, followed by the native App ID when both web and native Apple sign-in are active.

Never commit Apple `.p8` keys, generated client secrets, Google client secrets, or Supabase management tokens to Git.
