"use client";

import { useEffect } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import {
  atlasPcmCaptureSupported,
  startAtlasPcmCapture,
  type AtlasPcmCapture,
} from "./atlas-pcm-recorder";
import { AtlasAiClient as AtlasAiClientV4 } from "./atlas-ai-client-v4";

type AtlasAiClientProps = { clinicId: string; clinicName: string; locale: UiLocale };
type GuardState = "idle" | "starting" | "recording" | "transcribing";

const soraniPresets = [
  "مەوعیدەکانی ئەمڕۆ بە کات و ناوی نەخۆش و دکتۆر پیشان بدە.",
  "مەوعیدەکانی ئەمڕۆی دکتۆر سارا پیشان بدە.",
  "ئەمڕۆ چەند مەوعیدمان هەیە؟",
  "کام مەوعیدەکان هێشتا پشتڕاست نەکراونەتەوە؟",
  "کام نەخۆشەکان بیرخستنەوەیان بۆ نەنێردراوە؟",
  "ئەمڕۆ ڕیسێپشن سەرنجی لە چی بدات؟",
  "خشتەی هەموو مەوعیدەکانی ئەمڕۆ پیشان بدە.",
];

const voiceCopy: Record<UiLocale, {
  start: string;
  stop: string;
  starting: string;
  transcribing: string;
  unavailable: string;
  permission: string;
  noSpeech: string;
  busy: string;
}> = {
  en: {
    start: "Voice to text",
    stop: "Stop recording",
    starting: "Starting microphone…",
    transcribing: "Converting voice to text…",
    unavailable: "Voice could not start. Atlas restored the page so you can try again.",
    permission: "Atlas needs microphone permission. The page is ready again after you change permission.",
    noSpeech: "Atlas did not receive enough speech. Try again.",
    busy: "Voice took too long. Atlas stopped it safely so the page stays usable.",
  },
  ku: {
    start: "دەنگ بۆ نووسین",
    stop: "تۆمارکردن بوەستێنە",
    starting: "مایکرۆفۆن ئامادە دەکرێت…",
    transcribing: "دەنگ دەگۆڕدرێت بۆ نووسین…",
    unavailable: "دەنگ دەستی پێ نەکرد. Atlas لاپەڕەکەی ئازاد کرد تا دووبارە هەوڵ بدەیت.",
    permission: "Atlas پێویستی بە ڕێگەی مایکرۆفۆن هەیە. دوای گۆڕینی ڕێگە، لاپەڕەکە ئامادەیە.",
    noSpeech: "Atlas دەنگی پێویستی وەرنەگرت. دووبارە هەوڵ بدە.",
    busy: "دەنگ زۆر درێژ بوو. Atlas بە سەلامەتی وەستاندی تا لاپەڕەکە کار بکات.",
  },
  bd: {
    start: "دەنگ بۆ نڤیسینێ",
    stop: "تۆمارکرن بوەستینە",
    starting: "مایکرۆفۆن ئامادە دبیت…",
    transcribing: "دەنگ دگوهۆڕیت بۆ نڤیسینێ…",
    unavailable: "دەنگ دەست پێ نەکر. Atlas لاپەڕە ئازاد کر دا تو دیسان هەول بدەی.",
    permission: "Atlas پێدڤی ب ڕێکا مایکرۆفۆنێ هەیە. پشتی گۆڕینا ڕێکێ لاپەڕە ئامادەیە.",
    noSpeech: "Atlas دەنگێ پێدڤی وەرنەگرت. دیسان هەول بدە.",
    busy: "دەنگ زۆر درێژ بوو. Atlas ب سەلامەتی وەستاند دا لاپەڕە کار بکەت.",
  },
  ar: {
    start: "صوت إلى نص",
    stop: "إيقاف التسجيل",
    starting: "جاري تشغيل الميكروفون…",
    transcribing: "جاري تحويل الصوت إلى نص…",
    unavailable: "تعذر تشغيل الصوت. أعاد Atlas الصفحة لوضعها الطبيعي حتى تقدر تحاول مرة ثانية.",
    permission: "Atlas يحتاج إذن الميكروفون. الصفحة جاهزة من جديد بعد تغيير الإذن.",
    noSpeech: "Atlas ما استلم كلام كافي. حاول مرة ثانية.",
    busy: "الصوت أخذ وقت طويل. Atlas أوقفه بأمان حتى تبقى الصفحة قابلة للاستخدام.",
  },
};

