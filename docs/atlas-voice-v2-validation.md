# Atlas Voice V2 validation

Atlas Voice V2 was created after production runtime logs showed repeated `/api/atlas-ai/transcribe` HTTP 400 failures during real iPad voice attempts.

Release properties:
- Atlas records microphone input into deterministic mono 16 kHz PCM WAV instead of relying on Safari MediaRecorder container output.
- Dictation never auto-sends.
- Live Voice uses visible microphone-level feedback and explicit listening/transcribing/thinking/speaking/paused states.
- Failed transcription pauses and requires an explicit retry instead of silently looping.
- Sorani and Badini transcription uses several ASR interpretations followed by strict same-audio reconciliation; low-confidence output is rejected rather than displayed as gibberish.
- Transcription remains authenticated, same-origin, bounded, no-store, and server-side. Audio is not persisted by Atlas.
- No patient identifiers are added to the AI context, and Atlas remains read-only.
- The free Cloudflare provider remains the default. No new paid provider is introduced.

Validation:
- Vercel preview `npm run check` passed with 214/214 tests, TypeScript clean, and successful Next.js production build.
- Temporary feature-branch deployment permission was removed before merge.
