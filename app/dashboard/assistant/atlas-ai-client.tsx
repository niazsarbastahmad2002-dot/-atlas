"use client";

import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
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

type VoiceStage = "idle" | "listening" | "thinking" | "speaking";

type RecognitionAlternative = { transcript: string; confidence?: number };
type RecognitionResult = { isFinal: boolean; length: number; [index: number]: RecognitionAlternative };
type RecognitionResultList = { length: number; [index: number]: RecognitionResult };
type RecognitionEvent = Event & { resultIndex: number; results: RecognitionResultList };
type RecognitionErrorEvent = Event & { error: string; message?: string };

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SpeechWindow = typeof window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
};

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
  voice: string;
  voiceOff: string;
  listening: string;
  speaking: string;
  doneSpeaking: string;
  voiceUnavailable: string;
  voicePermission: string;
  voiceLanguage: string;
  replay: string;
  presets: string[];
};

const copy: Record<UiLocale, Copy> = {
  en: {
    eyebrow: "Your Atlas assistant",
    title: "Atlas AI",
    subtitle: "Chat naturally about Atlas, clinic operations, writing, planning, translation, or everyday questions.",
    beta: "Beta · read-only",
    privacy: "Atlas sends this conversation plus aggregated appointment statistics to the AI provider when full AI is available. Do not include patient names, phone numbers, message contents, or patient-specific clinical information.",
    placeholder: "Message Atlas AI…",
    send: "Send",
    thinking: "Thinking…",
    examples: "Try asking",
    error: "Atlas AI could not answer that right now.",
    unavailable: "Atlas AI is not available right now.",
    budget: "Atlas AI's current AI budget is unavailable.",
    busy: "Atlas AI is busy. Try again shortly.",
    newChat: "New chat",
    voice: "Voice",
    voiceOff: "End voice",
    listening: "Listening… speak naturally",
    speaking: "Atlas AI is speaking…",
    doneSpeaking: "Done speaking",
    voiceUnavailable: "Voice mode is not supported by this browser/device.",
    voicePermission: "Atlas needs microphone permission for voice mode.",
    voiceLanguage: "This device does not support speech recognition for the selected language.",
    replay: "Listen",
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
    subtitle: "بە ئاسایی گفتوگۆ بکە لەسەر Atlas، کاری کلینیک، نووسین، پلاندانان، وەرگێڕان یان پرسیاری ڕۆژانە.",
    beta: "Beta · تەنها خوێندنەوە",
    privacy: "کاتێک AI تەواو بەردەست بێت، Atlas ئەم گفتوگۆیە لەگەڵ ئاماری کۆکراوەی مەوعیدەکان دەنێرێت. ناوی نەخۆش، ژمارەی مۆبایل، ناوەڕۆکی نامە یان زانیاری پزیشکی تایبەت بە نەخۆش مەنووسە.",
    placeholder: "نامە بۆ Atlas AI…",
    send: "بنێرە",
    thinking: "بیر دەکاتەوە…",
    examples: "ئەم پرسیارانە تاقی بکەوە",
    error: "Atlas AI ئێستا نەیتوانی وەڵام بداتەوە.",
    unavailable: "Atlas AI ئێستا بەردەست نییە.",
    budget: "بودجەی AI بۆ ئێستا بەردەست نییە.",
    busy: "Atlas AI ئێستا سەرقاڵە. کەمێکی تر هەوڵ بدەرەوە.",
    newChat: "گفتوگۆی نوێ",
    voice: "دەنگ",
    voiceOff: "کۆتایی دەنگ",
    listening: "گوێ دەگرێت… بە ئاسایی قسە بکە",
    speaking: "Atlas AI قسە دەکات…",
    doneSpeaking: "قسەم تەواو بوو",
    voiceUnavailable: "Voice mode لەم وێبگەڕ/ئامێرەدا بەردەست نییە.",
    voicePermission: "بۆ Voice mode ڕێگە بە مایکرۆفۆن بدە.",
    voiceLanguage: "ئەم ئامێرە ناسینەوەی دەنگ بۆ زمانی هەڵبژێردراو پشتگیری ناکات.",
    replay: "گوێ بگرە",
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
    subtitle: "ب ئاسایی گفتوگۆ بکە ل سەر Atlas، کارێ کلینیکێ، نڤیسین، پلانکرن، وەرگێڕان یان پسیارێن ڕۆژانە.",
    beta: "Beta · تەنێ خواندن",
    privacy: "دەمێ AI یا تەمام بەردەست بیت، Atlas ئەڤ گفتوگۆیێ ل گەل ئامارێن کۆمکری یێن مەوعیدان دفرێنیت. ناڤێ نەخۆشی، ژمارا موبایلێ، ناڤەروکا پەیامان یان زانیاریێن پزیشکی یێن تایبەت ب نەخۆشی مەنووسە.",
    placeholder: "پەیام بۆ Atlas AI…",
    send: "بفرێنە",
    thinking: "هزر دکەت…",
    examples: "ڤان پسیاران تاقی بکە",
    error: "Atlas AI نها نەشیا بەرسڤ بدەت.",
    unavailable: "Atlas AI نها بەردەست نینە.",
    budget: "بودجەیا AI بۆ نها بەردەست نینە.",
    busy: "Atlas AI نها مژوولە. پشتی کەمەکێ دووبارە هەول بدە.",
    newChat: "گفتوگۆیا نوی",
    voice: "دەنگ",
    voiceOff: "دوماهیکا دەنگی",
    listening: "گوهدار دکەت… ب ئاسایی باخڤە",
    speaking: "Atlas AI دئاخڤیت…",
    doneSpeaking: "ئاخفتنا من تەواو بوو",
    voiceUnavailable: "Voice mode ل ڤی وێبگەڕی/ئامێری بەردەست نینە.",
    voicePermission: "بۆ Voice mode ڕێکێ بدە مایکرۆفۆنێ.",
    voiceLanguage: "ئەڤ ئامێرە ناسینا دەنگی بۆ زمانێ هەلبژارتی پشتگیری ناکەت.",
    replay: "گوهدار بکە",
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
    subtitle: "احچي بشكل طبيعي عن Atlas، شغل العيادة، الكتابة، التخطيط، الترجمة أو الأسئلة اليومية.",
    beta: "Beta · للقراءة فقط",
    privacy: "لما يكون الذكاء الاصطناعي الكامل متاح، Atlas يرسل هالمحادثة ويّا إحصائيات مجمعة للمواعيد. لا تكتب اسم المريض أو رقم الهاتف أو محتوى الرسائل أو معلومات طبية خاصة بمريض.",
    placeholder: "اكتب لـ Atlas AI…",
    send: "إرسال",
    thinking: "يفكر…",
    examples: "جرّب سؤال",
    error: "Atlas AI ما قدر يجاوب حالياً.",
    unavailable: "Atlas AI غير متاح حالياً.",
    budget: "ميزانية الذكاء الاصطناعي غير متاحة حالياً.",
    busy: "Atlas AI مشغول حالياً. حاول بعد قليل.",
    newChat: "محادثة جديدة",
    voice: "صوت",
    voiceOff: "إنهاء الصوت",
    listening: "أسمعك… احچي بشكل طبيعي",
    speaking: "Atlas AI يحچي…",
    doneSpeaking: "خلصت حچي",
    voiceUnavailable: "وضع الصوت غير مدعوم بهذا المتصفح أو الجهاز.",
    voicePermission: "Atlas يحتاج إذن المايكروفون حتى يستخدم وضع الصوت.",
    voiceLanguage: "هذا الجهاز ما يدعم التعرف على الكلام باللغة المختارة.",
    replay: "اسمع",
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

function speechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
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

export function AtlasAiClient({ clinicId, clinicName, locale }: AtlasAiClientProps) {
  const t = copy[locale];
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceStage, setVoiceStage] = useState<VoiceStage>("idle");

  const messagesRef = useRef<ChatMessage[]>([]);
  const loadingRef = useRef(false);
  const voiceModeRef = useRef(false);
  const speakingRef = useRef(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  useEffect(() => () => {
    voiceModeRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  function setVoiceModeValue(value: boolean) {
    voiceModeRef.current = value;
    setVoiceMode(value);
  }

  function setLoadingValue(value: boolean) {
    loadingRef.current = value;
    setLoading(value);
  }

  function voiceSupported() {
    return Boolean(speechRecognitionConstructor())
      && typeof window !== "undefined"
      && "speechSynthesis" in window
      && typeof SpeechSynthesisUtterance !== "undefined";
  }

  function chooseVoice(lang: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return undefined;
    const voices = window.speechSynthesis.getVoices();
    const normalized = lang.toLowerCase();
    const exact = voices.find((voice) => voice.lang.toLowerCase() === normalized);
    if (exact) return exact;
    const root = normalized.split("-")[0];
    return voices.find((voice) => voice.lang.toLowerCase().startsWith(`${root}-`))
      ?? voices.find((voice) => voice.lang.toLowerCase() === root);
  }

  async function speakAnswer(text: string, continueConversation: boolean) {
    if (!text || speakingRef.current || typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (continueConversation && voiceModeRef.current) window.setTimeout(() => void startListening(), 350);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLanguage(locale);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    const voice = chooseVoice(utterance.lang);
    if (voice) utterance.voice = voice;

    speakingRef.current = true;
    setVoiceStage("speaking");
    setVoiceError(null);

    utterance.onend = () => {
      speakingRef.current = false;
      setVoiceStage("idle");
      if (continueConversation && voiceModeRef.current) window.setTimeout(() => void startListening(), 350);
    };
    utterance.onerror = () => {
      speakingRef.current = false;
      setVoiceStage("idle");
      setVoiceError(t.voiceUnavailable);
      if (continueConversation && voiceModeRef.current) window.setTimeout(() => void startListening(), 500);
    };
    window.speechSynthesis.speak(utterance);
  }

  async function askAtlas(value: string, fromVoice = false) {
    const nextQuestion = value.trim();
    if (nextQuestion.length < 2 || loadingRef.current) return;

    setLoadingValue(true);
    setError(null);
    if (fromVoice || voiceModeRef.current) setVoiceStage("thinking");

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
      if (fromVoice || voiceModeRef.current) await speakAnswer(payload.answer, true);
      else setVoiceStage("idle");
      return;
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "failed";
      setError(code === "unavailable" ? t.unavailable : code === "budget" ? t.budget : code === "busy" ? t.busy : t.error);
      setVoiceStage("idle");
    } finally {
      setLoadingValue(false);
    }
  }

  async function startListening() {
    if (!voiceModeRef.current || loadingRef.current || speakingRef.current || recognitionRef.current) return;
    setVoiceError(null);

    const Recognition = speechRecognitionConstructor();
    if (!Recognition || !voiceSupported()) {
      setVoiceError(t.voiceUnavailable);
      setVoiceModeValue(false);
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = speechLanguage(locale);
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalText = "";
    let restartAfterEnd = true;

    recognition.onresult = (event) => {
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript?.trim() ?? "";
        if (!transcript) continue;
        if (result.isFinal) finalText = `${finalText} ${transcript}`.trim();
        else interimText = `${interimText} ${transcript}`.trim();
      }
      setQuestion(`${finalText}${finalText && interimText ? " " : ""}${interimText}`.trim());
    };

    recognition.onerror = (event) => {
      const code = event.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        restartAfterEnd = false;
        setVoiceError(t.voicePermission);
        setVoiceModeValue(false);
      } else if (code === "language-not-supported") {
        restartAfterEnd = false;
        setVoiceError(t.voiceLanguage);
        setVoiceModeValue(false);
      } else if (code !== "no-speech" && code !== "aborted") {
        setVoiceError(t.voiceUnavailable);
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      const transcript = finalText.trim();
      if (transcript.length >= 2) {
        setQuestion("");
        void askAtlas(transcript, true);
        return;
      }
      setVoiceStage("idle");
      if (restartAfterEnd && voiceModeRef.current && !loadingRef.current && !speakingRef.current) {
        window.setTimeout(() => void startListening(), 450);
      }
    };

    try {
      recognition.start();
      setVoiceStage("listening");
    } catch {
      recognitionRef.current = null;
      setVoiceStage("idle");
      setVoiceError(t.voiceUnavailable);
    }
  }

  function stopListeningTurn() {
    recognitionRef.current?.stop();
  }

  function stopVoiceMode() {
    setVoiceModeValue(false);
    setVoiceStage("idle");
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    speakingRef.current = false;
  }

  function toggleVoiceMode() {
    if (voiceModeRef.current) {
      stopVoiceMode();
      return;
    }
    if (!voiceSupported()) {
      setVoiceError(t.voiceUnavailable);
      return;
    }
    setVoiceModeValue(true);
    setVoiceStage("idle");
    setError(null);
    setVoiceError(null);
    window.setTimeout(() => void startListening(), 0);
  }

  function newChat() {
    stopVoiceMode();
    setMessages([]);
    messagesRef.current = [];
    setQuestion("");
    setError(null);
    setVoiceError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askAtlas(question);
  }

  function composerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void askAtlas(question);
    }
  }

  const voiceStatus = voiceStage === "listening"
    ? t.listening
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
              <div className="atlas-ai-message-role">{message.role === "assistant" ? "Atlas AI" : "You"}</div>
              <p>{message.content}</p>
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

      <div className={`atlas-ai-voice-panel ${voiceMode ? "is-on" : ""}`}>
        <button className="atlas-ai-voice-toggle" type="button" onClick={toggleVoiceMode} aria-pressed={voiceMode}>
          <MicIcon />
          <span>{voiceMode ? t.voiceOff : t.voice}</span>
        </button>
        {voiceStatus ? <span className="atlas-ai-voice-status"><i />{voiceStatus}</span> : null}
        {voiceStage === "listening" ? (
          <button className="atlas-ai-done-speaking" type="button" onClick={stopListeningTurn}>{t.doneSpeaking}</button>
        ) : null}
        {voiceError ? <span className="atlas-ai-voice-error">{voiceError}</span> : null}
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
          disabled={loading}
        />
        <div className="atlas-ai-composer-actions">
          <button className="atlas-ai-mic-button" type="button" onClick={toggleVoiceMode} aria-label={t.voice} title={t.voice}>
            <MicIcon />
          </button>
          <button className="atlas-ai-send-button" type="submit" disabled={loading || question.trim().length < 2} aria-label={t.send} title={t.send}>
            <SendIcon />
          </button>
        </div>
      </form>

      <style>{`
        .atlas-ai-card{border:1px solid var(--line);border-radius:24px;padding:22px;background:var(--surface);box-shadow:var(--shadow-sm);min-height:650px;display:flex;flex-direction:column}.atlas-ai-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.atlas-ai-heading h1{margin:0;font-size:30px;letter-spacing:-.04em}.atlas-ai-heading p{margin:7px 0 0;color:var(--muted);font-size:13px;line-height:1.5;max-width:620px}.atlas-ai-heading-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.atlas-ai-beta{border-radius:999px;padding:7px 10px;background:var(--accent-soft);color:var(--accent);font-size:10px;font-weight:820}.atlas-ai-new-chat{border:1px solid var(--line);border-radius:999px;padding:7px 10px;background:transparent;color:var(--ink-soft);font-size:10px;font-weight:800;cursor:pointer}.atlas-ai-clinic{margin-top:16px;color:var(--ink-soft);font-size:12px;font-weight:820}.atlas-ai-privacy{margin:7px 0 12px;border-radius:12px;padding:9px 11px;background:var(--surface-soft);color:var(--muted);font-size:10px;line-height:1.45}.atlas-ai-thread{flex:1;min-height:330px;max-height:500px;overflow:auto;display:flex;flex-direction:column;gap:12px;padding:12px 3px 16px;scrollbar-width:thin}.atlas-ai-empty{margin:auto;display:grid;justify-items:center;text-align:center;gap:9px;width:min(100%,620px);padding:24px 10px}.atlas-ai-empty>strong{font-size:18px}.atlas-ai-empty>span{font-size:11px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.05em}.atlas-ai-orb{display:grid;place-items:center;width:52px;height:52px;border-radius:18px;background:linear-gradient(145deg,var(--accent),#0c6b50);color:#fff;font-size:22px;font-weight:900;box-shadow:0 10px 28px rgba(31,90,67,.2)}.atlas-ai-presets{display:flex;flex-wrap:wrap;justify-content:center;gap:7px;margin-top:4px}.atlas-ai-presets button{border:1px solid var(--line);border-radius:999px;padding:9px 11px;background:var(--surface-soft);color:var(--ink-soft);font-size:10.5px;font-weight:720;cursor:pointer}.atlas-ai-presets button:hover{border-color:var(--line-strong);background:var(--accent-faint)}.atlas-ai-message{width:min(84%,650px);border-radius:18px;padding:12px 14px;display:grid;gap:5px}.atlas-ai-message.is-user{align-self:flex-end;background:var(--accent);color:#fff;border-bottom-inline-end-radius:6px}.atlas-ai-message.is-assistant{align-self:flex-start;background:var(--surface-soft);color:var(--ink-soft);border:1px solid var(--line);border-bottom-inline-start-radius:6px}.atlas-ai-message-role{font-size:9.5px;font-weight:850;opacity:.68;text-transform:uppercase;letter-spacing:.05em}.atlas-ai-message p{margin:0;font-size:13px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.atlas-ai-listen-button{justify-self:start;border:0;background:transparent;color:var(--accent);padding:3px 0 0;display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:800;cursor:pointer}.atlas-ai-listen-button svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.is-thinking p{display:flex;align-items:center;gap:4px;color:var(--muted)}.atlas-ai-dot{width:5px;height:5px;border-radius:50%;background:var(--accent);animation:atlasAiPulse 1s ease-in-out infinite}.atlas-ai-dot:nth-child(2){animation-delay:.15s}.atlas-ai-dot:nth-child(3){animation-delay:.3s}@keyframes atlasAiPulse{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-2px)}}.atlas-ai-error{margin:6px 0;color:var(--danger);font-size:11px}.atlas-ai-voice-panel{display:flex;align-items:center;gap:9px;min-height:42px;margin:4px 0 9px;padding:7px 9px;border:1px solid transparent;border-radius:14px;background:transparent;flex-wrap:wrap}.atlas-ai-voice-panel.is-on{border-color:rgba(31,90,67,.18);background:var(--accent-faint)}.atlas-ai-voice-toggle,.atlas-ai-done-speaking{border:0;border-radius:999px;min-height:34px;padding:7px 11px;background:var(--surface-soft);color:var(--ink-soft);font-size:10.5px;font-weight:820;display:inline-flex;align-items:center;gap:6px;cursor:pointer}.atlas-ai-voice-panel.is-on .atlas-ai-voice-toggle{background:var(--accent);color:#fff}.atlas-ai-voice-toggle svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.7}.atlas-ai-voice-status{display:inline-flex;align-items:center;gap:6px;color:var(--accent);font-size:10.5px;font-weight:780}.atlas-ai-voice-status i{width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 0 0 rgba(31,90,67,.3);animation:atlasVoice 1.3s infinite}@keyframes atlasVoice{70%{box-shadow:0 0 0 8px rgba(31,90,67,0)}}.atlas-ai-voice-error{color:var(--danger);font-size:10px}.atlas-ai-done-speaking{margin-inline-start:auto;border:1px solid var(--line);background:#fff}.atlas-ai-composer{display:flex;align-items:flex-end;gap:9px;border:1px solid #cbd4ce;border-radius:18px;padding:8px 8px 8px 12px;background:#fff;box-shadow:0 6px 22px rgba(18,45,36,.06)}.atlas-ai-composer:focus-within{border-color:var(--accent);box-shadow:0 0 0 4px rgba(31,90,67,.08)}.atlas-ai-composer textarea{flex:1;min-height:52px;max-height:160px;resize:none;border:0;padding:8px 2px;color:var(--ink);background:transparent;font:inherit;font-size:13px;line-height:1.45;outline:none}.atlas-ai-composer-actions{display:flex;align-items:center;gap:6px}.atlas-ai-mic-button,.atlas-ai-send-button{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;cursor:pointer}.atlas-ai-mic-button{border:1px solid var(--line);background:var(--surface-soft);color:var(--ink-soft)}.atlas-ai-send-button{border:0;background:var(--accent);color:#fff}.atlas-ai-send-button:disabled{opacity:.35;cursor:not-allowed}.atlas-ai-mic-button svg,.atlas-ai-send-button svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}@media(max-width:720px){.atlas-ai-card{padding:15px;border-radius:18px;min-height:calc(100dvh - 160px)}.atlas-ai-heading{display:grid}.atlas-ai-heading-actions{justify-content:flex-start}.atlas-ai-thread{max-height:none;min-height:280px}.atlas-ai-message{width:min(92%,620px)}.atlas-ai-presets{display:grid;width:100%}.atlas-ai-presets button{text-align:start}.atlas-ai-privacy{font-size:9.5px}.atlas-ai-voice-panel{padding-inline:5px}.atlas-ai-done-speaking{margin-inline-start:0}}
      `}</style>
    </section>
  );
}
