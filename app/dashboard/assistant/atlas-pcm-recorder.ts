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

function audioContextConstructor() {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? (window as WebkitAudioWindow).webkitAudioContext ?? null;
}

export function atlasPcmCaptureSupported() {
  return Boolean(audioContextConstructor()) && Boolean(navigator.mediaDevices?.getUserMedia);
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
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
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

export async function startAtlasPcmCapture(
  stream: MediaStream,
  onLevel?: (level: number) => void,
): Promise<AtlasPcmCapture> {
  const Context = audioContextConstructor();
  if (!Context) throw new Error("audio_context_unavailable");

  const context = new Context();
  if (context.state === "suspended") await context.resume();

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

    if (onLevel) {
      const now = performance.now();
      if (now - lastLevelAt >= 80) {
        let sum = 0;
        for (let index = 0; index < channel.length; index += 1) {
          const value = channel[index] ?? 0;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / Math.max(1, channel.length));
        onLevel(Math.min(1, rms * 9));
        lastLevelAt = now;
      }
    }
  };

  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(context.destination);

  async function close(discard: boolean) {
    if (closed) return discard ? null : encodeWav(new Float32Array(), TARGET_SAMPLE_RATE);
    closed = true;
    processor.onaudioprocess = null;
    try { source.disconnect(); } catch {}
    try { processor.disconnect(); } catch {}
    try { silentGain.disconnect(); } catch {}
    if (context.state !== "closed") await context.close();
    onLevel?.(0);
    if (discard) return null;

    const flattened = flatten(chunks);
    const resampled = resampleLinear(flattened, context.sampleRate, TARGET_SAMPLE_RATE);
    return encodeWav(resampled, TARGET_SAMPLE_RATE);
  }

  return {
    startedAt: performance.now(),
    stop: async () => (await close(false)) ?? encodeWav(new Float32Array(), TARGET_SAMPLE_RATE),
    discard: async () => { await close(true); },
  };
}
