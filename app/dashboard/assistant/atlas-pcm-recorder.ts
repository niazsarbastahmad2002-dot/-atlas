"use client";

type WebkitAudioWindow = typeof window & {
  webkitAudioContext?: typeof AudioContext;
};

export type AtlasPcmCapture = {
  stop: () => Promise<Blob>;
  discard: () => Promise<void>;
  startedAt: number;
};

const TARGET_SAMPLE_RATE = 16_000;
const RECORDER_STOP_TIMEOUT_MS = 3_500;

function audioContextConstructor() {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? (window as WebkitAudioWindow).webkitAudioContext ?? null;
}

function appleMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/i.test(ua)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function atlasPcmCaptureSupported() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
  return typeof MediaRecorder !== "undefined" || Boolean(audioContextConstructor());
}

function preferredRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/mp4",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

async function startMediaRecorderCapture(
  stream: MediaStream,
  onLevel?: (level: number) => void,
): Promise<AtlasPcmCapture> {
  if (typeof MediaRecorder === "undefined") throw new Error("media_recorder_unavailable");
  const mimeType = preferredRecorderMimeType();
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  let settled = false;
  let resolveStop: ((blob: Blob | null) => void) | null = null;
  let discardOnStop = false;
  let stopTimer: number | null = null;

  const clearStopTimer = () => {
    if (stopTimer !== null) {
      window.clearTimeout(stopTimer);
      stopTimer = null;
    }
  };

  const settleStop = (blob: Blob | null) => {
    if (!resolveStop || settled) return;
    settled = true;
    clearStopTimer();
    onLevel?.(0);
    const resolve = resolveStop;
    resolveStop = null;
    resolve(blob);
  };

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
      onLevel?.(0.2);
    }
  };
  recorder.onerror = () => settleStop(null);
  recorder.onstop = () => {
    const blob = discardOnStop
      ? null
      : new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/mp4" });
    settleStop(blob);
  };

  recorder.start(250);

  async function finish(discard: boolean) {
    if (recorder.state === "inactive") {
      if (discard) return null;
      return new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/mp4" });
    }
    discardOnStop = discard;
    settled = false;
    return await new Promise<Blob | null>((resolve) => {
      resolveStop = resolve;
      stopTimer = window.setTimeout(() => {
        const fallback = discardOnStop
          ? null
          : new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/mp4" });
        settleStop(fallback);
      }, RECORDER_STOP_TIMEOUT_MS);
      try {
        recorder.requestData();
      } catch {}
      try {
        recorder.stop();
      } catch {
        settleStop(discardOnStop ? null : new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/mp4" }));
      }
    });
  }

  return {
    startedAt: performance.now(),
    stop: async () => (await finish(false)) ?? new Blob([], { type: recorder.mimeType || mimeType || "audio/mp4" }),
    discard: async () => { await finish(true); },
  };
}

function flatten(chunks: Float32Array[]) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function resampleLinear(input: Float32Array, sourceRate: number, targetRate: number) {
  if (!input.length || sourceRate === targetRate) return input;
  const ratio = sourceRate / targetRate;
  const length = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const position = index * ratio;
    const leftIndex = Math.floor(position);
    const rightIndex = Math.min(input.length - 1, leftIndex + 1);
    const fraction = position - leftIndex;
    output[index] = (input[leftIndex] ?? 0) * (1 - fraction) + (input[rightIndex] ?? 0) * fraction;
  }
  return output;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}

function encodeWav(samples: Float32Array, sampleRate: number) {
  const bytesPerSample = 2;
  const dataLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (const value of samples) {
    const clamped = Math.max(-1, Math.min(1, value));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

async function startPcmCapture(
  stream: MediaStream,
  onLevel?: (level: number) => void,
): Promise<AtlasPcmCapture> {
  const Context = audioContextConstructor();
  if (!Context) throw new Error("audio_context_unavailable");

  const context = new Context();
  if (context.state === "suspended") await context.resume();
  if (context.state !== "running") {
    await context.close();
    throw new Error("audio_context_suspended");
  }

  const sourceSampleRate = context.sampleRate;
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const silentGain = context.createGain();
  silentGain.gain.value = 0;
  const chunks: Float32Array[] = [];
  let closed = false;
  let lastLevelAt = 0;

  processor.onaudioprocess = (event) => {
    if (closed) return;
    const channel = event.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(channel));
    if (!onLevel) return;
    const now = performance.now();
    if (now - lastLevelAt < 80) return;
    let sum = 0;
    for (let index = 0; index < channel.length; index += 1) {
      const value = channel[index] ?? 0;
      sum += value * value;
    }
    onLevel(Math.min(1, Math.sqrt(sum / Math.max(1, channel.length)) * 9));
    lastLevelAt = now;
  };

  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(context.destination);

  async function close(discard: boolean) {
    if (closed) return null;
    closed = true;
    processor.onaudioprocess = null;
    try { source.disconnect(); } catch {}
    try { processor.disconnect(); } catch {}
    try { silentGain.disconnect(); } catch {}
    const flattened = flatten(chunks);
    const resampled = discard ? null : resampleLinear(flattened, sourceSampleRate, TARGET_SAMPLE_RATE);
    if (context.state !== "closed") await context.close();
    onLevel?.(0);
    return resampled ? encodeWav(resampled, TARGET_SAMPLE_RATE) : null;
  }

  return {
    startedAt: performance.now(),
    stop: async () => (await close(false)) ?? encodeWav(new Float32Array(), TARGET_SAMPLE_RATE),
    discard: async () => { await close(true); },
  };
}

export async function startAtlasPcmCapture(
  stream: MediaStream,
  onLevel?: (level: number) => void,
): Promise<AtlasPcmCapture> {
  if (appleMobileBrowser() && typeof MediaRecorder !== "undefined") {
    return startMediaRecorderCapture(stream, onLevel);
  }
  try {
    return await startPcmCapture(stream, onLevel);
  } catch {
    if (typeof MediaRecorder !== "undefined") return startMediaRecorderCapture(stream, onLevel);
    throw new Error("voice_capture_unavailable");
  }
}
