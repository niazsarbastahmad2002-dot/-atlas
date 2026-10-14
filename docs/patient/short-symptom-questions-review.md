# Atlas Patient Page 04 — Short Symptom Questions: clinical review request

**Status: NOT CLINICALLY APPROVED — DO NOT MERGE OR DEPLOY.** Founder approval, qualified clinical review, and translation review are required before changing the server-side launch gate.

## Intended behavior

- Reuse the chief complaint selected on Page 03 and its existing single, complaint-specific warning-sign question. Do not collect additional history, symptom duration, precise locations, identifiers, or free text.
- Show large **Yes**, **No**, **Not sure** choices. **Yes** and **Not sure** both stop routine specialty suggestions and display urgent-care instructions. Unanswered also prevents progression to specialties.
- **No** allows a patient to browse *possible* specialties, **not** to infer that serious disease or urgent care has been ruled out. A visible warning repeats this; the existing universal emergency instructions remain available.
- A back-to-complaints control clears the in-memory complaint/answer. Direct public doctor search remains available without completing this question. This step has no nonessential extra questions to skip.
- No complaint/answer is sent to APIs, URLs, analytics, storage, patient records, or Atlas Doctor. Keep the existing `ATLAS_PATIENT_COMPLAINT_GUIDE_ENABLED` server gate OFF and page `noindex`.

## Required sign-off (all pending)

| Review item | Reviewer and date | Result |
| --- | --- | --- |
| Clinical reviewer: validate each of the ten warning-sign questions, uncertainty handling, urgency wording and exceptions (infants, pregnancy, sudden symptoms, major co-morbidity) | **Pending — named qualified clinician required** | Not approved |
| English, Sorani, Badini, and Iraqi Arabic wording: clinical equivalence, natural style, RTL and danger meaning | **Pending — native clinical-language reviewers required** | Not approved |
| Emergency/help text and local emergency-service guidance for Iraqi/Kurdistan patients (do not invent phone numbers) | **Pending** | Not approved |
| Accessibility and device testing on real iPhone, iPad, desktop, keyboard/VoiceOver and RTL/dark mode | **Pending** | Not approved |
| Review back navigation, answer changes, reload reset, privacy, and bypass via direct search | **Pending** | Not approved |

## Engineering verification

- Static tests cover the three distinct choices, blocking behavior, absence of local/server symptom collection, languages, layout hooks and launch gate.
- Passing CI does **not** provide medical validation, verify the translations, or authorize release.
- Parent discovery contract and draft mappings remain in [complaint-discovery-review.md](./complaint-discovery-review.md). No changes to complaint selection, specialties, provider discovery, public booking, OTP, schema, authentication, RLS, or production systems.

External reference for broad emergency-warning patterns: [MedlinePlus — Recognizing medical emergencies](https://medlineplus.gov/ency/article/001927.htm). This reference does not validate individual questions or translations.
