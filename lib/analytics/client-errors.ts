export type AtlasWindowErrorSignal = {
  message?: unknown;
  filename?: unknown;
  error?: unknown;
};

export function shouldTrackAtlasWindowError(signal: AtlasWindowErrorSignal | null | undefined) {
  if (!signal || typeof signal !== "object") return false;

  const message = typeof signal.message === "string" ? signal.message.trim() : "";
  const filename = typeof signal.filename === "string" ? signal.filename.trim() : "";
  const hasErrorObject = signal.error != null && typeof signal.error === "object";

  // `window.error` also fires for failed images, fonts, scripts, and other
  // resource loads. Those events do not carry ErrorEvent diagnostics and were
  // previously inflating Atlas client-error counts without actionable signal.
  if (!message && !filename && !hasErrorObject) return false;

  // Cross-origin browser/extension errors can collapse into "Script error."
  // with no source or exception. Atlas cannot diagnose these safely, so do not
  // count them as product failures.
  if (message.toLowerCase() === "script error." && !filename && !hasErrorObject) return false;

  return true;
}

export function createAtlasClientErrorGate(cooldownMs = 5_000) {
  const lastTracked = new Map<string, number>();

  return (kind: string, now = Date.now()) => {
    const previous = lastTracked.get(kind);
    if (previous != null && now - previous < cooldownMs) return false;
    lastTracked.set(kind, now);
    return true;
  };
}
