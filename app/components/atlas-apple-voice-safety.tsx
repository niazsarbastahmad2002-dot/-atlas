"use client";

import { useEffect } from "react";

const APPLE_BLOCKED_VOICE_SELECTOR = ".atlas-ai-live-button";

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

    const blockUnsafeLiveVoice = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(APPLE_BLOCKED_VOICE_SELECTOR)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    document.addEventListener("pointerdown", blockUnsafeLiveVoice, true);
    document.addEventListener("touchstart", blockUnsafeLiveVoice, { capture: true, passive: false });
    document.addEventListener("click", blockUnsafeLiveVoice, true);

    return () => {
      document.removeEventListener("pointerdown", blockUnsafeLiveVoice, true);
      document.removeEventListener("touchstart", blockUnsafeLiveVoice, true);
      document.removeEventListener("click", blockUnsafeLiveVoice, true);
      delete root.dataset.atlasAppleVoicePaused;
    };
  }, []);

  return null;
}
