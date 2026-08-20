# Atlas App Store release

This is the single source of truth for taking Atlas from production web app to a legitimate App Store release.

## Fixed product identity

- App display name: **Atlas**
- Recommended legal/company identity: a distinctive Atlas software company name approved by KRG registration (avoid `Atlas Clinic` because existing healthcare products already use that name)
- iOS bundle ID: `com.atlasappointments.app`
- Apple Services ID: `com.atlasappointments.app.web`
- Current production: `https://atlasdemofixed.vercel.app`
- Planned canonical domain: `https://atlasappointments.com`
- Planned defensive redirect domain: `https://atlasappointments.app`
- Supabase project: `moazrwbalqiyoafrydkj`

Do not change the bundle ID after Apple/App Store Connect registration unless there is a compelling reason. Bundle identity is much harder to change after release than product copy.

## External legal/account gates

These cannot be truthfully automated by Atlas code because they require the founder/legal representative to provide verified identity, authority and payment details.

1. Register a legal company through the Kurdistan Region business-registration process using a distinctive approved legal name.
2. Purchase and control `atlasappointments.com` (recommended) and optionally `atlasappointments.app` defensively.
3. Configure a working company-domain mailbox before Apple organization enrollment, for example `developer@atlasappointments.com` or `support@atlasappointments.com`.
4. Request/confirm the legal entity's D-U-N-S number.
5. Enroll the legal entity in the Apple Developer Program as an **Organization**, not by inventing another country or address.
6. Create the Apple App ID, Services ID and Sign in with Apple key described in `docs/provider-activation.md`.
7. Create Google web and iOS OAuth client IDs in one Google Cloud project when Google sign-in is activated.

## Atlas code already prepared

- Native SwiftUI app shell.
- Native Sign in with Apple using `AuthenticationServices`.
- Nonce binding for Apple ID-token authentication.
- One-time Apple authorization-code exchange on Atlas server.
- Apple refresh-token storage in Supabase Vault for later authorization revocation.
- In-app Atlas account deletion.
- Automatic Apple token revocation during account deletion, with Apple's manual-revocation fallback if the provider cannot be reached.
- Database-level prevention of deleting an auth user who still owns a clinic.
- Secure receptionist invitation links.
- Universal Link routing for `/join/*`.
- Apple App Site Association endpoint, activated only after the real Apple App Identifier Prefix/Team ID is configured.
- Persistent `WKWebView` data store for Atlas sessions.
- Embedded iOS shell identification so Google OAuth is not attempted inside `WKWebView`.
- App Store 1024×1024 icon asset.
- `PrivacyInfo.xcprivacy` with the approved app-only UserDefaults reason.
- Public Privacy, Terms, Support and Data Deletion URLs.

## Environment values after Apple enrollment

Set these only in secure server/deployment configuration; never commit secrets:

- `ATLAS_APPLE_TEAM_ID=<Apple Team ID>`
- `ATLAS_APPLE_APP_PREFIX=<App Identifier Prefix>`
- `ATLAS_APPLE_KEY_ID=<Sign in with Apple key ID>`
- `ATLAS_APPLE_PRIVATE_KEY=<contents of Apple .p8 private key>`
- `ATLAS_IOS_BUNDLE_ID=com.atlasappointments.app`
- `ATLAS_APPLE_WEB_CLIENT_ID=com.atlasappointments.app.web`

After setting the App Identifier Prefix, verify both URLs return a valid JSON association file with no redirect:

- `https://atlasappointments.com/.well-known/apple-app-site-association`
- `https://atlasdemofixed.vercel.app/.well-known/apple-app-site-association`

## Custom domain cutover

Only after purchase:

1. Attach `atlasappointments.com` to the existing Atlas Vercel production project.
2. Redirect `atlasappointments.app` to `https://atlasappointments.com` if purchased.
3. Keep the Vercel domain active as a fallback during the first release.
4. Configure the company-domain mailbox.
5. Update the public Support/Privacy/Terms contact email from the temporary Gmail address to the company-domain address.
6. Add the custom domain to Supabase Auth redirect allowlists and provider consoles before switching OAuth redirects or the native base URL.

## App Store Connect metadata draft

- Name: `Atlas`
- Subtitle: `Clinic appointments made clear`
- Primary category: `Medical`
- Secondary category: `Business`
- Privacy Policy URL: `https://atlasappointments.com/privacy`
- Support URL: `https://atlasappointments.com/support`
- Marketing URL: `https://atlasappointments.com`
- Data deletion information: `https://atlasappointments.com/data-deletion`

Draft description:

> Atlas gives private clinics one focused workspace for appointments, front-desk access, patient queues and reminder workflows. Clinic administrators can create a clinic, invite reception staff securely, assign staff to a doctor, and manage the clinic day from iPhone, iPad or the web. Receptionists can join from a secure one-use clinic invitation and return quickly with supported device authentication.

App Review notes should explain:

- Atlas is clinic workflow software, not medical advice, diagnosis, treatment, or an emergency service.
- The reviewer can use Sign in with Apple to create a fresh test clinic and exercise the product with synthetic data.
- Receptionist invite links are single-use and expire.
- Account deletion is inside `Settings → Account & deletion`.
- A clinic owner must transfer or delete owned clinics before deleting the owner account to prevent accidental clinic destruction.
- Atlas does not request HealthKit, Contacts, Photos, camera, microphone or location for its core flow.

## App Privacy questionnaire — conservative starting point

Confirm against the final production build immediately before submission. Atlas should not under-disclose. Likely categories include:

- Contact Info: name, email address, phone number.
- Identifiers: user/account identifier.
- Health: clinic appointment context may be considered health/medical information and should be treated conservatively.
- User Content / Other Data: clinic-entered appointment and workflow information where applicable.
- Usage Data: only if the final analytics implementation is enabled and linked as defined by Apple's questionnaire.
- Diagnostics: only if the final production app collects crash/performance diagnostics.

Tracking: **No**, unless the production behavior changes. Atlas must not use clinic or patient data for advertising or cross-company tracking.

## Final pre-submission gate

Do not submit until all are true:

- Organization enrollment is approved.
- App ID and provisioning profile include Sign in with Apple and Associated Domains.
- Domain and company mailbox are live.
- Apple and Google provider credentials are configured and tested as applicable.
- Native Apple sign-in stores a revocation token successfully.
- Account deletion revokes Apple authorization in a real test account.
- Universal Link receptionist invitation opens the installed app and redeems correctly.
- Privacy/Terms/Support/Data Deletion URLs are public on the final domain.
- App Store privacy answers match actual production behavior.
- Production web CI and iOS archive/build checks are green.
- TestFlight build is exercised on at least one real iPhone before review submission.