function parseTableRow(value: string) {
  const line = value.trim();
  if (!line.startsWith("|") || !line.endsWith("|")) return null;
  const cells = line.slice(1, -1).split("|").map((cell) => cell.trim());
  return cells.length >= 2 ? cells : null;
}

function separatorRow(cells: string[] | null) {
  return Boolean(cells?.length && cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
}

function buildTable(header: string[], rows: string[][], locale: UiLocale) {
  const wrapper = document.createElement("div");
  wrapper.className = "atlas-ai-table-wrap";
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute(
    "aria-label",
    locale === "ar" ? "جدول Atlas AI" : locale === "en" ? "Atlas AI table" : "خشتەی Atlas AI",
  );
  wrapper.tabIndex = 0;

  const table = document.createElement("table");
  table.className = "atlas-ai-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const value of header) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = value;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const value of row) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}

function enhanceTables(root: HTMLElement, locale: UiLocale) {
  const richBlocks = root.querySelectorAll<HTMLElement>(
    ".atlas-ai-rich-text:not([data-atlas-table-pass])",
  );

  for (const rich of richBlocks) {
    rich.dataset.atlasTablePass = "1";
    const paragraphs = Array.from(rich.children).filter(
      (node): node is HTMLParagraphElement => node instanceof HTMLParagraphElement,
    );

    for (let index = 0; index < paragraphs.length - 1; index += 1) {
      const header = parseTableRow(paragraphs[index].textContent ?? "");
      const separator = parseTableRow(paragraphs[index + 1].textContent ?? "");
      if (!header || !separatorRow(separator) || separator?.length !== header.length) continue;

      const tableRows: string[][] = [];
      const sourceNodes: HTMLParagraphElement[] = [paragraphs[index], paragraphs[index + 1]];
      let cursor = index + 2;
      while (cursor < paragraphs.length) {
        const row = parseTableRow(paragraphs[cursor].textContent ?? "");
        if (!row || row.length !== header.length) break;
        tableRows.push(row);
        sourceNodes.push(paragraphs[cursor]);
        cursor += 1;
      }
      if (!tableRows.length) continue;

      rich.appendChild(buildTable(header, tableRows, locale));
      for (const node of sourceNodes) {
        node.hidden = true;
        node.setAttribute("aria-hidden", "true");
      }
      index = cursor - 1;
    }
  }
}

function askThroughComposer(root: HTMLElement, question: string) {
  const textarea = root.querySelector<HTMLTextAreaElement>(".atlas-ai-composer textarea");
  if (!textarea || textarea.disabled) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (!setter) return;

  setter.call(textarea, question);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));

  queueMicrotask(() => {
    if (textarea.disabled) return;
    textarea.closest<HTMLFormElement>("form")?.requestSubmit();
  });
}

function fillComposer(root: HTMLElement, text: string) {
  const textarea = root.querySelector<HTMLTextAreaElement>(".atlas-ai-composer textarea");
  if (!textarea) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (!setter) return false;
  const current = textarea.value.trim();
  setter.call(textarea, `${current}${current ? " " : ""}${text}`.trim());
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
  textarea.focus({ preventScroll: true });
  return true;
}

