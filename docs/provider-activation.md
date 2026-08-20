# Atlas provider activation

Atlas web and iOS code is prepared for Google and Apple authentication. This document records the exact external identifiers needed once the provider accounts issue credentials.

## Production identity

- Current production origin: `https://atlasdemofixed.vercel.app`
- Planned canonical company/app domain: `https://atlasappointments.com`
- Planned defensive app domain: `https://atlasappointments.app`
- Supabase project ref: `moazrwbalqiyoafrydkj`
- Supabase OAuth callback: `https://moazrwbalqiyoafrydkj.supabase.co/auth/v1/callback`
- Current web callback after provider auth: `https://atlasdemofixed.vercel.app/auth/callback`
- iOS bundle ID: `com.atlasappointments.app`
- Apple Services ID: `com.atlasappointments.app.web`
- Universal Link path: `/join/*`
- App Store display name: `Atlas`

Do not replace production URLs with the custom domain until that domain is purchased, attached to Vercel, verified, and serving Atlas over HTTPS.

## Google — web

Create a Google Auth Platform OAuth client of type **Web application**.

Authorized JavaScript origins:
- `https://atlasdemofixed.vercel.app`
- `https://atlasappointments.com` after the domain is live and verified

Authorized redirect URI:
- `https://moazrwbalqiyoafrydkj.supabase.co/auth/v1/callback`

Use only the basic OpenID Connect identity scopes (`openid`, `email`, `profile`). Store the resulting client secret outside the repository.

Then configure Supabase Auth with:
- `external_google_enabled=true`
- `external_google_client_id=<issued web client id>`
- `external_google_secret=<issued web client secret>`

Atlas web detects the enabled provider automatically; no Vercel feature flag is required.

## Google — native iOS

Google blocks OAuth authorization inside `WKWebView`. When the Google Cloud project exists, create an additional OAuth client of type **iOS** for bundle ID:

- `com.atlasappointments.app`

Use the official Google Sign-In for iOS SDK (or another system-browser native OAuth flow) rather than embedded web authorization. Until that native client ID is issued and configured, Atlas iOS intentionally suppresses the Google button inside its embedded web shell. Apple, passkey, and email flows remain available.

## Apple

Enroll the legal Atlas entity in the Apple Developer Program. Register:

1. App ID / bundle ID: `com.atlasappointments.app`
2. Enable **Sign in with Apple** capability.
3. Enable **Associated Domains** capability.
4. Services ID: `com.atlasappointments.app.web`
5. Associate the Services ID with the App ID.
6. Website domain: `atlasappointments.com` after purchase and production attachment.
7. Return URL for Supabase web OAuth: `https://moazrwbalqiyoafrydkj.supabase.co/auth/v1/callback`
8. Create a Sign in with Apple key and securely retain the `.p8` private key.
9. Record the Apple Team ID / App Identifier Prefix and configure Atlas server environment `ATLAS_APPLE_APP_PREFIX` so the Apple App Site Association file becomes active.

Configure Supabase Auth with the Apple Services ID first in the Client IDs list, followed by the native App ID when both web and native Apple sign-in are active.

The iOS app uses native `AuthenticationServices` and a nonce-bound Apple identity token. It sends only the short-lived identity token, nonce, optional first-login name, and a validated Atlas destination to `/auth/native`, where Supabase creates the web session. Invite destinations are restricted to `/join/<43-character-token>/finish`.

Never commit Apple `.p8` keys, generated client secrets, Google client secrets, Supabase management tokens, or signing certificates to Git.
