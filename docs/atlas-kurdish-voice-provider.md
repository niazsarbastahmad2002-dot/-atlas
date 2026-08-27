# Atlas Kurdish Voice Provider

Atlas uses a Kurdish-specific speech-to-text provider only for Kurdish voice input when `ATLAS_KURDISH_STT_API_KEY` is configured server-side.

- Sorani (`ku`) is sent as provider dialect `sorani`.
- Badini (`bd`) is sent as provider dialect `kurmanji`, then normalized conservatively into Atlas's Arabic-based Badini spelling by the existing server-side Atlas AI text model.
- English and Iraqi Arabic remain on the existing Cloudflare speech path.
- If the Kurdish-specific provider is unavailable or unconfigured, Atlas falls back to the existing Cloudflare Kurdish recovery path.
- The API key must never use a `NEXT_PUBLIC_` prefix or be returned to the browser.
- Voice audio may contain sensitive information; Atlas UI continues to instruct staff not to dictate patient-identifying or patient-specific clinical information into Atlas AI.

The current provider adapter targets `https://www.kurdishtts.com/api/stt-proxy` and expects a server-only `ATLAS_KURDISH_STT_API_KEY` environment variable.
