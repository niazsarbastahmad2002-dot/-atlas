"use client";

import { useEffect } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { AtlasAiClient as AtlasAiClientV5 } from "./atlas-ai-client-v5";

type AtlasAiClientProps = { clinicId: string; clinicName: string; locale: UiLocale };

const TRANSCRIBE_TIMEOUT_MS = 30_000;
const VOICE_ANSWER_TIMEOUT_MS = 55_000;

function voiceRequestTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const raw = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  const url = new URL(raw, window.location.origin);
  if (url.pathname === "/api/atlas-ai/transcribe") return TRANSCRIBE_TIMEOUT_MS;
  if (url.pathname === "/api/atlas-ai" && typeof init?.body === "string" && /"interaction"\s*:\s*"voice"/.test(init.body)) {
    return VOICE_ANSWER_TIMEOUT_MS;
  }
  return null;
}

function timedSignal(original: AbortSignal | null | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const abortFromOriginal = () => controller.abort(original?.reason);
  if (original?.aborted) abortFromOriginal();
  else original?.addEventListener("abort", abortFromOriginal, { once: true });
  const timer = window.setTimeout(() => controller.abort(new DOMException("Atlas voice request timed out", "TimeoutError")), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timer);
      original?.removeEventListener("abort", abortFromOriginal);
    },
  };
}

function installVoiceFetchGuard() {
  const originalFetch = window.fetch.bind(window) as typeof window.fetch;
  const guardedFetch: typeof window.fetch = async (input, init) => {
    const timeoutMs = voiceRequestTimeout(input, init);
    if (!timeoutMs) return originalFetch(input, init);
    const timed = timedSignal(init?.signal, timeoutMs);
    try {
      return await originalFetch(input, { ...init, signal: timed.signal });
    } finally {
      timed.cleanup();
    }
  };
  window.fetch = guardedFetch;
  return () => {
    if (window.fetch === guardedFetch) window.fetch = originalFetch;
  };
}

function showRecoveredVoiceError(root: HTMLElement, text: string) {
  let notice = root.querySelector<HTMLElement>(".atlas-ai-voice-recovery-notice");
  if (!notice) {
    notice = document.createElement("p");
    notice.className = "atlas-ai-voice-recovery-notice";
    notice.setAttribute("role", "alert");
    const voiceTools = root.querySelector<HTMLElement>(".atlas-ai-voice-tools");
    if (voiceTools) voiceTools.insertAdjacentElement("afterend", notice);
    else root.appendChild(notice);
  }
  notice.textContent = text;
}

function recoverFailedLiveVoice(root: HTMLElement) {
  const error = root.querySelector<HTMLElement>(".atlas-ai-live-overlay .atlas-ai-live-error");
  if (!error || error.dataset.atlasVoiceRecovered === "1") return;
  const message = error.textContent?.trim();
  if (!message) return;
  error.dataset.atlasVoiceRecovered = "1";

  const endButton = root.querySelector<HTMLButtonElement>(".atlas-ai-live-overlay .atlas-ai-live-topbar button");
  if (!endButton) return;
  endButton.click();
  queueMicrotask(() => showRecoveredVoiceError(root, message));
}

export function AtlasAiClient(props: AtlasAiClientProps) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".atlas-ai-card");
    if (!root) return;
    root.dataset.atlasVoiceRecovery = "v6";
    const restoreFetch = installVoiceFetchGuard();

    let queued = false;
    const run = () => {
      queued = false;
      recoverFailedLiveVoice(root);
    };
    const schedule = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(run);
    };

    const clearRecoveredNotice = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(".atlas-ai-live-button,.atlas-ai-dictate-button,.atlas-ai-mic-button")) return;
      root.querySelector(".atlas-ai-voice-recovery-notice")?.remove();
    };

    run();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    root.addEventListener("click", clearRecoveredNotice, true);

    return () => {
      observer.disconnect();
      root.removeEventListener("click", clearRecoveredNotice, true);
      restoreFetch();
      delete root.dataset.atlasVoiceRecovery;
    };
  }, []);

  return (
    <>
      <AtlasAiClientV5 {...props} />
      <style>{`
        .atlas-ai-card[data-atlas-voice-recovery="v6"] .atlas-ai-composer-actions{align-self:center!important;align-items:center!important;height:38px}
        .atlas-ai-card[data-atlas-voice-recovery="v6"] :is(.atlas-ai-mic-button,.atlas-ai-send-button){padding:0!important;line-height:0!important}
        .atlas-ai-card[data-atlas-voice-recovery="v6"] :is(.atlas-ai-mic-button,.atlas-ai-send-button) svg{display:block;margin:auto}
        .atlas-ai-card[data-atlas-voice-recovery="v6"] .atlas-ai-voice-recovery-notice{margin:0 0 9px;border:1px solid color-mix(in srgb,var(--danger) 28%,var(--line));border-radius:12px;padding:9px 11px;background:color-mix(in srgb,var(--danger) 8%,var(--surface));color:var(--danger);font-size:11px;line-height:1.45}
        @media(max-width:720px){.atlas-ai-card[data-atlas-voice-recovery="v6"] .atlas-ai-composer-actions{flex:0 0 auto}}
      `}</style>
    </>
  );
}
