"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import type { UiLocale } from "@/lib/i18n/ui";

type AtlasAiClientProps = {
  clinicId: string;
  clinicName: string;
  locale: UiLocale;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: "model" | "atlas_core";
};

type VoiceStage = "idle" | "listening" | "transcribing" | "thinking" | "speaking";
type RecordingPurpose = "dictation" | "live";

type Copy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  beta: string;
  privacy: string;
  placeholder: string;
  send: string;
  thinking: string;
  examples: string;
  error: string;
  unavailable: string;
  budget: string;
  busy: string;
  newChat: string;
  dictate: string;
  stopDictation: string;
  dictateHint: string;
  liveVoice: string;
  liveTitle: string;
  liveHint: string;
  listening: string;
  transcribing: string;
  speaking: string;
  sendNow: string;
  interrupt: string;
  continueVoice: string;
  endVoice: string;
  voiceUnavailable: string;
  voicePermission: string;
  noSpeech: string;
  voiceOutputApproximate: string;
  replay: string;
  you: string;
  presets: string[];
};

const copy: Record<UiLocale, Copy> = {
  en: {
    eyebrow: "Your Atlas assistant",
    title: "Atlas AI",
    subtitle: "A simple clinic assistant for conversation, planning, writing, translation, and day-to-day Atlas work.",
    beta: "Beta · read-only",
    privacy: "Atlas sends this conversation plus aggregated appointment statistics to the AI provider. Do not include patient names, phone numbers, message contents, or patient-specific clinical information.",
    placeholder: "Message Atlas AI…",
    send: "Send",
    thinking: "Thinking…",
    examples: "Try asking",
    error: "Atlas AI could not answer that right now.",
    unavailable: "Atlas AI is not available right now.",
    budget: "Atlas AI's current AI budget is unavailable.",
    busy: "Atlas AI is busy. Try again shortly.",
    newChat: "New chat",
    dictate: "Dictate",
    stopDictation: "Stop dictation",
    dictateHint: "Speak, review the text, then tap Send yourself.",
    liveVoice: "Live voice",
    liveTitle: "Atlas Voice",
    liveHint: "Talk naturally. Atlas listens, answers, and then listens again.",
    listening: "Listening",
    transcribing: "Writing what you said…",
    speaking: "Atlas is speaking",
    sendNow: "Send now",
    interrupt: "Interrupt",
    continueVoice: "Continue",
    endVoice: "End",
    voiceUnavailable: "Voice is not available right now. Check microphone access and try again.",
    voicePermission: "Atlas needs microphone permission for voice.",
    noSpeech: "I didn't catch any speech. Try again.",
    voiceOutputApproximate: "This device does not have a native Kurdish voice, so Atlas is using the closest available voice.",
    replay: "Listen",
    you: "You",
    presets: [
      "How busy are we today?",
      "What should reception pay attention to today?",
      "Explain what Atlas AI can do.",
      "Help me write a polite appointment message.",
    ],
  },
  ku: {
    eyebrow: "یاریدەدەری Atlas",
    title: "Atlas AI",
    subtitle: "یاریدەدەرێکی سادەی کلینیک بۆ گفتوگۆ، پلان، نووسین، وەرگێڕان و کاری ڕۆژانەی Atlas.",
    beta: "Beta · تەنها خوێندنەوە",
    privacy: "Atlas ئەم گفتوگۆیە لەگەڵ ئاماری کۆکراوەی مەوعیدەکان دەنێرێت بۆ دابینکەری AI. ناوی نەخۆش، ژمارەی مۆبایل، ناوەڕۆکی نامە یان زانیاری پزیشکی تایبەت بە نەخۆش مەنووسە.",
    placeholder: "نامە بۆ Atlas AI…",
    send: "بنێرە",
    thinking: "بیر دەکاتەوە…",
    examples: "ئەم پرسیارانە تاقی بکەوە",
    error: "Atlas AI ئێستا نەیتوانی وەڵام بداتەوە.",
    unavailable: "Atlas AI ئێستا بەردەست نییە.",
    budget: "بودجەی AI بۆ ئێستا بەردەست نییە.",
    busy: "Atlas AI ئێستا سەرقاڵە. کەمێکی تر هەوڵ بدەرەوە.",
    newChat: "گفتوگۆی نوێ",
    dictate: "دەنگ بۆ نووسین",
    stopDictation: "وەستاندنی نووسین",
    dictateHint: "قسە بکە، نووسینەکە ببینە، پاشان خۆت بنێرە.",
    liveVoice: "گفتوگۆی دەنگی",
    liveTitle: "دەنگی Atlas",
    liveHint: "بە ئاسایی قسە بکە. Atlas گوێ دەگرێت، وەڵام دەداتەوە و دووبارە گوێ دەگرێت.",
    listening: "گوێ دەگرێت",
    transcribing: "قسەکەت دەنووسێت…",
    speaking: "Atlas قسە دەکات",
    sendNow: "ئێستا بنێرە",
    interrupt: "بوەستێنە",
    continueVoice: "بەردەوام بە",
    endVoice: "کۆتایی",
    voiceUnavailable: "دەنگ ئێستا بەردەست نییە. ڕێگەی مایکرۆفۆن بپشکنە و دووبارە هەوڵ بدە.",
    voicePermission: "Atlas پێویستی بە ڕێگەی مایکرۆفۆن هەیە.",
    noSpeech: "هیچ قسەیەکم نەگرت. دووبارە هەوڵ بدە.",
    voiceOutputApproximate: "ئەم ئامێرە دەنگی کوردیی خۆماڵی نییە، بۆیە Atlas نزیکترین دەنگی بەردەست بەکاردەهێنێت.",
    replay: "گوێ بگرە",
    you: "تۆ",
    presets: [
      "ئەمڕۆ چەند قەرەباڵغین؟",
      "ئەمڕۆ ڕیسێپشن سەرنجی لە چی بێت؟",
      "Atlas AI چی دەتوانێت بکات؟",
      "یارمەتیم بدە نامەیەکی ڕێک بۆ مەوعید بنووسم.",
    ],
  },
  bd: {
    eyebrow: "هاریکارێ Atlas",
    title: "Atlas AI",
    subtitle: "هاریکارەکێ سادە یێ کلینیکێ بۆ گفتوگۆ، پلان، نڤیسین، وەرگێڕان و کارێ ڕۆژانە یێ Atlas.",
    beta: "Beta · تەنێ خواندن",
    privacy: "Atlas ئەڤ گفتوگۆیێ ل گەل ئامارێن کۆمکری یێن مەوعیدان دفرێنیت بۆ دابینکەرێ AI. ناڤێ نەخۆشی، ژمارا موبایلێ، ناڤەروکا پەیامان یان زانیاریێن پزیشکی یێن تایبەت ب نەخۆشی مەنووسە.",
    placeholder: "پەیام بۆ Atlas AI…",
    send: "بفرێنە",
    thinking: "هزر دکەت…",
    examples: "ڤان پسیاران تاقی بکە",
    error: "Atlas AI نها نەشیا بەرسڤ بدەت.",
    unavailable: "Atlas AI نها بەردەست نینە.",
    budget: "بودجەیا AI بۆ نها بەردەست نینە.",
    busy: "Atlas AI نها مژوولە. پشتی کەمەکێ دووبارە هەول بدە.",
    newChat: "گفتوگۆیا نوی",
    dictate: "دەنگ بۆ نڤیسینێ",
    stopDictation: "نڤیسینا دەنگی بوەستینە",
    dictateHint: "باخڤە، نڤیسینێ ببینە، پاشی خۆ بفرێنە.",
    liveVoice: "گفتوگۆیا دەنگی",
    liveTitle: "دەنگێ Atlas",
    liveHint: "ب ئاسایی باخڤە. Atlas گوهدار دکەت، بەرسڤ ددەت و دیسان گوهدار دکەت.",
    listening: "گوهدار دکەت",
    transcribing: "ئاخفتنا تە دنڤیسیت…",
    speaking: "Atlas دئاخڤیت",
    sendNow: "نها بفرێنە",
    interrupt: "بوەستینە",
    continueVoice: "بەردەوام بە",
    endVoice: "دوماهیک",
    voiceUnavailable: "دەنگ نها بەردەست نینە. ڕێکا مایکرۆفۆنێ بپشکنە و دیسان هەول بدە.",
    voicePermission: "Atlas پێدڤی ب ڕێکا مایکرۆفۆنێ هەیە.",
    noSpeech: "من هیچ ئاخفتنەک نەگرت. دیسان هەول بدە.",
    voiceOutputApproximate: "ڤی ئامێری دەنگەکێ کوردی یێ خۆماڵی نینە، لەورا Atlas نزیکترین دەنگێ بەردەست ب کار دئینیت.",
    replay: "گوهدار بکە",
    you: "تو",
    presets: [
      "ئەڤرۆ چەند قەرەبالغین؟",
      "ئەڤرۆ ڕیسێپشن بالێ خۆ بدەتە چی؟",
      "Atlas AI چ دکاریت بکەت؟",
      "هاریکاریا من بکە پەیامەکا جوان بۆ مەوعیدێ بنڤیسم.",
    ],
  },
  ar: {
    eyebrow: "مساعد Atlas",
    title: "Atlas AI",
    subtitle: "مساعد عيادة بسيط للمحادثة، التخطيط، الكتابة، الترجمة وشغل Atlas اليومي.",
    beta: "Beta · للقراءة فقط",
    privacy: "Atlas يرسل هالمحادثة ويّا إحصائيات مجمعة للمواعيد إلى مزود AI. لا تكتب اسم المريض أو رقم الهاتف أو محتوى الرسائل أو معلومات طبية خاصة بمريض.",
    placeholder: "اكتب لـ Atlas AI…",
    send: "إرسال",
    thinking: "يفكر…",
    examples: "جرّب سؤال",
    error: "Atlas AI ما قدر يجاوب حالياً.",
    unavailable: "Atlas AI غير متاح حالياً.",
    budget: "ميزانية الذكاء الاصطناعي غير متاحة حالياً.",
    busy: "Atlas AI مشغول حالياً. حاول بعد قليل.",
    newChat: "محادثة جديدة",
    dictate: "إملاء صوتي",
    stopDictation: "إيقاف الإملاء",
    dictateHint: "احچي، راجع الكلام المكتوب، وبعدين إنت اضغط إرسال.",
    liveVoice: "محادثة صوتية",
    liveTitle: "صوت Atlas",
    liveHint: "احچي بشكل طبيعي. Atlas يسمعك، يجاوب، وبعدين يسمعك مرة ثانية.",
    listening: "أسمعك",
    transcribing: "أكتب كلامك…",
    speaking: "Atlas يحچي",
    sendNow: "إرسال هسه",
    interrupt: "قاطعه",
    continueVoice: "كمل",
    endVoice: "إنهاء",
    voiceUnavailable: "الصوت غير متاح حالياً. تأكد من إذن المايكروفون وحاول مرة ثانية.",
    voicePermission: "Atlas يحتاج إذن المايكروفون حتى يستخدم الصوت.",
    noSpeech: "ما التقطت كلام. حاول مرة ثانية.",
    voiceOutputApproximate: "هذا الجهاز ما بي صوت كردي أصلي، لذلك Atlas يستخدم أقرب صوت متاح.",
    replay: "اسمع",
    you: "إنت",
    presets: [
      "شلون زحمة العيادة اليوم؟",
      "على شنو لازم يركز الاستقبال اليوم؟",
      "شنو يگدر يسوي Atlas AI؟",
      "ساعدني أكتب رسالة موعد لطيفة.",
    ],
  },
};

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function speechLanguage(locale: UiLocale) {
  if (locale === "ar") return "ar-IQ";
  if (locale === "ku" || locale === "bd") return "ku-IQ";
  return "en-US";
}

function chooseRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/mp4",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function microphoneSupported() {
  return typeof window !== "undefined"
    && typeof MediaRecorder !== "undefined"
    && Boolean(navigator.mediaDevices?.getUserMedia);
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="3" width="8" height="12" rx="4" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 4 17 8-17 8 3-8-3-8Z" />
      <path d="M7 12h14" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10v4h4l5 4V6l-5 4H4Z" />
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </svg>
  );
}

function stripForSpeech(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^#{1,4}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inlineRichText(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
    : <span key={`${part}-${index}`}>{part}</span>);
}

function RichMessage({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  return (
    <div className="atlas-ai-rich-text">
      {lines.map((raw, index) => {
        const line = raw.trim();
        if (!line) return <div className="atlas-ai-text-gap" key={`gap-${index}`} />;
        if (/^#{1,4}\s+/.test(line)) {
          const value = line.replace(/^#{1,4}\s+/, "");
          return <h3 key={`h-${index}`}>{inlineRichText(value)}</h3>;
        }
        if (/^[-*]\s+/.test(line)) {
          const value = line.replace(/^[-*]\s+/, "");
          return (
            <div className="atlas-ai-bullet" key={`b-${index}`}>
              <span aria-hidden="true">•</span>
              <p>{inlineRichText(value)}</p>
            </div>
          );
        }
        return <p key={`p-${index}`}>{inlineRichText(line)}</p>;
      })}
    </div>
  );
}

export function AtlasAiClient({ clinicId, clinicName, locale }: AtlasAiClientProps) {
  const t = copy[locale];
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [liveVoice, setLiveVoice] = useState(false);
  const [voiceStage, setVoiceStage] = useState<VoiceStage>("idle");
  const [liveDisplayText, setLiveDisplayText] = useState("");
  const [approximateVoice, setApproximateVoice] = useState(false);

  const messagesRef = useRef<ChatMessage[]>([]);
  const loadingRef = useRef(false);
  const liveVoiceRef = useRef(false);
  const speakingRef = useRef(false);
  const speechCycleRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const discardRecordingRef = useRef(false);
  const silenceFrameRef = useRef<number | null>(null);
  const silenceContextRef = useRef<AudioContext | null>(null);
  const maxRecordingTimerRef = useRef<number | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  useEffect(() => () => {
    liveVoiceRef.current = false;
    speechCycleRef.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    const recorder = recorderRef.current;
    discardRecordingRef.current = true;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    liveStreamRef.current?.getTracks().forEach((track) => track.stop());
    liveStreamRef.current = null;
    if (silenceFrameRef.current !== null) cancelAnimationFrame(silenceFrameRef.current);
    void silenceContextRef.current?.close();
  }, []);

  function setLoadingValue(value: boolean) {
    loadingRef.current = value;
    setLoading(value);
  }

  function setLiveVoiceValue(value: boolean) {
    liveVoiceRef.current = value;
    setLiveVoice(value);
  }

  function cleanupSilenceWatch() {
    if (silenceFrameRef.current !== null) {
      cancelAnimationFrame(silenceFrameRef.current);
      silenceFrameRef.current = null;
    }
    if (maxRecordingTimerRef.current !== null) {
      window.clearTimeout(maxRecordingTimerRef.current);
      maxRecordingTimerRef.current = null;
    }
    const context = silenceContextRef.current;
    silenceContextRef.current = null;
    if (context && context.state !== "closed") void context.close();
  }

  function stopTracks(stream: MediaStream | null) {
    stream?.getTracks().forEach((track) => track.stop());
  }

  function stopCurrentRecording(discard = false) {
    discardRecordingRef.current = discard;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function startSilenceWatch(stream: MediaStream, purpose: RecordingPurpose) {
    cleanupSilenceWatch();
    maxRecordingTimerRef.current = window.setTimeout(() => stopCurrentRecording(false), 45_000);
    if (purpose !== "live" || typeof AudioContext === "undefined") return;

    try {
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(stream).connect(analyser);
      silenceContextRef.current = context;
      const samples = new Uint8Array(analyser.fftSize);
      const startedAt = performance.now();
      let speechSeen = false;
      let lastSpeechAt = startedAt;

      const watch = () => {
        if (!liveVoiceRef.current || recorderRef.current?.state !== "recording") return;
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          const value = (sample - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / samples.length);
        const now = performance.now();
        if (rms > 0.032) {
          speechSeen = true;
          lastSpeechAt = now;
        }
        if (speechSeen && now - startedAt > 1200 && now - lastSpeechAt > 2800) {
          stopCurrentRecording(false);
          return;
        }
        silenceFrameRef.current = requestAnimationFrame(watch);
      };
      silenceFrameRef.current = requestAnimationFrame(watch);
    } catch {
      // Live voice still works with the explicit Send now control when Web Audio is unavailable.
    }
  }

  async function transcribeAudio(blob: Blob) {
    const form = new FormData();
    const baseType = (blob.type || "audio/mp4").split(";")[0];
    const extension = baseType.includes("webm") ? "webm" : baseType.includes("ogg") ? "ogg" : baseType.includes("wav") ? "wav" : "m4a";
    form.append("audio", new File([blob], `atlas-voice.${extension}`, { type: blob.type || baseType }));
    form.append("locale", locale);

    const response = await fetch("/api/atlas-ai/transcribe", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      body: form,
    });
    const payload = await response.json() as { text?: string; error?: string };
    if (!response.ok || !payload.text?.trim()) {
      throw new Error(payload.error === "no_speech" ? "no_speech" : "voice_unavailable");
    }
    return payload.text.trim();
  }

  async function getMicrophoneStream(purpose: RecordingPurpose) {
    if (!microphoneSupported()) throw new Error("voice_unavailable");
    if (purpose === "live" && liveStreamRef.current?.active) return liveStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (purpose === "live") liveStreamRef.current = stream;
      return stream;
    } catch (caught) {
      const name = caught instanceof DOMException ? caught.name : "";
      throw new Error(name === "NotAllowedError" || name === "SecurityError" ? "permission" : "voice_unavailable");
    }
  }

  async function startRecording(purpose: RecordingPurpose) {
    if (recorderRef.current || loadingRef.current || speakingRef.current) return;
    setVoiceError(null);
    setApproximateVoice(false);
    if (purpose === "live") setLiveDisplayText("");

    let stream: MediaStream;
    try {
      stream = await getMicrophoneStream(purpose);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "voice_unavailable";
      setVoiceError(code === "permission" ? t.voicePermission : t.voiceUnavailable);
      if (purpose === "live") setVoiceStage("idle");
      else setDictating(false);
      return;
    }

    const mimeType = chooseRecorderMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      if (purpose !== "live") stopTracks(stream);
      setVoiceError(t.voiceUnavailable);
      if (purpose === "live") setVoiceStage("idle");
      else setDictating(false);
      return;
    }

    const chunks: BlobPart[] = [];
    discardRecordingRef.current = false;
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => {
      setVoiceError(t.voiceUnavailable);
    };
    recorder.onstop = () => {
      recorderRef.current = null;
      cleanupSilenceWatch();
      const discarded = discardRecordingRef.current;
      discardRecordingRef.current = false;
      if (purpose !== "live") stopTracks(stream);
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/mp4" });
      if (!discarded) void finishRecordedTurn(blob, purpose);
    };

    try {
      recorder.start(250);
      setVoiceStage("listening");
      if (purpose === "dictation") setDictating(true);
      startSilenceWatch(stream, purpose);
    } catch {
      recorderRef.current = null;
      if (purpose !== "live") stopTracks(stream);
      setVoiceError(t.voiceUnavailable);
      setVoiceStage("idle");
      setDictating(false);
    }
  }

  async function finishRecordedTurn(blob: Blob, purpose: RecordingPurpose) {
    if (purpose === "live" && !liveVoiceRef.current) return;
    setVoiceStage("transcribing");
    if (purpose === "dictation") setDictating(false);

    try {
      const transcript = await transcribeAudio(blob);
      if (purpose === "dictation") {
        setQuestion((current) => `${current.trim()}${current.trim() ? " " : ""}${transcript}`.trim());
        setVoiceStage("idle");
        return;
      }
      if (!liveVoiceRef.current) return;
      setLiveDisplayText(transcript);
      await askAtlas(transcript, true);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "voice_unavailable";
      setVoiceError(code === "no_speech" ? t.noSpeech : t.voiceUnavailable);
      setVoiceStage("idle");
      if (purpose === "live" && liveVoiceRef.current) {
        window.setTimeout(() => {
          if (liveVoiceRef.current && !loadingRef.current) void startRecording("live");
        }, 900);
      }
    }
  }

  function chooseVoice(lang: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return { voice: undefined, approximate: false };
    const voices = window.speechSynthesis.getVoices();
    const normalized = lang.toLowerCase();
    const exact = voices.find((voice) => voice.lang.toLowerCase() === normalized);
    if (exact) return { voice: exact, approximate: false };
    const root = normalized.split("-")[0];
    const rootVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(`${root}-`))
      ?? voices.find((voice) => voice.lang.toLowerCase() === root);
    if (rootVoice) return { voice: rootVoice, approximate: false };
    if (locale === "ku" || locale === "bd") {
      const fallback = voices.find((voice) => voice.lang.toLowerCase().startsWith("fa-"))
        ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("ar-"));
      if (fallback) return { voice: fallback, approximate: true };
    }
    return { voice: undefined, approximate: false };
  }

  async function speakAnswer(text: string, continueConversation: boolean) {
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setVoiceStage("idle");
      if (continueConversation && liveVoiceRef.current) window.setTimeout(() => void startRecording("live"), 650);
      return;
    }

    speechCycleRef.current += 1;
    const cycle = speechCycleRef.current;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(stripForSpeech(text));
    utterance.lang = speechLanguage(locale);
    utterance.rate = 0.98;
    utterance.pitch = 1;
    utterance.volume = 1;
    const selected = chooseVoice(utterance.lang);
    if (selected.voice) utterance.voice = selected.voice;
    setApproximateVoice(selected.approximate);

    speakingRef.current = true;
    setVoiceStage("speaking");
    setVoiceError(null);
    if (continueConversation) setLiveDisplayText(text);

    const finish = () => {
      if (speechCycleRef.current !== cycle) return;
      speakingRef.current = false;
      setVoiceStage("idle");
      if (continueConversation && liveVoiceRef.current) {
        window.setTimeout(() => {
          if (liveVoiceRef.current) void startRecording("live");
        }, 550);
      }
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  }

  async function askAtlas(value: string, fromLiveVoice = false) {
    const nextQuestion = value.trim();
    if (nextQuestion.length < 2 || loadingRef.current) return;

    setLoadingValue(true);
    setError(null);
    if (fromLiveVoice) setVoiceStage("thinking");

    const userMessage: ChatMessage = { id: makeId(), role: "user", content: nextQuestion };
    const requestHistory = [...messagesRef.current, userMessage].slice(-14);
    messagesRef.current = requestHistory;
    setMessages(requestHistory);
    setQuestion("");

    try {
      const response = await fetch("/api/atlas-ai", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId,
          messages: requestHistory.map(({ role, content }) => ({ role, content })),
        }),
      });
      const payload = await response.json() as { answer?: string; error?: string; mode?: "model" | "atlas_core" };
      if (!response.ok || !payload.answer) {
        if (payload.error === "ai_not_configured" || payload.error === "ai_auth") throw new Error("unavailable");
        if (payload.error === "ai_budget") throw new Error("budget");
        if (payload.error === "rate_limited" || payload.error === "ai_busy") throw new Error("busy");
        throw new Error("failed");
      }

      const assistantMessage: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: payload.answer,
        mode: payload.mode,
      };
      const nextMessages = [...messagesRef.current, assistantMessage].slice(-14);
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      setLoadingValue(false);
      if (fromLiveVoice && liveVoiceRef.current) await speakAnswer(payload.answer, true);
      else setVoiceStage("idle");
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "failed";
      setError(code === "unavailable" ? t.unavailable : code === "budget" ? t.budget : code === "busy" ? t.busy : t.error);
      setVoiceStage("idle");
      if (fromLiveVoice && liveVoiceRef.current) {
        window.setTimeout(() => {
          if (liveVoiceRef.current) void startRecording("live");
        }, 900);
      }
    } finally {
      setLoadingValue(false);
    }
  }

  function toggleDictation() {
    if (dictating) {
      stopCurrentRecording(false);
      return;
    }
    if (liveVoiceRef.current || loadingRef.current) return;
    setError(null);
    setVoiceError(null);
    void startRecording("dictation");
  }

  function startLiveVoice() {
    if (loadingRef.current || dictating || liveVoiceRef.current) return;
    if (!microphoneSupported()) {
      setVoiceError(t.voiceUnavailable);
      return;
    }
    setError(null);
    setVoiceError(null);
    setLiveDisplayText("");
    setLiveVoiceValue(true);
    setVoiceStage("idle");
    void startRecording("live");
  }

  function endLiveVoice() {
    setLiveVoiceValue(false);
    speechCycleRef.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    speakingRef.current = false;
    stopCurrentRecording(true);
    cleanupSilenceWatch();
    stopTracks(liveStreamRef.current);
    liveStreamRef.current = null;
    setVoiceStage("idle");
    setLiveDisplayText("");
    setApproximateVoice(false);
  }

  function interruptAtlas() {
    if (!liveVoiceRef.current) return;
    speechCycleRef.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    speakingRef.current = false;
    setVoiceStage("idle");
    void startRecording("live");
  }

  function continueLiveVoice() {
    if (!liveVoiceRef.current || loadingRef.current || recorderRef.current || speakingRef.current) return;
    void startRecording("live");
  }

  function newChat() {
    endLiveVoice();
    if (dictating) stopCurrentRecording(true);
    setDictating(false);
    setMessages([]);
    messagesRef.current = [];
    setQuestion("");
    setError(null);
    setVoiceError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dictating || voiceStage === "transcribing") return;
    void askAtlas(question);
  }

  function composerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !dictating && voiceStage !== "transcribing") {
      event.preventDefault();
      void askAtlas(question);
    }
  }

  const voiceStatus = voiceStage === "listening"
    ? t.listening
    : voiceStage === "transcribing"
      ? t.transcribing
      : voiceStage === "thinking"
        ? t.thinking
        : voiceStage === "speaking"
          ? t.speaking
          : null;

  return (
    <section className="atlas-ai-card" aria-labelledby="atlas-ai-title">
      <div className="atlas-ai-heading">
        <div>
          <div className="eyebrow">{t.eyebrow}</div>
          <h1 id="atlas-ai-title">{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="atlas-ai-heading-actions">
          <span className="atlas-ai-beta">{t.beta}</span>
          <button className="atlas-ai-new-chat" type="button" onClick={newChat}>{t.newChat}</button>
        </div>
      </div>

      <div className="atlas-ai-clinic">{clinicName}</div>
      <p className="atlas-ai-privacy">{t.privacy}</p>

      <div className="atlas-ai-thread" aria-live="polite">
        {messages.length === 0 ? (
          <div className="atlas-ai-empty">
            <div className="atlas-ai-orb" aria-hidden="true">A</div>
            <strong>{t.title}</strong>
            <span>{t.examples}</span>
            <div className="atlas-ai-presets">
              {t.presets.map((preset) => (
                <button key={preset} type="button" onClick={() => void askAtlas(preset)} disabled={loading}>
                  {preset}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <article key={message.id} className={`atlas-ai-message is-${message.role}`}>
              <div className="atlas-ai-message-role">{message.role === "assistant" ? "Atlas AI" : t.you}</div>
              {message.role === "assistant" ? <RichMessage text={message.content} /> : <p>{message.content}</p>}
              {message.role === "assistant" ? (
                <button className="atlas-ai-listen-button" type="button" onClick={() => void speakAnswer(message.content, false)}>
                  <SpeakerIcon /> {t.replay}
                </button>
              ) : null}
            </article>
          ))
        )}
        {loading ? (
          <article className="atlas-ai-message is-assistant is-thinking">
            <div className="atlas-ai-message-role">Atlas AI</div>
            <p><span className="atlas-ai-dot" /><span className="atlas-ai-dot" /><span className="atlas-ai-dot" /> {t.thinking}</p>
          </article>
        ) : null}
        <div ref={messageEndRef} />
      </div>

      {error ? <p className="atlas-ai-error" role="alert">{error}</p> : null}
      {voiceError && !liveVoice ? <p className="atlas-ai-error" role="alert">{voiceError}</p> : null}

      <div className="atlas-ai-voice-tools">
        <button className="atlas-ai-live-button" type="button" onClick={startLiveVoice} disabled={loading || dictating}>
          <span className="atlas-ai-live-dot" aria-hidden="true" />
          <span>{t.liveVoice}</span>
        </button>
        <button className={`atlas-ai-dictate-button ${dictating ? "is-on" : ""}`} type="button" onClick={toggleDictation} disabled={loading || liveVoice}>
          {dictating ? <StopIcon /> : <MicIcon />}
          <span>{dictating ? t.stopDictation : t.dictate}</span>
        </button>
        <span className="atlas-ai-dictate-hint">{dictating ? voiceStatus : t.dictateHint}</span>
      </div>

      <form className="atlas-ai-composer" onSubmit={submit}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={composerKeyDown}
          placeholder={t.placeholder}
          maxLength={1200}
          rows={2}
          aria-label={t.placeholder}
          disabled={loading || voiceStage === "transcribing"}
        />
        <div className="atlas-ai-composer-actions">
          <button className={`atlas-ai-mic-button ${dictating ? "is-on" : ""}`} type="button" onClick={toggleDictation} aria-label={dictating ? t.stopDictation : t.dictate} title={dictating ? t.stopDictation : t.dictate} disabled={loading || liveVoice}>
            {dictating ? <StopIcon /> : <MicIcon />}
          </button>
          <button className="atlas-ai-send-button" type="submit" disabled={loading || dictating || voiceStage === "transcribing" || question.trim().length < 2} aria-label={t.send} title={t.send}>
            <SendIcon />
          </button>
        </div>
      </form>

      {liveVoice ? (
        <div className="atlas-ai-live-overlay" role="dialog" aria-modal="true" aria-label={t.liveTitle}>
          <div className="atlas-ai-live-topbar">
            <div>
              <span className="atlas-ai-live-brand">ATLAS</span>
              <strong>{t.liveTitle}</strong>
            </div>
            <button type="button" onClick={endLiveVoice}>{t.endVoice}</button>
          </div>

          <div className={`atlas-ai-live-center is-${voiceStage}`}>
            <div className="atlas-ai-live-orb" aria-hidden="true">
              <i /><i /><i />
              <span>A</span>
            </div>
            <div className="atlas-ai-live-state">{voiceStatus ?? t.liveHint}</div>
            {liveDisplayText ? (
              <div className="atlas-ai-live-transcript">{stripForSpeech(liveDisplayText).slice(0, 420)}</div>
            ) : (
              <div className="atlas-ai-live-transcript is-hint">{t.liveHint}</div>
            )}
            {approximateVoice && voiceStage === "speaking" ? <div className="atlas-ai-live-note">{t.voiceOutputApproximate}</div> : null}
            {voiceError ? <div className="atlas-ai-live-error" role="alert">{voiceError}</div> : null}
          </div>

          <div className="atlas-ai-live-controls">
            {voiceStage === "listening" ? (
              <button className="is-primary" type="button" onClick={() => stopCurrentRecording(false)}>{t.sendNow}</button>
            ) : null}
            {voiceStage === "speaking" ? (
              <button className="is-primary" type="button" onClick={interruptAtlas}>{t.interrupt}</button>
            ) : null}
            {voiceStage === "idle" ? (
              <button className="is-primary" type="button" onClick={continueLiveVoice}>{t.continueVoice}</button>
            ) : null}
            <button type="button" onClick={endLiveVoice}>{t.endVoice}</button>
          </div>
        </div>
      ) : null}

      <style>{`
        .atlas-ai-card{border:1px solid var(--line);border-radius:24px;padding:22px;background:var(--surface);box-shadow:var(--shadow-sm);min-height:650px;display:flex;flex-direction:column}.atlas-ai-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.atlas-ai-heading h1{margin:0;font-size:30px;letter-spacing:-.04em}.atlas-ai-heading p{margin:7px 0 0;color:var(--muted);font-size:13px;line-height:1.5;max-width:650px}.atlas-ai-heading-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.atlas-ai-beta{border-radius:999px;padding:7px 10px;background:var(--accent-soft);color:var(--accent);font-size:10px;font-weight:820}.atlas-ai-new-chat{border:1px solid var(--line);border-radius:999px;padding:7px 10px;background:transparent;color:var(--ink-soft);font-size:10px;font-weight:800;cursor:pointer}.atlas-ai-clinic{margin-top:16px;color:var(--ink-soft);font-size:12px;font-weight:820}.atlas-ai-privacy{margin:7px 0 12px;border-radius:12px;padding:9px 11px;background:var(--surface-soft);color:var(--muted);font-size:10px;line-height:1.45}.atlas-ai-thread{flex:1;min-height:330px;max-height:510px;overflow:auto;display:flex;flex-direction:column;gap:12px;padding:12px 3px 16px;scrollbar-width:thin}.atlas-ai-empty{margin:auto;display:grid;justify-items:center;text-align:center;gap:9px;width:min(100%,620px);padding:24px 10px}.atlas-ai-empty>strong{font-size:18px}.atlas-ai-empty>span{font-size:11px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.05em}.atlas-ai-orb{display:grid;place-items:center;width:52px;height:52px;border-radius:18px;background:linear-gradient(145deg,var(--accent),#0c6b50);color:#fff;font-size:22px;font-weight:900;box-shadow:0 10px 28px rgba(31,90,67,.2)}.atlas-ai-presets{display:flex;flex-wrap:wrap;justify-content:center;gap:7px;margin-top:4px}.atlas-ai-presets button{border:1px solid var(--line);border-radius:999px;padding:9px 11px;background:var(--surface-soft);color:var(--ink-soft);font-size:10.5px;font-weight:720;cursor:pointer}.atlas-ai-presets button:hover{border-color:var(--line-strong);background:var(--accent-faint)}.atlas-ai-message{width:min(84%,650px);border-radius:18px;padding:12px 14px;display:grid;gap:5px}.atlas-ai-message.is-user{align-self:flex-end;background:var(--accent);color:#fff;border-bottom-inline-end-radius:6px}.atlas-ai-message.is-assistant{align-self:flex-start;background:var(--surface-soft);color:var(--ink-soft);border:1px solid var(--line);border-bottom-inline-start-radius:6px}.atlas-ai-message-role{font-size:9.5px;font-weight:850;opacity:.68;text-transform:uppercase;letter-spacing:.05em}.atlas-ai-message>p,.atlas-ai-rich-text p{margin:0;font-size:13px;line-height:1.62;white-space:pre-wrap;overflow-wrap:anywhere}.atlas-ai-rich-text{display:grid;gap:7px}.atlas-ai-rich-text h3{margin:2px 0;font-size:14px;line-height:1.35}.atlas-ai-bullet{display:grid;grid-template-columns:12px 1fr;gap:5px;align-items:start}.atlas-ai-bullet>span{font-size:15px;line-height:1.45;color:var(--accent)}.atlas-ai-text-gap{height:3px}.atlas-ai-listen-button{justify-self:start;border:0;background:transparent;color:var(--accent);padding:3px 0 0;display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:800;cursor:pointer}.atlas-ai-listen-button svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.is-thinking p{display:flex;align-items:center;gap:4px;color:var(--muted)}.atlas-ai-dot{width:5px;height:5px;border-radius:50%;background:var(--accent);animation:atlasAiPulse 1s ease-in-out infinite}.atlas-ai-dot:nth-child(2){animation-delay:.15s}.atlas-ai-dot:nth-child(3){animation-delay:.3s}@keyframes atlasAiPulse{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-2px)}}.atlas-ai-error{margin:6px 0;color:var(--danger);font-size:11px}.atlas-ai-voice-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:5px 0 9px}.atlas-ai-live-button,.atlas-ai-dictate-button{border:1px solid var(--line);border-radius:999px;min-height:36px;padding:8px 12px;background:var(--surface-soft);color:var(--ink-soft);font-size:10.5px;font-weight:820;display:inline-flex;align-items:center;gap:7px;cursor:pointer}.atlas-ai-live-button{background:var(--accent-faint);border-color:rgba(31,90,67,.2);color:var(--accent)}.atlas-ai-live-button:disabled,.atlas-ai-dictate-button:disabled{opacity:.45;cursor:not-allowed}.atlas-ai-dictate-button.is-on{background:var(--accent);color:#fff}.atlas-ai-live-dot{width:8px;height:8px;border-radius:50%;background:currentColor;box-shadow:0 0 0 0 rgba(31,90,67,.25);animation:atlasVoice 1.4s infinite}.atlas-ai-dictate-button svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.7}.atlas-ai-dictate-hint{font-size:10px;color:var(--muted)}@keyframes atlasVoice{70%{box-shadow:0 0 0 8px rgba(31,90,67,0)}}.atlas-ai-composer{display:flex;align-items:flex-end;gap:9px;border:1px solid #cbd4ce;border-radius:18px;padding:8px 8px 8px 12px;background:#fff;box-shadow:0 6px 22px rgba(18,45,36,.06)}.atlas-ai-composer:focus-within{border-color:var(--accent);box-shadow:0 0 0 4px rgba(31,90,67,.08)}.atlas-ai-composer textarea{flex:1;min-height:52px;max-height:160px;resize:none;border:0;padding:8px 2px;color:var(--ink);background:transparent;font:inherit;font-size:13px;line-height:1.45;outline:none}.atlas-ai-composer-actions{display:flex;align-items:center;gap:6px}.atlas-ai-mic-button,.atlas-ai-send-button{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;cursor:pointer}.atlas-ai-mic-button{border:1px solid var(--line);background:var(--surface-soft);color:var(--ink-soft)}.atlas-ai-mic-button.is-on{background:var(--accent);color:#fff}.atlas-ai-send-button{border:0;background:var(--accent);color:#fff}.atlas-ai-send-button:disabled,.atlas-ai-mic-button:disabled{opacity:.35;cursor:not-allowed}.atlas-ai-mic-button svg,.atlas-ai-send-button svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.atlas-ai-live-overlay{position:fixed;inset:0;z-index:1200;display:grid;grid-template-rows:auto 1fr auto;padding:max(22px,env(safe-area-inset-top)) max(22px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(22px,env(safe-area-inset-left));background:radial-gradient(circle at 50% 45%,rgba(33,126,94,.34),transparent 33%),linear-gradient(160deg,#09291f,#071b16 58%,#0a241d);color:#f6fbf8}.atlas-ai-live-topbar{display:flex;align-items:center;justify-content:space-between;gap:16px}.atlas-ai-live-topbar>div{display:grid;gap:3px}.atlas-ai-live-brand{font-size:10px;font-weight:900;letter-spacing:.28em;color:#83d5b5}.atlas-ai-live-topbar strong{font-size:18px}.atlas-ai-live-topbar button,.atlas-ai-live-controls button{border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(255,255,255,.08);color:#fff;padding:10px 15px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.atlas-ai-live-center{align-self:center;justify-self:center;width:min(720px,100%);display:grid;justify-items:center;text-align:center;gap:17px}.atlas-ai-live-orb{position:relative;width:154px;height:154px;display:grid;place-items:center}.atlas-ai-live-orb>span{position:relative;z-index:3;display:grid;place-items:center;width:94px;height:94px;border-radius:36%;background:linear-gradient(145deg,#34a77d,#12664d);box-shadow:0 18px 70px rgba(24,160,111,.34);font-size:34px;font-weight:900}.atlas-ai-live-orb i{position:absolute;inset:20px;border-radius:50%;border:1px solid rgba(113,226,181,.32);animation:atlasLivePulse 2.2s ease-out infinite}.atlas-ai-live-orb i:nth-child(2){animation-delay:.6s}.atlas-ai-live-orb i:nth-child(3){animation-delay:1.2s}.atlas-ai-live-center.is-speaking .atlas-ai-live-orb>span{animation:atlasLiveBreathe .7s ease-in-out infinite alternate}.atlas-ai-live-center.is-thinking .atlas-ai-live-orb>span,.atlas-ai-live-center.is-transcribing .atlas-ai-live-orb>span{animation:atlasLiveBreathe 1.1s ease-in-out infinite alternate}@keyframes atlasLivePulse{0%{opacity:.75;transform:scale(.72)}100%{opacity:0;transform:scale(1.55)}}@keyframes atlasLiveBreathe{to{transform:scale(1.06);filter:brightness(1.12)}}.atlas-ai-live-state{font-size:14px;font-weight:850;color:#b9e7d5}.atlas-ai-live-transcript{max-width:650px;max-height:180px;overflow:hidden;font-size:20px;line-height:1.5;font-weight:650;letter-spacing:-.015em}.atlas-ai-live-transcript.is-hint{font-size:13px;color:rgba(246,251,248,.62);font-weight:600}.atlas-ai-live-note{max-width:560px;color:#b9e7d5;font-size:10.5px;line-height:1.45}.atlas-ai-live-error{max-width:560px;color:#ffd4d4;font-size:11px}.atlas-ai-live-controls{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}.atlas-ai-live-controls button.is-primary{background:#f6fbf8;color:#09291f;border-color:#f6fbf8;min-width:118px}.atlas-ai-live-controls button:active,.atlas-ai-live-topbar button:active{transform:scale(.98)}@media(max-width:720px){.atlas-ai-card{padding:15px;border-radius:18px;min-height:calc(100dvh - 160px)}.atlas-ai-heading{display:grid}.atlas-ai-heading-actions{justify-content:flex-start}.atlas-ai-thread{max-height:none;min-height:280px}.atlas-ai-message{width:min(94%,620px)}.atlas-ai-presets{display:grid;width:100%}.atlas-ai-presets button{text-align:start}.atlas-ai-privacy{font-size:9.5px}.atlas-ai-voice-tools{align-items:flex-start}.atlas-ai-dictate-hint{width:100%}.atlas-ai-live-overlay{padding:20px 16px 24px}.atlas-ai-live-orb{width:130px;height:130px}.atlas-ai-live-orb>span{width:82px;height:82px;font-size:29px}.atlas-ai-live-transcript{font-size:17px}}
      `}</style>
    </section>
  );
}
