# Atlas provider activation

Atlas web and iOS code is prepared for Google and Apple authentication. This document records the exact external identifiers needed once the provider accounts issue credentials.

## Production identity

- Current production origin: `https://atlasdemofixed.vercel.app`
- Future legal-entity custom domain: choose and purchase only when organization conversion is funded
- Supabase project ref: `moazrwbalqiyoafrydkj`
- Supabase OAuth callback: `https://moazrwbalqiyoafrydkj.supabase.co/auth/v1/callback`
- Current web callback after provider auth: `https://atlasdemofixed.vercel.app/auth/callback`
- iOS bundle ID: `com.atlasappointments.app`
- Apple Services ID: `com.atlasappointments.app.web`
- Universal Link path: `/join/*`
- In-app display name: `Atlas`
- Recommended App Store listing name: `Atlas Appointments`

Keep the Vercel production origin active throughout the individual-development phase. A custom company domain is not required merely to create Google OAuth clients or to register a Sign in with Apple website subdomain; it becomes important for the later Apple organization-verification/public-release phase.

## Google — web

Create a Google Auth Platform OAuth client of type **Web application**.

Authorized JavaScript origin:
- `https://atlasdemofixed.vercel.app`

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

## Apple — individual development phase

After the founder's real individual Apple Developer Program membership is active, register:

1. App ID / bundle ID: `com.atlasappointments.app`
2. Enable **Sign in with Apple** capability.
3. Enable **Associated Domains** capability.
4. Services ID: `com.atlasappointments.app.web`
5. Associate the Services ID with the App ID.
6. Register the current web domain/subdomain: `atlasdemofixed.vercel.app`.
7. Return URL for Supabase web OAuth: `https://moazrwbalqiyoafrydkj.supabase.co/auth/v1/callback`.
8. Create a Sign in with Apple key and securely retain the `.p8` private key.
9. Record the Apple Team ID / App Identifier Prefix and configure Atlas server environment `ATLAS_APPLE_APP_PREFIX` so the Apple App Site Association file becomes active.

Configure Supabase Auth with the Apple Services ID first in the Client IDs list, followed by the native App ID when both web and native Apple sign-in are active.

The iOS app uses native `AuthenticationServices`, a nonce-bound Apple identity token and Apple's one-time authorization code. Atlas exchanges that authorization code server-side, stores the resulting Apple refresh token in Supabase Vault, and uses it only for Apple authorization revocation when the Atlas account is deleted.

The individual membership is for technical development/TestFlight. Do not submit Atlas publicly as the final healthcare seller identity until the membership has been converted to the verified Atlas legal organization.

## Apple — later organization conversion

After the legal Atlas entity, D-U-N-S record, company-domain website and work email exist, request Apple to convert the founder's membership to an organization. Then:

1. Confirm the organization seller/legal name in App Store Connect.
2. Add the company domain to Sign in with Apple and Associated Domains.
3. Update Atlas public Support/Privacy/Terms contacts to company-domain addresses.
4. Keep existing bundle/service IDs unless Apple requires a change during conversion.
5. Re-test Apple sign-in, account deletion revocation and Universal Links before public submission.

## What Atlas can and cannot automate

Atlas code can validate identifiers, callbacks, native builds, Universal Links, token storage/revocation and provider readiness. Provider-account creation itself cannot be completed without the founder's authenticated Apple/Google account session. Apple enrollment additionally requires the founder's verified identity and payment. No secret keys should be pasted into source control or committed to Git.

Never commit Apple `.p8` keys, generated client secrets, Google client secrets, Supabase management tokens, or signing certificates to Git.
