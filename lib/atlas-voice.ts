export type AtlasVoiceLocale = "en" | "ku" | "bd" | "ar";

export const ATLAS_VOICE_MAX_AUDIO_BYTES = 6 * 1024 * 1024;

const acceptedAudioTypes = new Set([
  "audio/mp4",
  "audio/x-m4a",
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
]);

const extensionTypes: Record<string, string> = {
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  webm: "audio/webm",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  aac: "audio/aac",
};

export type AtlasVoiceUploadCheck =
  | { ok: true; mediaType: string }
  | { ok: false; reason: "empty" | "too_large" | "unsupported_type" };

export function normalizeAtlasVoiceMediaType(mediaType: string | null | undefined, filename = "") {
  const base = String(mediaType ?? "")
    .toLowerCase()
    .split(";")[0]
    ?.trim() ?? "";

  if (acceptedAudioTypes.has(base)) return base === "audio/x-m4a" ? "audio/mp4" : base;
  // Safari may identify an audio-only MP4 recording as video/mp4. The upload still contains only the mic track.
  if (base === "video/mp4") return "audio/mp4";

  const extension = filename.toLowerCase().split(".").pop() ?? "";
  return extensionTypes[extension] ?? "";
}

export function checkAtlasVoiceUpload(input: { size: number; type?: string | null; name?: string | null }): AtlasVoiceUploadCheck {
  if (!Number.isFinite(input.size) || input.size < 32) return { ok: false, reason: "empty" };
  if (input.size > ATLAS_VOICE_MAX_AUDIO_BYTES) return { ok: false, reason: "too_large" };
  const mediaType = normalizeAtlasVoiceMediaType(input.type, input.name ?? "");
  if (!mediaType) return { ok: false, reason: "unsupported_type" };
  return { ok: true, mediaType };
}

export type AtlasKurdishAsrPass = {
  label: string;
  language?: string;
};

export function atlasKurdishAsrPasses(locale: "ku" | "bd"): AtlasKurdishAsrPass[] {
  if (locale === "ku") {
    return [
      { label: "auto" },
      { label: "persian_hint", language: "fa" },
      { label: "arabic_hint", language: "ar" },
    ];
  }
  return [
    { label: "auto" },
    { label: "turkish_hint", language: "tr" },
    { label: "persian_hint", language: "fa" },
  ];
}

export function cleanAtlasVoiceTranscript(value: string) {
  return value
    .replace(/^```(?:json|text)?\s*/i, "")
    .replace(/```$/i, "")
    .replace(/^\s*[“\"']|[”\"']\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scriptCounts(value: string) {
  let arabic = 0;
  let latin = 0;
  for (const char of value) {
    const code = char.charCodeAt(0);
    if ((code >= 0x0600 && code <= 0x06ff) || (code >= 0x0750 && code <= 0x077f)) arabic += 1;
    else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) latin += 1;
  }
  return { arabic, latin };
}

export function isPlausibleAtlasVoiceTranscript(value: string, locale: AtlasVoiceLocale) {
  const text = cleanAtlasVoiceTranscript(value);
  if (text.length < 2 || text.length > 1800) return false;
  if (/�{2,}/.test(text)) return false;
  if (/(.)\1{9,}/.test(text)) return false;

  const { arabic, latin } = scriptCounts(text);
  const letters = arabic + latin;
  if (letters < 2) return false;

  if (locale === "en") return latin / letters >= 0.5;
  if (locale === "ar") return arabic / letters >= 0.5;
  // Atlas's Sorani and Badini interfaces both use Arabic-based Kurdish script. Allow Latin product terms such as Atlas/no-show.
  return arabic / letters >= 0.45;
}

export type AtlasKurdishReconciliation = {
  text: string;
  confidence: "high" | "medium" | "low";
};

export function parseAtlasKurdishReconciliation(raw: string): AtlasKurdishReconciliation | null {
  const candidate = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const open = candidate.indexOf("{");
  const close = candidate.lastIndexOf("}");
  if (open < 0 || close <= open) return null;
  try {
    const parsed = JSON.parse(candidate.slice(open, close + 1)) as Record<string, unknown>;
    const text = typeof parsed.text === "string" ? cleanAtlasVoiceTranscript(parsed.text) : "";
    const confidence = parsed.confidence;
    if (confidence !== "high" && confidence !== "medium" && confidence !== "low") return null;
    return { text, confidence };
  } catch {
    return null;
  }
}
