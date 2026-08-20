# Atlas App Store release

This is the single source of truth for taking Atlas from the production web service to a legitimate iPhone and iPad App Store release. Unknown legal or account values stay marked as gates; they must not be guessed.

## Selected technical identity — before Apple registration

- App Store name draft: **Atlas Appointments**
- Device display name: **Atlas**
- iOS bundle ID: `com.atlasappointments.app`
- Apple Services ID: `com.atlasappointments.app.web`
- Recommended legal/company identity: a distinctive software-company name approved during KRG registration
- Current production: `https://atlasdemofixed.vercel.app`
- Planned canonical domain: `https://atlasappointments.com`
- Optional defensive redirect domain: `https://atlasappointments.app`
- Supabase project: `moazrwbalqiyoafrydkj`

The exact-name sanity search found no prominent healthcare app named **Atlas Appointments**, but it did find small and historical uses of that phrase and many unrelated healthcare products using **Atlas**. This is not trademark clearance. Before company registration or public launch, the founder should obtain a proper local company/name check and, if appropriate, professional trademark advice. Avoid the more collision-prone `Atlas Clinic` identity.

`com.atlasappointments.app` is the selected stable technical identifier. Reconfirm it once immediately before creating the Apple App ID, then do not casually change it: the App Store bundle ID cannot be changed after a build is uploaded.

## Why organization enrollment is a release gate

Apple App Review Guideline 5.1.1(ix) says apps in highly regulated fields, including healthcare, or apps that require sensitive information should be submitted by the legal entity providing the service rather than an individual developer. Atlas should therefore use a legitimate Iraqi/Kurdistan legal entity and truthful local identity information.

Organization enrollment checklist:

- [ ] Register an eligible legal entity with a distinctive approved legal name.
- [ ] Ensure the founder/account holder has legal authority to bind the entity.
- [ ] Confirm the entity's exact legal name, headquarters address and public phone number.
- [ ] Obtain or look up the entity's nine-digit D-U-N-S number. Apple states it is free in most jurisdictions.
- [ ] Purchase and control the company domain.
- [ ] Publish a functional company website on that domain; a parked or minimal registrar page is insufficient.
- [ ] Create a work mailbox on the same domain, preferably `developer@atlasappointments.com`, plus `support@atlasappointments.com` and `privacy@atlasappointments.com` aliases.
- [ ] Create or update the account holder's Apple Account with legal first/last name, the organization email and two-factor authentication.
- [ ] Enroll as **Organization** using truthful Iraqi/Kurdistan entity and address information.
- [ ] Pay Apple's current USD 99 annual fee, or local equivalent, only after Apple accepts the organization details.
- [ ] Record the approved Team ID and App Identifier Prefix without committing credentials.

Apple enrollment starts at `https://developer.apple.com/programs/enroll/`. Payment, identity verification, legal declarations and Apple Account interaction require the founder.

## Atlas code prepared in this branch

- Native SwiftUI shell with persistent `WKWebsiteDataStore.default()` sessions.
- Native Sign in with Apple using `AuthenticationServices` and a nonce-bound identity token.
- Native Apple re-entry on the Atlas login and secure invite screens; embedded-provider OAuth is not run in `WKWebView`.
- One-time Apple authorization-code exchange, Apple subject binding and refresh-token storage in Supabase Vault.
- Apple authorization revocation during in-app account deletion, with a manual Apple fallback notice if revocation is unavailable.
- Owner-safe in-app account deletion with a database-level ownership restriction.
- Secure, single-use receptionist invitation links.
- Universal Link parsing for `/join/<token>` and AASA endpoints that stay disabled until the real Apple prefix is configured.
- Native loading, retry, connection-error and pull-to-refresh states.
- A synthetic-data demo accessible from the native welcome screen; it never writes to Supabase.
- 1024×1024 RGB App Store icon with no alpha channel.
- Branded native launch background and scalable Atlas mark.
- Privacy manifest for the app's UserDefaults use.
- Public Privacy, Terms, Support and Data Deletion pages.
- macOS CI that generates the Xcode project and compiles an iOS Simulator build.

These native features reduce, but do not eliminate, App Review Guideline 4.2 risk. The final signed build must feel responsive on real hardware and must demonstrate the native Apple, Universal Link, persistent-session and error-recovery paths—not merely display a website.

