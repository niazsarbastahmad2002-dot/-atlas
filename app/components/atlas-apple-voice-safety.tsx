"use client";

import { useEffect } from "react";
import type { UiLocale } from "@/lib/i18n/ui";

const LIVE_VOICE_SELECTOR = ".atlas-ai-live-button";
const DICTATION_SELECTOR = ".atlas-ai-mic-button, .atlas-ai-dictate-button";
const START_TIMEOUT_MS = 7_000;
const STOP_TIMEOUT_MS = 3_500;
const TRANSCRIBE_TIMEOUT_MS = 22_000;

type DictationState = "idle" | "starting" | "recording" | "transcribing";

type VoiceCopy = {
  starting: string;
  recording: string;
  transcribing: string;
  permission: string;
  unavailable: string;
  noSpeech: string;
  busy: string;
};

const voiceCopy: Record<UiLocale, VoiceCopy> = {
  en: {
    starting: "Starting microphone…",
    recording: "Recording — tap the microphone again when you are finished.",
    transcribing: "Converting voice to text…",
    permission: "Atlas needs microphone permission. The page is still ready to use.",
    unavailable: "Voice could not start. Atlas kept the page usable so you can try again.",
    noSpeech: "Atlas did not receive enough speech. Try again.",
    busy: "Voice took too long. Atlas stopped it safely so the page stays usable.",
  },
  ku: {
    starting: "مایکرۆفۆن ئامادە دەکرێت…",
    recording: "تۆمار دەکرێت — کاتێک تەواو بوویت دووبارە مایکرۆفۆنەکە دابگرە.",
    transcribing: "دەنگ دەگۆڕدرێت بۆ نووسین…",
    permission: "Atlas پێویستی بە ڕێگەی مایکرۆفۆن هەیە. لاپەڕەکە هەر ئامادەی بەکارهێنانە.",
    unavailable: "دەنگ دەستی پێ نەکرد. Atlas لاپەڕەکەی بەکارهێنراو هێشتەوە تا دووبارە هەوڵ بدەیت.",
    noSpeech: "Atlas دەنگی پێویستی وەرنەگرت. دووبارە هەوڵ بدە.",
    busy: "دەنگ زۆر درێژ بوو. Atlas بە سەلامەتی وەستاندی تا لاپەڕەکە کار بکات.",
  },
  bd: {
    starting: "مایکرۆفۆن ئامادە دبیت…",
    recording: "تۆمار دبیت — دەمێ تەمام بووی دیسان مایکرۆفۆنێ دابگرە.",
    transcribing: "دەنگ دگوهۆڕیت بۆ نڤیسینێ…",
    permission: "Atlas پێدڤی ب ڕێکا مایکرۆفۆنێ هەیە. لاپەڕە هەر ئامادەیە.",
    unavailable: "دەنگ دەست پێ نەکر. Atlas لاپەڕە بەکارهێنراو هێلا دا تو دیسان هەول بدەی.",
    noSpeech: "Atlas دەنگێ پێدڤی وەرنەگرت. دیسان هەول بدە.",
    busy: "دەنگ زۆر درێژ بوو. Atlas ب سەلامەتی وەستاند دا لاپەڕە کار بکەت.",
  },
  ar: {
    starting: "جاري تشغيل الميكروفون…",
    recording: "جاري التسجيل — اضغط الميكروفون مرة ثانية من تخلص.",
    transcribing: "جاري تحويل الصوت إلى نص…",
    permission: "Atlas يحتاج إذن الميكروفون. الصفحة تبقى جاهزة للاستخدام.",
    unavailable: "تعذر تشغيل الصوت. Atlas أبقى الصفحة قابلة للاستخدام حتى تقدر تحاول مرة ثانية.",
    noSpeech: "Atlas ما استلم كلام كافي. حاول مرة ثانية.",
    busy: "الصوت أخذ وقت طويل. Atlas أوقفه بأمان حتى تبقى الصفحة قابلة للاستخدام.",
  },
};

function isAppleMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent;
  return /iPad|iPhone|iPod/i.test(userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function recorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function voiceFilename(type: string) {
  const value = type.toLowerCase();
  if (value.includes("mp4") || value.includes("m4a")) return "atlas-voice.m4a";
  if (value.includes("webm")) return "atlas-voice.webm";
  if (value.includes("ogg")) return "atlas-voice.ogg";
  return "atlas-voice.audio";
}

export function AtlasAppleVoiceSafety({ locale }: { locale: UiLocale }) {
  useEffect(() => {
    if (!isAppleMobileBrowser()) return;

    const root = document.documentElement;
    const t = voiceCopy[locale];
    root.dataset.atlasAppleVoicePaused = "true";
    root.dataset.atlasAppleDictationState = "idle";

    let state: DictationState = "idle";
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let chunks: BlobPart[] = [];
    let disposed = false;
    let requestVersion = 0;
    let errorNode: HTMLParagraphElement | null = null;

    const stopTracks = (value: MediaStream | null) => {
      value?.getTracks().forEach((track) => {
        try { track.stop(); } catch {}
      });
    };

    const ensureStatusNode = () => {
      if (errorNode?.isConnected) return errorNode;
      const composer = document.querySelector<HTMLElement>(".atlas-ai-composer");
      if (!composer) return null;
      const node = document.createElement("p");
      node.className = "atlas-ai-apple-dictation-status";
      node.setAttribute("role", "status");
      composer.insertAdjacentElement("afterend", node);
      errorNode = node;
      return node;
    };

    const setState = (next: DictationState, message = "", isError = false) => {
      state = next;
      root.dataset.atlasAppleDictationState = next;
      const node = ensureStatusNode();
      if (node) {
        node.textContent = message;
        node.hidden = !message;
        node.classList.toggle("is-error", isError);
      }
      for (const button of document.querySelectorAll<HTMLButtonElement>(DICTATION_SELECTOR)) {
        button.setAttribute("aria-busy", next === "starting" || next === "transcribing" ? "true" : "false");
        button.setAttribute("aria-pressed", next === "recording" ? "true" : "false");
      }
    };

    const restore = (message = "", isError = false) => {
      stopTracks(stream);
      stream = null;
      recorder = null;
      chunks = [];
      setState("idle", message, isError);
    };

    const insertTranscript = (text: string) => {
      const textarea = document.querySelector<HTMLTextAreaElement>(".atlas-ai-composer textarea");
      if (!textarea) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      if (!setter) return false;
      const current = textarea.value.trim();
      setter.call(textarea, `${current}${current ? " " : ""}${text}`.trim());
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      textarea.focus({ preventScroll: true });
      return true;
    };

    const requestMicrophone = async () => {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("unavailable");
      }
      let timedOut = false;
      let timer = 0;
      const request = navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const timeout = new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => {
          timedOut = true;
          reject(new Error("busy"));
        }, START_TIMEOUT_MS);
      });
      try {
        return await Promise.race([request, timeout]);
      } catch (error) {
        if (timedOut) request.then(stopTracks).catch(() => undefined);
        throw error;
      } finally {
        window.clearTimeout(timer);
      }
    };

    const stopRecorder = async () => {
      const active = recorder;
      if (!active) return new Blob();
      if (active.state === "inactive") return new Blob(chunks, { type: active.mimeType || "audio/mp4" });
      return await new Promise<Blob>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          resolve(new Blob(chunks, { type: active.mimeType || "audio/mp4" }));
        };
        const timer = window.setTimeout(finish, STOP_TIMEOUT_MS);
        active.addEventListener("stop", finish, { once: true });
        active.addEventListener("error", finish, { once: true });
        try { active.requestData(); } catch {}
        try { active.stop(); } catch { finish(); }
      });
    };

    const transcribe = async (blob: Blob) => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS);
      try {
        const form = new FormData();
        form.append("audio", new File([blob], voiceFilename(blob.type), { type: blob.type || "audio/mp4" }));
        form.append("locale", locale);
        const response = await fetch("/api/atlas-ai/transcribe", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          body: form,
          signal: controller.signal,
        });
        const payload = await response.json() as { text?: string; error?: string };
        if (!response.ok || !payload.text?.trim()) {
          if (payload.error === "no_speech" || payload.error === "unclear_speech") throw new Error("no_speech");
          if (payload.error === "rate_limited") throw new Error("busy");
          throw new Error("unavailable");
        }
        return payload.text.trim();
      } catch (error) {
        if (controller.signal.aborted) throw new Error("busy");
        throw error;
      } finally {
        window.clearTimeout(timer);
      }
    };

    const startDictation = async () => {
      if (state !== "idle") return;
      const version = ++requestVersion;
      setState("starting", t.starting);
      try {
        const nextStream = await requestMicrophone();
        if (disposed || version !== requestVersion) {
          stopTracks(nextStream);
          return;
        }
        stream = nextStream;
        chunks = [];
        const mimeType = recorderMimeType();
        recorder = mimeType ? new MediaRecorder(nextStream, { mimeType }) : new MediaRecorder(nextStream);
        recorder.addEventListener("dataavailable", (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        });
        recorder.start(250);
        setState("recording", t.recording);
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        const code = error instanceof Error ? error.message : "unavailable";
        restore(
          name === "NotAllowedError" || name === "SecurityError" ? t.permission : code === "busy" ? t.busy : t.unavailable,
          true,
        );
      }
    };

    const finishDictation = async () => {
      if (state !== "recording" || !recorder) return;
      const version = ++requestVersion;
      setState("transcribing", t.transcribing);
      try {
        const blob = await stopRecorder();
        stopTracks(stream);
        stream = null;
        recorder = null;
        if (disposed || version !== requestVersion) return;
        if (blob.size < 900) {
          restore(t.noSpeech, true);
          return;
        }
        const transcript = await transcribe(blob);
        if (disposed || version !== requestVersion) return;
        if (!insertTranscript(transcript)) {
          restore(t.unavailable, true);
          return;
        }
        restore();
      } catch (error) {
        const code = error instanceof Error ? error.message : "unavailable";
        restore(code === "no_speech" ? t.noSpeech : code === "busy" ? t.busy : t.unavailable, true);
      }
    };

    const blockLiveEntry = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(LIVE_VOICE_SELECTOR)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(LIVE_VOICE_SELECTOR)) {
        blockLiveEntry(event);
        return;
      }
      if (!target.closest(DICTATION_SELECTOR)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (state === "recording") void finishDictation();
      else if (state === "idle") void startDictation();
    };

    document.addEventListener("pointerdown", blockLiveEntry, true);
    document.addEventListener("touchstart", blockLiveEntry, { capture: true, passive: false });
    document.addEventListener("click", handleClick, true);

    return () => {
      disposed = true;
      requestVersion += 1;
      document.removeEventListener("pointerdown", blockLiveEntry, true);
      document.removeEventListener("touchstart", blockLiveEntry, true);
      document.removeEventListener("click", handleClick, true);
      try {
        if (recorder && recorder.state !== "inactive") recorder.stop();
      } catch {}
      stopTracks(stream);
      errorNode?.remove();
      delete root.dataset.atlasAppleVoicePaused;
      delete root.dataset.atlasAppleDictationState;
    };
  }, [locale]);

  return null;
}