function polishSorani(root: HTMLElement) {
  const privacy = root.querySelector<HTMLElement>(".atlas-ai-privacy");
  if (privacy) {
    privacy.textContent = "Atlas AI بۆ وەڵامدانەوە لە زانیارییە ڕێگەپێدراوەکانی کلینیک بەکاردەهێنێت. وردەکاری مەوعیدەکان لە ناو Atlas دەپشکنرێت. تکایە زانیاری پزیشکی وەک دەستنیشانکردنی نەخۆشی یان تێبینی پزیشکی لێرە مەنووسە.";
  }

  const empty = root.querySelector<HTMLElement>(".atlas-ai-empty");
  const presets = empty?.querySelector<HTMLElement>(".atlas-ai-presets");
  if (!empty || !presets || presets.dataset.atlasSoraniV5Stable === "1") return;
  presets.dataset.atlasSoraniV5Stable = "1";

  const label = Array.from(empty.children).find(
    (node) => node instanceof HTMLSpanElement,
  ) as HTMLSpanElement | undefined;
  if (label) label.textContent = "دەتوانیت بەم پرسیارانە دەست پێ بکەیت";

  presets.replaceChildren();
  for (const question of soraniPresets) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = question;
    button.addEventListener("click", () => askThroughComposer(root, question));
    presets.appendChild(button);
  }
}

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function errorCode(error: unknown) {
  if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) return "permission";
  return error instanceof Error ? error.message : "voice_unavailable";
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number, code: string) {
  let timer = 0;
  return new Promise<T>((resolve, reject) => {
    timer = window.setTimeout(() => reject(new Error(code)), milliseconds);
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); },
    );
  });
}

function filenameForVoice(type: string) {
  const mediaType = type.toLowerCase();
  if (mediaType.includes("mp4") || mediaType.includes("m4a")) return "atlas-voice.m4a";
  if (mediaType.includes("webm")) return "atlas-voice.webm";
  if (mediaType.includes("ogg")) return "atlas-voice.ogg";
  if (mediaType.includes("mpeg")) return "atlas-voice.mp3";
  return "atlas-voice.wav";
}

function ensureVoiceErrorNode(root: HTMLElement) {
  let node = root.querySelector<HTMLElement>(".atlas-ai-voice-recovery-error");
  if (node) return node;
  node = document.createElement("p");
  node.className = "atlas-ai-error atlas-ai-voice-recovery-error";
  node.setAttribute("role", "alert");
  node.hidden = true;
  const composer = root.querySelector(".atlas-ai-composer");
  composer?.insertAdjacentElement("afterend", node);
  return node;
}

