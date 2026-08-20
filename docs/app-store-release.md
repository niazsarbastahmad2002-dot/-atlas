# Atlas App Store release

This is the single source of truth for taking Atlas from production web app to a legitimate App Store release.

## Fixed product identity

- App display name: **Atlas**
- Future legal/company identity: a distinctive Atlas software company name approved by KRG registration (avoid `Atlas Clinic` because existing healthcare products already use that name)
- iOS bundle ID: `com.atlasappointments.app`
- Apple Services ID: `com.atlasappointments.app.web`
- Current production: `https://atlasdemofixed.vercel.app`
- Future canonical domain candidate: choose only after legal-entity formation
- Supabase project: `moazrwbalqiyoafrydkj`

Do not change the bundle ID after Apple/App Store Connect registration unless there is a compelling reason. Bundle identity is much harder to change after release than product copy.

## Budget-safe release path

Atlas currently has a hard founder spending ceiling of **USD 100** for this phase. Do not purchase a custom domain or pay company-registration costs from that budget before the native app is technically validated.

Recommended sequence:

1. Finish and validate all zero-cost Atlas engineering and CI work.
2. If Apple's checkout total is within the USD 100 ceiling, enroll the founder in the Apple Developer Program as an **individual** for development, signing, Sign in with Apple credentials, device testing and TestFlight. Apple's published annual fee is USD 99, but the founder must stop if Apple's actual local-currency/tax/payment checkout exceeds the USD 100 cap.
3. Use the existing `atlasdemofixed.vercel.app` production host for web/provider testing while the product is still in the individual-development phase. Apple supports registering domains and subdomains for Sign in with Apple web configuration.
4. Later, when Atlas can fund legal formation, register a KRG legal entity, obtain its D-U-N-S number, establish its company-domain website/work email, and request Apple to convert the founder's individual membership to an **organization** membership.
5. Submit the public healthcare App Store release only after organization conversion. Apple App Review guidance says apps requiring sensitive information or providing services in highly regulated fields such as healthcare should be submitted by the legal entity providing the service rather than an individual developer.

This sequence preserves the value of the USD 99 Apple membership: Apple supports converting an individual founder/cofounder membership to an organization later after legal-entity verification.

## External identity/payment gates

These cannot be truthfully automated by Atlas code because they require the founder/legal representative to provide verified identity, authority or payment details.

### Phase 1 — individual development membership

1. Use the founder's real Apple Account with two-factor authentication and legal identity information.
2. Purchase the Apple Developer Program membership only if Apple's displayed final checkout total stays within the USD 100 cap.
3. Register the App ID, Services ID and Sign in with Apple key described in `docs/provider-activation.md`.
4. Do not represent the individual membership as the final healthcare seller identity and do not submit the public release yet.

### Phase 2 — organization conversion before public healthcare release

1. Register a legal company through the Kurdistan Region business-registration process using a distinctive approved legal name.
2. Purchase and control a company domain at that stage and configure a company-domain work mailbox.
3. Request/confirm the legal entity's D-U-N-S number.
4. Request Apple to convert the founder's individual membership to the legal organization's membership.
5. Re-verify seller name, company domain, support contact and App Store Connect agreements before public submission.

Never invent another country, address, entity name or D-U-N-S identity.

## Atlas code already prepared

- Native SwiftUI app shell.
- Native Sign in with Apple using `AuthenticationServices`.
- Nonce binding for Apple ID-token authentication.
- One-time Apple authorization-code exchange on Atlas server.
- Apple refresh-token storage in Supabase Vault for later authorization revocation.
- Two-phase account deletion that preserves Apple revocation credentials until Atlas account deletion succeeds.
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
- Dedicated macOS/Xcode CI that compiles the generated iOS project for the simulator.

## Environment values after Apple enrollment

Set these only in secure server/deployment configuration; never commit secrets:

- `ATLAS_APPLE_TEAM_ID=<Apple Team ID>`
- `ATLAS_APPLE_APP_PREFIX=<App Identifier Prefix>`
- `ATLAS_APPLE_KEY_ID=<Sign in with Apple key ID>`
- `ATLAS_APPLE_PRIVATE_KEY=<contents of Apple .p8 private key>`
- `ATLAS_IOS_BUNDLE_ID=com.atlasappointments.app`
- `ATLAS_APPLE_WEB_CLIENT_ID=com.atlasappointments.app.web`

During the individual-development phase, the existing Vercel host can be used for association/provider testing. After setting the App Identifier Prefix, verify this URL returns a valid JSON association file with no redirect:

- `https://atlasdemofixed.vercel.app/.well-known/apple-app-site-association`

After a future custom-domain cutover, verify the equivalent path on the final domain too.

## Future custom-domain cutover

Only after legal-entity funding is available:

1. Choose and purchase the final Atlas company domain after checking current availability and naming conflicts again.
2. Attach it to the existing Atlas Vercel production project.
3. Keep the Vercel domain active as a fallback during the first release.
4. Configure the company-domain mailbox.
5. Update the public Support/Privacy/Terms contact email from the temporary Gmail address to the company-domain address.
6. Add the custom domain to Supabase Auth redirect allowlists and provider consoles before switching OAuth redirects or the native base URL.

## App Store Connect metadata draft

- Name: `Atlas`
- Subtitle: `Clinic appointments made clear`
- Primary category: `Medical`
- Secondary category: `Business`
- Current development Privacy Policy URL: `https://atlasdemofixed.vercel.app/privacy`
- Current development Support URL: `https://atlasdemofixed.vercel.app/support`
- Current development Marketing URL: `https://atlasdemofixed.vercel.app`
- Current development Data deletion information: `https://atlasdemofixed.vercel.app/data-deletion`

Switch these to the legal entity's custom domain before the public healthcare App Store submission.

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

## TestFlight gate — individual membership phase

Do not upload the first TestFlight build until all are true:

- Paid Apple Developer membership is active.
- App ID and provisioning profile include Sign in with Apple and Associated Domains.
- Apple provider credentials are configured in secure deployment settings.
- Native Apple sign-in stores a revocation token successfully.
- Account deletion revokes Apple authorization in a real test account.
- Universal Link receptionist invitation opens the installed app and redeems correctly.
- Production web CI and iOS compile checks are green.

## Public App Store gate — organization phase

Do not submit the healthcare app publicly until all are true:

- Apple membership has been converted to the verified Atlas legal organization.
- Seller/legal entity identity is correct in App Store Connect.
- Company domain and work mailbox are live.
- Privacy/Terms/Support/Data Deletion URLs are public on that company domain.
- Apple and Google provider credentials are configured and tested as applicable.
- App Store privacy answers match actual production behavior.
- TestFlight build is exercised on at least one real iPhone before review submission.