## Environment values after Apple enrollment

Set these only in encrypted deployment configuration; never commit secrets:

- `ATLAS_APPLE_TEAM_ID=<Apple Team ID>`
- `ATLAS_APPLE_APP_PREFIX=<App Identifier Prefix>`
- `ATLAS_APPLE_KEY_ID=<Sign in with Apple key ID>`
- `ATLAS_APPLE_PRIVATE_KEY=<contents of Apple .p8 private key>`
- `ATLAS_IOS_BUNDLE_ID=com.atlasappointments.app`
- `ATLAS_APPLE_WEB_CLIENT_ID=com.atlasappointments.app.web`

After configuring the App Identifier Prefix, verify both endpoints return `application/json`, status 200 and no redirect:

- `https://atlasappointments.com/.well-known/apple-app-site-association`
- `https://atlasdemofixed.vercel.app/.well-known/apple-app-site-association`

## Domain cutover

Only after purchase and legal-name confirmation:

1. Attach `atlasappointments.com` to the existing Atlas Vercel production project.
2. Redirect `atlasappointments.app` to `https://atlasappointments.com` if the defensive domain is purchased.
3. Keep the Vercel domain active through the first native release.
4. Publish a real company homepage plus `/support`, `/privacy`, `/terms` and `/data-deletion`.
5. Activate the domain mailboxes and replace the temporary Gmail address on every public policy/support page.
6. Add the custom domain to Supabase Auth redirect allowlists and the Apple/Google provider consoles.
7. Change the native `atlasBaseURL` only after the canonical domain is serving production reliably.

## App Store Connect metadata draft

- Name: `Atlas Appointments` (18/30 characters)
- Subtitle: `Clinic front desk, made clear` (29/30 characters)
- Primary category: `Medical`
- Secondary category: `Business`
- Bundle ID: `com.atlasappointments.app`
- SKU draft: `ATLAS-IOS-001`
- Privacy Policy URL: `https://atlasappointments.com/privacy`
- Support URL: `https://atlasappointments.com/support`
- Marketing URL: `https://atlasappointments.com`
- Data deletion URL: `https://atlasappointments.com/data-deletion`
- Copyright: `<YEAR> <FINAL LEGAL ENTITY NAME>`

Keyword draft (85/100 characters; do not repeat title, subtitle or category terms):

`scheduling,reception,reminders,doctor,patient,queue,calendar,booking,staff,healthcare`

Description draft:

> Atlas Appointments gives private clinics one calm workspace for the clinic day.
>
> Create a clinic, organize appointments, track confirmations and outcomes, and give front-desk staff secure access without sharing passwords. Clinic owners can invite receptionists with a single-use link tied to the correct clinic and doctor. Returning staff can reopen Atlas quickly with their persistent session or supported device authentication.
>
> Key features:
> - Focused daily appointment schedule and patient queue
> - Fast appointment creation, rescheduling and status updates
> - Secure owner and receptionist access boundaries
> - Single-use receptionist invitation links
> - Reminder workflow and delivery visibility when a production messaging provider is activated
> - English, Sorani Kurdish, Badini Kurdish and Iraqi Arabic interfaces
> - Works across iPhone, iPad and the web
>
> Atlas is scheduling software for clinic staff. It does not provide medical advice, diagnosis, treatment or emergency services.

## App Review notes and access strategy

Use the following as the starting review note, updated with the final build number and live URLs:

> Atlas is clinic scheduling/workflow software, not a medical device, medical-advice service or emergency service. On first launch, tap **Try with sample data** to enter a fully interactive synthetic workspace without an account. Enter any invented clinic name, create invented appointments, and test schedule/status actions. Demo data remains only in that WebView tab and is never written to Supabase.
>
> To review real account creation, return to the first-launch screen and tap **Continue with Apple**. A new authenticated user can create a clinic directly. In Settings, **Invite receptionist** creates a single-use, expiring link bound to the selected clinic and doctor. Universal Links open `/join/<token>` in the installed app. Account deletion is at **Settings → Account & deletion**. A clinic owner must first transfer or permanently delete every owned clinic, preventing accidental clinic deletion; non-owner staff can delete their account directly.
>
> Native iOS functionality includes Sign in with Apple, secure invite Universal Links, persistent web sessions, native provider re-entry, pull-to-refresh and native loading/error recovery. The app does not request HealthKit, Contacts, Photos, camera, microphone or location. Production services and the synthetic demo remain available during review.