function installReliableDictation(root: HTMLElement, locale: UiLocale) {
  const t = voiceCopy[locale];
  const errorNode = ensureVoiceErrorNode(root);
  let operation = 0;
  let capture: AtlasPcmCapture | null = null;
  let stream: MediaStream | null = null;
  let abortController: AbortController | null = null;
  let state: GuardState = "idle";
  let liveWatchdog = 0;

  const voiceButtons = () => Array.from(root.querySelectorAll<HTMLButtonElement>(
    ".atlas-ai-mic-button, .atlas-ai-dictate-button",
  ));

  const setState = (next: GuardState) => {
    state = next;
    root.dataset.atlasVoiceState = next;
    const recording = next === "recording";
    const waiting = next === "starting" || next === "transcribing";
    for (const button of voiceButtons()) {
      button.classList.toggle("is-on", recording);
      button.classList.toggle("is-loading", waiting);
      button.setAttribute("aria-busy", String(waiting));
      button.disabled = waiting;
      const label = next === "recording" ? t.stop : next === "starting" ? t.starting : next === "transcribing" ? t.transcribing : t.start;
      button.setAttribute("aria-label", label);
      if (button.classList.contains("atlas-ai-dictate-button")) {
        const span = button.querySelector("span:last-child");
        if (span) span.textContent = label;
      }
    }
  };

  const showError = (message: string | null) => {
    errorNode.textContent = message ?? "";
    errorNode.hidden = !message;
  };

  const release = (discard = true) => {
    operation += 1;
    abortController?.abort();
    abortController = null;
    const activeCapture = capture;
    capture = null;
    if (discard && activeCapture) void activeCapture.discard().catch(() => {});
    stopTracks(stream);
    stream = null;
    setState("idle");
  };

  const fail = (message: string) => {
    release(true);
    showError(message);
  };

  const transcribe = async (blob: Blob, currentOperation: number) => {
    const type = blob.type || "audio/wav";
    const form = new FormData();
    form.append("audio", new File([blob], filenameForVoice(type), { type }));
    form.append("locale", locale);
    abortController = new AbortController();
    const request = fetch("/api/atlas-ai/transcribe", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      body: form,
      signal: abortController.signal,
    });
    const response = await withTimeout(request, 40_000, "voice_timeout");
    const payload = await response.json() as { text?: string; error?: string };
    if (currentOperation !== operation) return null;
    if (!response.ok || !payload.text?.trim()) {
      if (payload.error === "no_speech" || payload.error === "unclear_speech") throw new Error("no_speech");
      if (payload.error === "rate_limited") throw new Error("busy");
      throw new Error("voice_unavailable");
    }
    return payload.text.trim();
  };

  const stopRecording = async () => {
    if (state !== "recording" || !capture) return;
    const currentOperation = operation;
    const activeCapture = capture;
    const activeStream = stream;
    capture = null;
    stream = null;
    setState("transcribing");
    try {
      const blob = await withTimeout(activeCapture.stop(), 8_000, "voice_timeout");
      stopTracks(activeStream);
      if (currentOperation !== operation) return;
      if (blob.size < 32) throw new Error("no_speech");
      const text = await transcribe(blob, currentOperation);
      if (!text || currentOperation !== operation) return;
      fillComposer(root, text);
      showError(null);
      setState("idle");
      abortController = null;
    } catch (caught) {
      stopTracks(activeStream);
      const code = errorCode(caught);
      fail(code === "no_speech" ? t.noSpeech : code === "busy" ? t.busy : code === "permission" ? t.permission : code === "voice_timeout" ? t.busy : t.unavailable);
    }
  };

  const startRecording = async () => {
    if (state === "recording") {
      await stopRecording();
      return;
    }
    if (state !== "idle") return;
    if (!atlasPcmCaptureSupported()) {
      fail(t.unavailable);
      return;
    }

    showError(null);
    const currentOperation = ++operation;
    setState("starting");
    let mediaPromise: Promise<MediaStream> | null = null;
    let capturePromise: Promise<AtlasPcmCapture> | null = null;
    try {
      mediaPromise = navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const acquired = await withTimeout(mediaPromise, 12_000, "voice_timeout");
      if (currentOperation !== operation) {
        stopTracks(acquired);
        return;
      }
      stream = acquired;
      capturePromise = startAtlasPcmCapture(acquired);
      const started = await withTimeout(capturePromise, 8_000, "voice_timeout");
      if (currentOperation !== operation) {
        void started.discard().catch(() => {});
        stopTracks(acquired);
        return;
      }
      capture = started;
      setState("recording");
    } catch (caught) {
      if (mediaPromise) void mediaPromise.then((lateStream) => {
        if (currentOperation !== operation || state !== "recording") stopTracks(lateStream);
      }).catch(() => {});
      if (capturePromise) void capturePromise.then((lateCapture) => {
        if (currentOperation !== operation || state !== "recording") void lateCapture.discard().catch(() => {});
      }).catch(() => {});
      const code = errorCode(caught);
      fail(code === "permission" ? t.permission : code === "voice_timeout" ? t.busy : t.unavailable);
    }
  };

  const guardedClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>(".atlas-ai-mic-button, .atlas-ai-dictate-button");
    if (!button || !root.contains(button)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void startRecording();
  };

  const liveClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest(".atlas-ai-live-button")) return;
    if (liveWatchdog) window.clearTimeout(liveWatchdog);
    liveWatchdog = window.setTimeout(() => {
      const overlay = root.querySelector<HTMLElement>(".atlas-ai-live-overlay");
      const center = overlay?.querySelector<HTMLElement>(".atlas-ai-live-center");
      if (!overlay || !center?.classList.contains("is-starting")) return;
      showError(t.busy);
      overlay.querySelector<HTMLButtonElement>(".atlas-ai-live-topbar button")?.click();
    }, 12_000);
  };

  const recoverLiveFailure = () => {
    const overlay = root.querySelector<HTMLElement>(".atlas-ai-live-overlay");
    if (!overlay) {
      if (liveWatchdog) window.clearTimeout(liveWatchdog);
      liveWatchdog = 0;
      return;
    }
    const liveError = overlay.querySelector<HTMLElement>(".atlas-ai-live-error");
    if (!liveError?.textContent?.trim() || overlay.dataset.atlasRecoveryClosing === "1") return;
    overlay.dataset.atlasRecoveryClosing = "1";
    showError(liveError.textContent.trim());
    queueMicrotask(() => overlay.querySelector<HTMLButtonElement>(".atlas-ai-live-topbar button")?.click());
  };

  root.addEventListener("click", guardedClick, true);
  root.addEventListener("click", liveClick, true);
  setState("idle");

  return {
    recoverLiveFailure,
    cleanup: () => {
      root.removeEventListener("click", guardedClick, true);
      root.removeEventListener("click", liveClick, true);
      if (liveWatchdog) window.clearTimeout(liveWatchdog);
      release(true);
      delete root.dataset.atlasVoiceState;
      errorNode.remove();
    },
  };
}

