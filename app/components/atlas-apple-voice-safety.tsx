"use client";

import { useEffect } from "react";

const VOICE_ENTRY_SELECTOR = [
  ".atlas-ai-mic-button",
  ".atlas-ai-dictate-button",
  ".atlas-ai-live-button",
].join(",");

function isAppleMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent;
  return /iPad|iPhone|iPod/i.test(userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function AtlasAppleVoiceSafety() {
  useEffect(() => {
    if (!isAppleMobileBrowser()) return;

    const root = document.documentElement;
    root.dataset.atlasAppleVoicePaused = "true";

    const blockVoiceEntry = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(VOICE_ENTRY_SELECTOR)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    document.addEventListener("pointerdown", blockVoiceEntry, true);
    document.addEventListener("touchstart", blockVoiceEntry, { capture: true, passive: false });
    document.addEventListener("click", blockVoiceEntry, true);

    return () => {
      document.removeEventListener("pointerdown", blockVoiceEntry, true);
      document.removeEventListener("touchstart", blockVoiceEntry, true);
      document.removeEventListener("click", blockVoiceEntry, true);
      delete root.dataset.atlasAppleVoicePaused;
    };
  }, []);

  return null;
}
