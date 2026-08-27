import { NextResponse } from "next/server";
import { atlasKurdishSttConfig, transcribeWithAtlasKurdishStt } from "@/lib/atlas-kurdish-stt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FLEURS_FIRST_ROWS = "https://datasets-server.huggingface.co/first-rows?dataset=google%2Ffleurs&config=ckb_iq&split=test";
const SAMPLE_COUNT = 3;
const MAX_ACCEPTABLE_CER = 0.35;

type FleursRow = {
  row?: {
    audio?: { src?: string; path?: string };
    transcription?: string;
  };
};

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
    const datasetResponse = await fetch(FLEURS_FIRST_ROWS, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!datasetResponse.ok) return privateJson({ ok: false, stage: "dataset" }, 502);

    const payload = await datasetResponse.json() as { rows?: FleursRow[] };
    const rows = (payload.rows ?? [])
      .map((item) => item.row)
      .filter((row): row is NonNullable<FleursRow["row"]> => Boolean(row?.audio?.src && row.transcription))
      .slice(0, SAMPLE_COUNT);

    if (rows.length < SAMPLE_COUNT) return privateJson({ ok: false, stage: "samples", tested: rows.length }, 502);

    const results = [] as Array<{ cer: number; pass: boolean }>;
    for (const row of rows) {
      const source = String(row.audio?.src ?? "");
      const audioResponse = await fetch(source, {
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      if (!audioResponse.ok) {
        results.push({ cer: 1, pass: false });
        continue;
      }

      const bytes = await audioResponse.arrayBuffer();
      const filename = row.audio?.path?.split("/").pop() || "sorani-sample.wav";
      const contentType = audioResponse.headers.get("content-type") || "audio/wav";
      const file = new File([bytes], filename, { type: contentType });
      const transcript = await transcribeWithAtlasKurdishStt(file, "ku");
      if (!transcript?.text) {
        results.push({ cer: 1, pass: false });
        continue;
      }

      const cer = characterErrorRate(String(row.transcription), transcript.text);
      results.push({ cer, pass: cer <= MAX_ACCEPTABLE_CER });
    }

    const passed = results.filter((result) => result.pass).length;
    const averageCer = results.reduce((sum, result) => sum + result.cer, 0) / Math.max(results.length, 1);
    return privateJson({
      ok: passed >= 2,
      tested: results.length,
      passed,
      averageCer: Number(averageCer.toFixed(3)),
      threshold: MAX_ACCEPTABLE_CER,
    });
  } catch {
    return privateJson({ ok: false, stage: "runtime" }, 500);
  }
}