export function AtlasAiClient(props: AtlasAiClientProps) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".atlas-ai-card");
    if (!root) return;
    root.dataset.atlasAiClient = "v5-stable";
    const voice = installReliableDictation(root, props.locale);

    let queued = false;
    const run = () => {
      queued = false;
      enhanceTables(root, props.locale);
      if (props.locale === "ku") polishSorani(root);
      voice.recoverLiveFailure();
    };
    const schedule = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(run);
    };

    run();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      voice.cleanup();
      delete root.dataset.atlasAiClient;
    };
  }, [props.locale]);

  return (
    <>
      <AtlasAiClientV4 {...props} />
      <style>{`
        .atlas-ai-card[data-atlas-ai-client="v5-stable"]{isolation:isolate}
        .atlas-ai-card[data-atlas-ai-client="v5-stable"] :is(button,textarea){touch-action:manipulation;-webkit-tap-highlight-color:transparent}
        .atlas-ai-card[data-atlas-ai-client="v5-stable"] :is(button,textarea):focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        .atlas-ai-card[data-atlas-ai-client="v5-stable"] .atlas-ai-thread{overscroll-behavior:contain;scroll-padding-block:18px}
        .atlas-ai-card[data-atlas-ai-client="v5-stable"] .atlas-ai-message{overflow-wrap:anywhere}
        .atlas-ai-card[data-atlas-ai-client="v5-stable"] .atlas-ai-message.is-user{unicode-bidi:plaintext}
        .atlas-ai-card[data-atlas-ai-client="v5-stable"] .atlas-ai-rich-text{min-width:0}
        .atlas-ai-card[data-atlas-ai-client="v5-stable"] .atlas-ai-presets{max-width:920px;margin-inline:auto}
        .atlas-ai-card[data-atlas-ai-client="v5-stable"] .atlas-ai-presets button{white-space:normal;line-height:1.4;text-wrap:balance}

        .atlas-ai-card[data-atlas-ai-client="v5-stable"] .atlas-ai-composer-actions{align-self:center;align-items:center;justify-content:center}
        .atlas-ai-card[data-atlas-ai-client="v5-stable"] :is(.atlas-ai-mic-button,.atlas-ai-send-button){align-self:center;display:grid;place-items:center;padding:0;margin:0;line-height:1}
        .atlas-ai-card[data-atlas-ai-client="v5-stable"] :is(.atlas-ai-mic-button,.atlas-ai-send-button) svg{display:block;margin:0}
        .atlas-ai-card[data-atlas-ai-client="v5-stable"][data-atlas-voice-state="recording"] .atlas-ai-mic-button{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}
        .atlas-ai-card[data-atlas-ai-client="v5-stable"][data-atlas-voice-state="starting"] .atlas-ai-composer,
        .atlas-ai-card[data-atlas-ai-client="v5-stable"][data-atlas-voice-state="transcribing"] .atlas-ai-composer{border-color:rgba(18,165,111,.5);box-shadow:0 0 0 3px rgba(18,165,111,.07)}
        .atlas-ai-voice-recovery-error{margin:7px 3px 0!important}

        .atlas-ai-table-wrap{width:100%;margin-top:9px;overflow-x:auto;overscroll-behavior-inline:contain;border:1px solid var(--line);border-radius:13px;background:var(--surface);box-shadow:0 1px 2px rgba(15,33,26,.03)}
        .atlas-ai-table{width:100%;min-width:560px;border-collapse:collapse;font-size:11.5px;line-height:1.48;color:var(--ink)}
        .atlas-ai-table th,.atlas-ai-table td{padding:9px 10px;text-align:start;vertical-align:top;border-bottom:1px solid var(--line);border-inline-end:1px solid var(--line);white-space:normal}
        .atlas-ai-table th{background:var(--surface-soft);font-size:10px;font-weight:850;color:var(--ink-soft);white-space:nowrap}
        .atlas-ai-table th:last-child,.atlas-ai-table td:last-child{border-inline-end:0}
        .atlas-ai-table tbody tr:last-child td{border-bottom:0}
        .atlas-ai-table-wrap:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        [dir="rtl"] .atlas-ai-table{direction:rtl}

        :root[data-theme="dark"] .atlas-ai-table-wrap{background:var(--surface);border-color:var(--line-strong)}
        :root[data-theme="dark"] .atlas-ai-table th{background:var(--surface-soft)}
        @media(prefers-color-scheme:dark){:root[data-theme="system"] .atlas-ai-table-wrap{background:var(--surface);border-color:var(--line-strong)}:root[data-theme="system"] .atlas-ai-table th{background:var(--surface-soft)}}

        @media(min-width:760px){
          .atlas-ai-card[data-atlas-ai-client="v5-stable"] .atlas-ai-presets{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
          .atlas-ai-card[data-atlas-ai-client="v5-stable"] .atlas-ai-presets button{max-width:360px}
        }
        @media(min-width:721px) and (max-width:1400px){
          .atlas-ai-page{width:min(1080px,calc(100% - 32px))}
          .atlas-ai-card[data-atlas-ai-client="v5-stable"]{min-height:calc(100dvh - 205px)}
          .atlas-ai-card[data-atlas-ai-client="v5-stable"] .atlas-ai-thread{max-height:min(58dvh,650px)}
        }
        @media(max-width:720px){
          .atlas-ai-card[data-atlas-ai-client="v5-stable"]{min-height:calc(100dvh - 150px);border-radius:18px;padding:15px}
          .atlas-ai-card[data-atlas-ai-client="v5-stable"] .atlas-ai-heading{gap:10px}
          .atlas-ai-card[data-atlas-ai-client="v5-stable"] .atlas-ai-heading h1{font-size:27px}
          .atlas-ai-card[data-atlas-ai-client="v5-stable"] .atlas-ai-thread{max-height:none;min-height:300px;padding-inline:0}
          .atlas-ai-card[data-atlas-ai-client="v5-stable"] .atlas-ai-message{width:min(94%,690px)}
          .atlas-ai-card[data-atlas-ai-client="v5-stable"] .atlas-ai-presets{display:grid;grid-template-columns:1fr;width:100%;gap:7px}
          .atlas-ai-card[data-atlas-ai-client="v5-stable"] .atlas-ai-presets button{width:100%;max-width:none;text-align:start;border-radius:13px;padding:11px 12px}
          .atlas-ai-card[data-atlas-ai-client="v5-stable"] .atlas-ai-composer-actions{align-self:center}
          .atlas-ai-table{min-width:520px;font-size:11px}
          .atlas-ai-table th,.atlas-ai-table td{padding:8px}
        }
        @media(prefers-reduced-motion:reduce){.atlas-ai-card[data-atlas-ai-client="v5-stable"] *{scroll-behavior:auto!important}}
      `}</style>
    </>
  );
}