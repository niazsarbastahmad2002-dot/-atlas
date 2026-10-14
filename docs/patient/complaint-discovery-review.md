# Atlas Patient — complaint-guided discovery (clinical review draft)

**Status: NOT CLINICALLY APPROVED — DO NOT MERGE OR DEPLOY WITHOUT EXPLICIT FOUNDER APPROVAL AND CLINICAL SIGN-OFF.**

## Product purpose

Help a patient choose a sensible **starting specialty** and discover genuine **published** doctors using existing Atlas Patient search and read-only real availability. It is **not** diagnosis, emergency triage clearance, clinical advice, medical history collection, appointment booking, or a replacement for a clinician.

The first slice is three separately addressable, screenshot-reviewable pages:
- `/care/complaints` — searchable chief concern selection.
- `/care/complaints/questions` — **one complaint-specific safety question** (Yes/not sure stops routine suggestions, No only permits browsing and **does not mean safe**).
- `/care/complaints/specialties` — one or two *possible* specialties and links to the existing `/care?specialty=...` public-directory RPC. **No simulated doctors or time slots**.

There is always a prominent link to direct doctor search. All pages work in EN, Sorani, Badini and Iraqi Arabic, with RTL where appropriate, iPhone/iPad/desktop layout, noindex until approved, and no accounts required.

## First-draft mappings (review item, not medical endorsement)

| Patient description | Possible starting specialties | Notes |
| --- | --- | --- |
| Headache | General medicine; neurology | Sudden worst headache, acute weakness, speech change require emergency care |
| Knee pain | Orthopedics; general medicine | Significant trauma/deformity, inability to weight bear require urgent evaluation |
| Back pain | General medicine; orthopedics | New bladder/bowel change, saddle numbness, major new weakness require emergency care |
| Rash/skin concern | Dermatology; general medicine | Possible severe allergic reaction requires emergency care |
| Ear/throat concern | ENT; general medicine | Airway/secretions difficulty, sudden hearing loss require urgent care |
| Vision/eye concern | Ophthalmology | Sudden visual loss, eye injury, severe eye pain require urgent assessment |
| Abdominal pain | General medicine; gastroenterology | Sudden severe pain, syncope, GI bleeding require emergency care |
| Urinary concern | General medicine; urology | Urinary retention, severe systemic illness, heavy hematuria require urgent care |
| Tooth/gum pain | Dentistry | Airway compromise with swelling requires emergency care |
| Child fever | Pediatrics | Febrile infant under 3 months, altered responsiveness, seizure, breathing problems require immediate clinical assessment |

These are **not exclusive** and not ordered by clinical quality. Never use them to confidently exclude conditions. Specialty names used as search terms may differ from clinics' published language; no doctor match is **not evidence that care does not exist**.

## Safety and content requirements before release

1. Review each complaint/category for clinical accuracy, urgency and misleading omissions, including pediatrics, pregnancy, sudden sensory loss, self-harm, and patients with serious chronic illness.
2. Add a prominent **global emergency instruction** for chest pain/pressure, severe breathlessness, stroke-like symptoms, unresponsiveness, uncontrolled bleeding, seizure and similar danger signs. Do not invent or hard-code a US emergency number for Iraq. Use the actual local emergency service or nearest ED.
3. The current "No" safety response must never be represented as a clinical clearance; direct search and emergency instructions remain accessible.
4. Obtain documented medical review from qualified clinicians and native Sorani/Badini/Iraqi Arabic medical-language reviewers. They should sign off on all translations and mappings. Correct terminology in the code only after review.
5. Test real device and accessibility (keyboard/focus, RTL mixing, touch targets, 320px phone, tablet landscape, dark mode). Test language-switch behavior and browser back/reload: an unfinished in-memory guide resets safely.
6. Check data availability with authorized published sample doctors. Existing published-only public search and real appointment times remain the only provider truth. No public booking or paid OTP enabled.
7. Validate privacy: selection and safety answers exist **only in the persistent client component's in-memory React state**; no storage, logging, URL parameters, analytics, account mutations, patient notes or server requests. Intentional doctor-search click sends the specialty name in a public search URL, not a complaint or answer.

## External medical reference / research, not a substitute for local review

- [NHS 111 — help for your symptoms](https://111.nhs.uk/): explicitly directs people to an appropriate service; says it does not diagnose.
- [MedlinePlus — recognizing medical emergencies](https://medlineplus.gov/ency/article/001927.htm): severe breathing difficulty, stroke symptoms, serious chest pain, altered mental status, bleeding.
- [MedlinePlus — when to use the emergency room](https://medlineplus.gov/ency/patientinstructions/000593.htm): emergency warning signs and escalation.
- [MedlinePlus — chest pain](https://medlineplus.gov/ency/article/003079.htm): emergency warning signs for possible cardiac or vascular causes.
- [NHS — shortness of breath](https://www.nhs.uk/symptoms/shortness-of-breath/): emergency/urgent symptom examples.
- [NHS — back pain](https://www.nhs.uk/conditions/back-pain/): red flags for new bladder/bowel changes and saddle numbness.
- [NICE NG143 — fever under 5](https://www.nice.org.uk/guidance/NG143/chapter/recommendations): fever at/above 38°C in infants under 3 months is high risk, and fever alone cannot clear serious illness.

**Important:** these references support the general safety pattern. They **do not individually validate all ten Atlas complaint-to-specialty mappings or translations.** Those remain draft clinical judgments awaiting prospective review.

## Engineering and Atlas Doctor boundary

- UI-only, static catalog, no new database or SQL/RLS/auth changes, no new clinical records, no background automation, no fake clinicians, photos, reviews or bookable times.
- Existing public directory RPC `search_public_doctors_with_availability` and published doctor/clinic detail and real slot RPCs remain unchanged.
- Clinic/Doctor patient identity, tenancy, schedule state machine and sensitive notes remain inaccessible to this flow.
- Production release is expressly blocked by founder approval plus clinical/translation signoff, even if tests pass.


## Additional safety changes after initial code review (authoritative)

**Server-side launch gate:** Every new guide page returns 404 unless `ATLAS_PATIENT_COMPLAINT_GUIDE_ENABLED === "true"`; the entry link is also hidden unless true. The flag is NOT configured in production; no environment changes are authorized. A `noindex` tag alone would not protect unreviewed medical content.

**Published specialty accuracy:** Instead of linking using hard-coded English specialty names, the specialties page independently retrieves only the first 30 genuinely published public doctor records via the existing search RPC. The selected complaint and warning answer are never sent. Only an exact specialty label actually present in that bounded public result can form a specialty-filter link; a curated alias table helps recognize published spelling variants. If nothing matches the sample, show a clearly bounded/no-claims explanation and an unfiltered browse link. This is not a complete specialty taxonomy or nationwide provider directory. No private doctor notes/records are read and no extra database schema is introduced.

These conditions supersede the earlier draft description of direct links using English specialty strings. **A clinician-approved normalized, multilingual specialty taxonomy with complete provider coverage is still future work and is not implemented in this slice.**