No static review password is required while the synthetic demo remains fully accessible. If App Review specifically asks for a pre-provisioned live account, create a dedicated reviewer identity at that time, load only synthetic data, keep it active throughout review, and place credentials solely in App Store Connect review fields—not in source code or public documentation.

## App Privacy questionnaire mapping

Re-verify the final production build and every enabled provider immediately before answering. Conservative working answers:

| Apple category | Atlas data | Linked to identity | Tracking | Purpose |
| --- | --- | --- | --- | --- |
| Contact Info — Name | staff and patient names | Yes | No | App Functionality |
| Contact Info — Email Address | staff authentication/contact | Yes | No | App Functionality, Account Management |
| Contact Info — Phone Number | patient reminder contact | Yes | No | App Functionality |
| Health & Fitness — Health | appointment context, disclosed conservatively even though Atlas prohibits medical notes | Yes | No | App Functionality |
| Identifiers — User ID | Supabase user and clinic-membership identifiers | Yes | No | App Functionality, Security |
| User Content — Other User Content | clinic appointment/workflow records | Yes | No | App Functionality |
| Usage Data — Product Interaction | allow-listed screen, navigation and outcome categories with a random session ID | No | No | Analytics |
| Diagnostics — Other Diagnostic Data | allow-listed error category only; no message or stack trace | No | No | App Functionality, Analytics |

Tracking answer: **No**. Atlas does not use collected data for advertising or link it with third-party data for advertising, advertising measurement or data-broker purposes. If analytics, messaging or SDK behavior changes, update both this table and the public Privacy Policy before submission.

## Age rating assumptions

Expected Apple global rating: **4+**, subject to Apple's questionnaire calculation and regional results.

- Not made for the Kids category.
- No unrestricted web browser; the shell permits Atlas hosts and opens external navigation in the system browser.
- No social feed, broadly distributed user-generated content, in-app chat, advertising, gambling, violence, sexual content, substances or profanity.
- `Medical or Treatment Information`: **None**. Atlas provides no diagnosis, medication, treatment or emergency guidance and explicitly tells clinics not to enter medical notes.
- `Health or Wellness Topics`: **None**. Atlas provides no lifestyle, diet, exercise or self-care recommendations.
- Do not override Apple's calculated rating unless the final legal terms or product behavior requires a higher minimum age.

Apple's current rating system uses 4+, 9+, 13+, 16+ and 18+ on OS version 26 or later and can vary by region. Complete the live questionnaire truthfully; do not copy these assumptions if the feature set changes.

## Export compliance

`ITSAppUsesNonExemptEncryption` is set to `false` in `ios/project.yml`. The current app uses Apple/system networking and authentication encryption and contains no Atlas-implemented proprietary or non-exempt cryptographic product.

Before each release:

- [ ] Confirm no new bundled SDK or custom cryptography changed the answer.
- [ ] Answer App Store Connect's export questions truthfully.
- [ ] If the final build uses only exempt encryption, retain `ITSAppUsesNonExemptEncryption=false` to avoid repeated questions.
- [ ] If Apple requests documentation or the cryptography changes, stop and obtain the required export determination rather than guessing.

## Screenshot production checklist

Atlas targets both iPhone and iPad, so prepare both device families. Apple currently permits 1–10 PNG/JPEG screenshots per device class and localization, with no alpha/transparency.

- [ ] iPhone 6.9-inch portrait master: `1320 × 2868` pixels (also accepted: `1260 × 2736` or `1290 × 2796`).
- [ ] iPad 13-inch portrait master: `2064 × 2752` pixels (also accepted: `2048 × 2732`).
- [ ] Capture from the final signed build or simulator using only invented clinic/patient data.
- [ ] Keep status bars, language, dates and app state consistent within each localized set.
- [ ] Do not use the login or splash screen as the primary screenshot; show the app in use.
- [ ] Remove debugging UI, sandbox phone numbers, personal email addresses and real patient data.
- [ ] Check every export is opaque RGB with no alpha channel.

