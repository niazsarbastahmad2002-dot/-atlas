const SAMPLE_URL = "https://huggingface.co/RegaLabs/RegaLabs-TTS/resolve/main/samples/aran_en021.wav";
const EXPECTED = "دەنگێکی لەسەرخۆ، هێمن و پڕ لە بڕوابەخۆبوون.";
const MAX_ACCEPTABLE_CER = 0.4;

function normalizedText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\s\u200c\u200d]+/g, "")
    .replace(/[.,!?؟،؛:;"'“”‘’()\[\]{}\-_ـ]/g, "");
}

function levenshtein(a, b) {
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

function characterErrorRate(expected, actual) {
  const target = normalizedText(expected);
  const candidate = normalizedText(actual);
  if (!target.length) return 1;
  return levenshtein(target, candidate) / target.length;
}

async function main() {
  if (process.env.VERCEL_ENV !== "preview") {
    console.log("Kurdish STT preview smoke: skipped outside preview");
    return;
  }

  const apiKey = String(process.env.ATLAS_KURDISH_STT_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("Kurdish STT preview smoke: missing server-side key");

  const audioResponse = await fetch(SAMPLE_URL, {
    redirect: "follow",
    signal: AbortSignal.timeout(25_000),
  });
  if (!audioResponse.ok) throw new Error(`Kurdish STT preview smoke: sample fetch failed (${audioResponse.status})`);

  const bytes = await audioResponse.arrayBuffer();
  const contentType = audioResponse.headers.get("content-type") || "audio/wav";
  const file = new File([bytes], "sorani-reference.wav", { type: contentType });
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("dialect", "sorani");

  const response = await fetch("https://www.kurdishtts.com/api/stt-proxy", {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: form,
    signal: AbortSignal.timeout(35_000),
  });
  if (!response.ok) throw new Error(`Kurdish STT preview smoke: provider failed (${response.status})`);

  const payload = await response.json();
  const text = typeof payload?.text === "string" ? payload.text.trim() : "";
  if (!text) throw new Error("Kurdish STT preview smoke: provider returned no transcript");

  const cer = characterErrorRate(EXPECTED, text);
  if (cer > MAX_ACCEPTABLE_CER) {
    throw new Error(`Kurdish STT preview smoke: accuracy failed (CER ${cer.toFixed(3)})`);
  }

  console.log(`Kurdish STT preview smoke: PASS (CER ${cer.toFixed(3)})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Kurdish STT preview smoke failed");
  process.exit(1);
});
