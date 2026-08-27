import { NextResponse } from "next/server";
import { atlasKurdishSttConfig, transcribeWithAtlasKurdishStt } from "@/lib/atlas-kurdish-stt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Preview-only accuracy probe. Remove before merge to main.
const SAMPLE_URL = "https://huggingface.co/RegaLabs/RegaLabs-TTS/resolve/main/samples/aran_en021.wav";
const EXPECTED = "دەنگێکی لەسەرخۆ، هێمن و پڕ لە بڕوابەخۆبوون.";
const MAX_ACCEPTABLE_CER = 0.4;

function normalizedText(value: string) {
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\s\u200c\u200d]+/g, "")
    .replace(/[.,!?؟،؛:;"'“”‘’()\[\]{}\-_ـ]/g, "");
}

function levenshtein(a: string, b: string) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + cost);
      diagonal = above;
    }
  }
  return previous[b.length];
}

function characterErrorRate(expected: string, actual: string) {
  const target = normalizedText(expected);
  const candidate = normalizedText(actual);
  if (!target.length) return 1;
  return levenshtein(target, candidate) / target.length;
}

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return privateJson({ error: "not_found" }, 404);
  }
  if (!atlasKurdishSttConfig()) {
    return privateJson({ ok: false, stage: "config" }, 503);
  }

  try {
    const audioResponse = await fetch(SAMPLE_URL, {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
    });
    if (!audioResponse.ok) return privateJson({ ok: false, stage: "sample" }, 502);

    const bytes = await audioResponse.arrayBuffer();
    const contentType = audioResponse.headers.get("content-type") || "audio/wav";
    const file = new File([bytes], "sorani-reference.wav", { type: contentType });
    const transcript = await transcribeWithAtlasKurdishStt(file, "ku");
    if (!transcript?.text) return privateJson({ ok: false, stage: "provider" }, 502);

    const cer = characterErrorRate(EXPECTED, transcript.text);
    return privateJson({
      ok: cer <= MAX_ACCEPTABLE_CER,
      tested: 1,
      averageCer: Number(cer.toFixed(3)),
      threshold: MAX_ACCEPTABLE_CER,
      transcriptLength: transcript.text.length,
    }, cer <= MAX_ACCEPTABLE_CER ? 200 : 422);
  } catch {
    return privateJson({ ok: false, stage: "runtime" }, 500);
  }
}