Recommended first six frames for English, then localize deliberately for Kurdish/Arabic storefronts when translation quality is approved:

1. Today's clinic schedule — calm daily overview.
2. Add an appointment — fast front-desk entry.
3. Patient queue and statuses — confirmations, completion and no-show flow.
4. Secure receptionist invite — single-use access without shared passwords.
5. Reminder settings — clearly label that production delivery depends on clinic/provider activation.
6. Account and privacy controls — staff access and in-app account deletion.

## TestFlight and release checklist

Build readiness:

- [ ] Organization membership, agreements and App Store Connect access are active.
- [ ] App ID, Services ID, Sign in with Apple key and provisioning profile use the fixed identifiers above.
- [ ] Associated Domains and Sign in with Apple capabilities are present in the signed entitlements.
- [ ] Production Apple credentials are stored only in Supabase/Vercel secrets and real Apple sign-in succeeds.
- [ ] Custom domain, professional email and public legal/support pages are live.
- [ ] `npm run check`, web CI and iOS CI are green at the release commit.
- [ ] Archive with the current required Xcode/iOS SDK and validate the archive in Xcode Organizer.
- [ ] Increment `CURRENT_PROJECT_VERSION` for every upload and set the intended `MARKETING_VERSION`.

TestFlight verification on at least one real iPhone and one representative iPad:

- [ ] Fresh install → native welcome → synthetic demo.
- [ ] Fresh Apple identity → native Apple auth → create clinic.
- [ ] Relaunch → persistent session → dashboard without redundant sign-in.
- [ ] Expired/signed-out session → native Apple re-entry on login.
- [ ] Owner creates receptionist invite → link opens installed app → separate identity joins correct clinic/doctor.
- [ ] Invalid, used and expired invite states are clear and safe.
- [ ] Receptionist deletes account in app and is returned to signed-out state.
- [ ] Owner deletion is blocked while clinics are owned; deleting/transferring owned clinics unlocks account deletion.
- [ ] Apple authorization is revoked during deletion, or the explicit manual-revocation fallback appears.
- [ ] Pull-to-refresh, offline/connection failure, retry, keyboard, Dynamic Type, rotation and back gestures behave acceptably.
- [ ] No HealthKit/Contacts/Photos/camera/microphone/location prompt appears.
- [ ] AASA files return 200 JSON without redirects and Universal Links work outside Safari's same-domain navigation behavior.
- [ ] No real reminder is sent; WhatsApp remains disabled until a real +964 sender and approved templates exist.

Submission:

- [ ] Metadata, description, keywords, screenshots and privacy answers match the tested build.
- [ ] Age rating questionnaire is complete and not Unrated.
- [ ] Export compliance answer is complete.
- [ ] Final legal entity, copyright, support contact and reviewer contact are accurate.
- [ ] Review notes include demo instructions and every non-obvious workflow.
- [ ] Backend and synthetic demo stay available throughout review.
- [ ] Select manual release for version 1.0 so approval does not publish before the production gate is rechecked.

## Final production gate

Do not submit until every item below is true:

- Organization enrollment is approved under the actual legal entity.
- Domain and company mailboxes are controlled by that entity.
- Apple identifiers, signing and production provider credentials are configured and tested.
- Account deletion and Apple revocation pass on a real Apple test identity.
- Universal Link invitation passes on the signed installed app.
- Privacy/Terms/Support/Data Deletion pages use the final legal entity and domain email.
- App Store privacy disclosures match production analytics, authentication and messaging behavior.
- TestFlight passes on real iPhone/iPad hardware.
- WhatsApp is still represented as inactive until a real +964 production sender and approved templates exist.

## Current Apple references

- App Review Guidelines: `https://developer.apple.com/app-store/review/guidelines/`
- Organization enrollment: `https://developer.apple.com/help/account/membership/program-enrollment/`
- Program membership and fee: `https://developer.apple.com/support/compare-memberships/`
- Product-page metadata: `https://developer.apple.com/app-store/product-page/`
- Screenshot specifications: `https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/`
- Age-rating definitions: `https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/`
- Export compliance: `https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/`
- In-app account deletion: `https://developer.apple.com/support/offering-account-deletion-in-your-app/`
