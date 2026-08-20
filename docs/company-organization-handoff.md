# Atlas legal company → Apple organization handoff

This file is the founder handoff for the external legal/account steps that Atlas code cannot truthfully perform. Never guess a company name, registration number, address, phone, D-U-N-S number, Apple Team ID, or provider secret.

## 1. KRG company registration

Use the official Kurdistan Regional Government business-registration process with the founder's real Iraqi/Kurdistan identity.

Working first-choice name: **Atlas Appointments Technologies**, subject to official name approval and proper trademark/name review.

### Recommended legal form

For a solo founder, the current KRG company-type guide makes a **Private Limited Company** the preferred Atlas starting point, subject to confirmation by the registrar/lawyer handling the incorporation. KRG states that a Private Limited Company can have **1–25 shareholders** and may use an invented name. By contrast, KRG's Individual Project Company has one shareholder but its company name is based on the owner's personal full name. Atlas needs a genuine legal-entity path for Apple organization enrollment, not a sole-proprietor-style workaround.

Do not translate, abbreviate, or append a legal-form suffix to the final company name by guesswork. Use exactly the English and local-language legal names printed on the registration certificate.

Current official KRG service requirements checked 21 August 2026 include:

- company capital of at least **1,000,000 IQD**, supported by confirmation from an authorized public/private bank;
- a headquarters and visible address;
- legally eligible owner who is not a public-sector employee;
- Authorized Manager / UPN requirements;
- incorporation agreement and identity/company documents as applicable;
- bank confirmation of deposited company capital;
- stated service time of **3–10 days**.

The official KRG pages currently expose overlapping fee schedules for company/trade-name registration and Authorized Manager steps. Do not assume a manually summed total is the final amount; recheck the live portal/registrar immediately before payment. Lawyer, accountant, bank, tax, office, translation, notarization and incidental costs are separate.

Official resources:

- Service overview: https://services.gov.krd/en/service/moti-01-en
- Business registration portal: https://business.digital.gov.krd/
- Local-company registration guide: https://business.digital.gov.krd/en/guidelines/local-company
- Local company types: https://business.digital.gov.krd/en/guidelines/local-company-types

### Registration sequence

The KRG service describes this sequence:

1. reserve/register the company trade name and enter the company information in the electronic business-registration system;
2. receive the incorporation contract by email;
3. take the contract to an authorized bank and obtain the required capital-deposit confirmation;
4. present original documents for verification against the electronic submission;
5. pay the applicable government fees and receive the original company registration certificate;
6. after the company certificate and Authorized Manager appointment, complete the required lawyer/accountant, tax and related registration follow-up identified by the Directorate of Companies.

## 2. Safe information to return to Atlas engineering

After registration, provide only:

- exact approved legal entity name in English;
- exact official local-language legal entity name;
- company registration/certificate number;
- registered public business address;
- public business phone;
- confirmation that the founder is the owner/founder or otherwise authorized to bind the entity;
- domains actually purchased.

Do **not** send identity documents, national-card images, passports, bank records, card details, tax credentials, Apple Account passwords, D&B credentials or notarized documents in chat.

## 3. Domain and company mailboxes

Preferred canonical domain if still available and purchased by the founder:

- `atlasappointments.com`

Optional defensive redirect:

- `atlasappointments.app`

After domain ownership is confirmed:

1. attach the canonical domain to the existing Atlas Vercel production project;
2. publish the existing functional Atlas homepage plus `/support`, `/privacy`, `/terms` and `/data-deletion` there;
3. create `developer@atlasappointments.com` and `support@atlasappointments.com`, with `privacy@atlasappointments.com` as a mailbox or alias;
4. update the secure deployment configuration listed below;
5. keep `atlasdemofixed.vercel.app` active during migration and the first native release.

## 4. Public company profile deployment values

Only set these after comparing every value with the final registration certificate and public business contact details:

- `ATLAS_LEGAL_ENTITY_NAME=<exact English legal name>`
- `ATLAS_LEGAL_ENTITY_NAME_LOCAL=<exact official local-language legal name>`
- `ATLAS_COMPANY_REGISTRATION_NUMBER=<official registration number>`
- `ATLAS_REGISTERED_BUSINESS_ADDRESS=<public registered address>`
- `ATLAS_PUBLIC_BUSINESS_PHONE=<public company phone>`
- `ATLAS_SUPPORT_EMAIL=support@atlasappointments.com`
- `ATLAS_PRIVACY_EMAIL=privacy@atlasappointments.com`
- `ATLAS_PUBLIC_SITE_URL=https://atlasappointments.com`

Atlas publishes a verified-company operator identity only when both `ATLAS_LEGAL_ENTITY_NAME` and `ATLAS_COMPANY_REGISTRATION_NUMBER` are present. Invalid emails or non-HTTPS site origins are ignored. Until then, the current temporary support contact remains the fallback.

## 5. D-U-N-S lookup/request

Apple requires a D-U-N-S number for normal company/organization enrollment. First use Apple's D-U-N-S lookup to see whether Dun & Bradstreet has already assigned one to the legal entity. If not, request one through the Apple/D&B flow.

Prepare these exact matching values:

- legal entity name;
- headquarters address;
- mailing address;
- company-domain work contact information;
- business registration documents locally, in case D&B asks for verification.

Apple currently says new D-U-N-S requests are free in most jurisdictions, may take up to **5 business days**, and Apple may need up to **2 additional business days** to receive new/updated D&B information.

Apple reference: https://developer.apple.com/help/account/membership/D-U-N-S/

Do not buy an unofficial 'expedited D-U-N-S' service merely to shorten Apple's stated waiting period.

## 6. Apple Developer organization enrollment

Enroll the real legal entity as an **Organization**. Apple currently requires:

- legal entity status;
- nine-digit D-U-N-S number;
- legal authority to bind the organization;
- a work email associated with the organization's domain;
- a publicly available functional website whose domain is associated with the organization;
- an Apple Account with two-factor authentication and the account holder's real legal first/last name.

Apple may request notarized business documents during verification. Those documents should go directly to Apple through its verification process, not into Atlas source code or chat.

Apple currently lists the Developer Program fee as **USD 99 per membership year**, with regional/local-currency pricing possible.

Apple references:

- https://developer.apple.com/programs/enroll/
- https://developer.apple.com/help/account/membership/program-enrollment/

## 7. Values Atlas engineering needs after Apple approves the organization

Safe identifiers to return:

- Apple Team ID;
- App Identifier Prefix;
- confirmation that the account is an Organization and the exact seller/legal entity name Apple displays.

Secrets must be inserted only through secure provider/deployment interfaces and never committed:

- Apple Sign in with Apple key ID;
- `.p8` private key contents;
- generated Apple client secret where applicable;
- Google OAuth client secret.

Then register/configure the fixed Atlas identities:

- App ID / bundle ID: `com.atlasappointments.app`
- Services ID: `com.atlasappointments.app.web`
- Sign in with Apple capability
- Associated Domains capability
- Supabase provider configuration
- Atlas server Apple credentials

The AASA endpoints must remain 404 until the real Apple App Identifier Prefix/Team information is securely configured.

## 8. WhatsApp remains a separate production gate

Do not activate real reminder delivery merely because company/Apple enrollment is complete. Atlas must still verify a real **+964** sender and approved required templates. The historical Meta +1 sandbox sender cannot satisfy readiness.
