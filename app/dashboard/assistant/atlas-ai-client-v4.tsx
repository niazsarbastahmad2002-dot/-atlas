"use client";

import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import {
  atlasPcmCaptureSupported,
  startAtlasPcmCapture,
  type AtlasPcmCapture,
} from "./atlas-pcm-recorder";

type AtlasAiClientProps = { clinicId: string; clinicName: string; locale: UiLocale };
type ChatMessage = { id: string; role: "user" | "assistant"; content: string; mode?: "model" | "atlas_core" };
type VoiceStage = "idle" | "starting" | "listening" | "transcribing" | "thinking" | "speaking";
type RecordingPurpose = "dictation" | "live";

type Copy = {
  eyebrow: string; title: string; subtitle: string; beta: string; privacy: string; placeholder: string; send: string;
  thinking: string; examples: string; error: string; busy: string; newChat: string; dictate: string; stopDictation: string;
  dictateHint: string; liveVoice: string; liveTitle: string; liveHint: string; starting: string; listening: string; transcribing: string;
  speaking: string; paused: string; sendNow: string; interrupt: string; tryAgain: string; endVoice: string;
  voiceUnavailable: string; voicePermission: string; noSpeech: string; unclearSpeech: string; micOn: string; micQuiet: string;
  voiceOutputApproximate: string; replay: string; you: string; modelAnswer: string; atlasAnswer: string; retry: string; composerHint: string; presets: string[];
};

const copy: Record<UiLocale, Copy> = {
  en: {
    eyebrow: "Your Atlas assistant", title: "Atlas AI", subtitle: "Ask about Atlas, your clinic schedule, doctors, reminders, reception work, and authorized appointment details.",
    beta: "Beta · read-only", privacy: "Atlas AI uses clinic statistics and non-patient Atlas configuration with its AI model. Patient-specific appointment lookups are answered inside Atlas. Do not enter diagnoses, clinical notes, or other medical information.",
    placeholder: "Ask Atlas AI…", send: "Send", thinking: "Checking Atlas…", examples: "Try asking", error: "Atlas AI could not answer that right now.",
    busy: "Atlas AI is busy. Try again shortly.", newChat: "New chat", dictate: "Voice to text", stopDictation: "Stop", dictateHint: "Tap, speak, then stop. Atlas will put the words here for you to review.",
    liveVoice: "Live voice", liveTitle: "Atlas Voice", liveHint: "Talk naturally. Atlas listens, answers, and listens again.", starting: "Starting microphone…", listening: "Recording — listening", transcribing: "Converting voice to text…",
    speaking: "Atlas is speaking", paused: "Voice paused", sendNow: "Send now", interrupt: "Interrupt", tryAgain: "Try again", endVoice: "End",
    voiceUnavailable: "Voice is not available right now. Try again.", voicePermission: "Atlas needs microphone permission for voice.", noSpeech: "I didn't hear enough speech. Try again.",
    unclearSpeech: "I heard you, but not clearly enough to write it reliably. Try again a little closer to the microphone.", micOn: "Recording — microphone is hearing you", micQuiet: "Recording — speak now",
    voiceOutputApproximate: "This device has no native Kurdish voice, so Atlas is using the closest available voice.", replay: "Listen", you: "You",
    modelAnswer: "AI-generated answer · verify before acting", atlasAnswer: "Atlas answer · check current records", retry: "Retry question", composerHint: "Enter to send · Shift + Enter for a new line",
    presets: ["Show today's appointments with exact times.", "How many appointments are still pending today?", "Which reminders need attention?", "What should reception focus on today?", "Show tomorrow's appointments by doctor.", "Are clinic reminders enabled?", "Summarize no-shows in the past seven days."],
  },
  ku: {
    eyebrow: "یاریدەدەری Atlas", title: "Atlas AI", subtitle: "لەسەر Atlas، خشتەی کلینیک، دکتۆرەکان، بیرخستنەوە، کاری ڕیسێپشن و وردەکاری مەوعیدە ڕێگەپێدراوەکان بپرسە.",
    beta: "Beta · تەنها خوێندنەوە", privacy: "Atlas AI ئاماری کلینیک و ڕێکخستنە نانەخۆشییەکانی Atlas بۆ مۆدێلی AI بەکاردەهێنێت. پرسیاری تایبەت بە مەوعیدی نەخۆش لە ناو Atlas وەڵام دەدرێتەوە. زانیاری پزیشکی یان تێبینی کلینیکی مەنووسە.",
    placeholder: "لە Atlas AI بپرسە…", send: "بنێرە", thinking: "Atlas دەپشکنێت…", examples: "ئەم پرسیارانە تاقی بکەوە", error: "Atlas AI ئێستا نەیتوانی وەڵام بداتەوە.",
    busy: "Atlas AI ئێستا سەرقاڵە. کەمێکی تر هەوڵ بدەرەوە.", newChat: "گفتوگۆی نوێ", dictate: "دەنگ بۆ نووسین", stopDictation: "بوەستێنە", dictateHint: "کلیک بکە، قسە بکە، پاشان بوەستێنە. Atlas قسەکەت دەکات بە نووسین.",
    liveVoice: "گفتوگۆی دەنگی", liveTitle: "دەنگی Atlas", liveHint: "بە ئاسایی قسە بکە. Atlas گوێ دەگرێت، وەڵام دەداتەوە و دووبارە گوێ دەگرێت.", starting: "مایکرۆفۆن ئامادە دەکرێت…", listening: "تۆمار دەکرێت — گوێ دەگرێت", transcribing: "دەنگ دەگۆڕدرێت بۆ نووسین…",
    speaking: "Atlas قسە دەکات", paused: "دەنگ وەستاوە", sendNow: "ئێستا بنێرە", interrupt: "بوەستێنە", tryAgain: "دووبارە هەوڵ بدە", endVoice: "کۆتایی",
    voiceUnavailable: "دەنگ ئێستا بەردەست نییە. دووبارە هەوڵ بدە.", voicePermission: "Atlas پێویستی بە ڕێگەی مایکرۆفۆن هەیە.", noSpeech: "قسەی پێویستم نەبیست. دووبارە هەوڵ بدە.",
    unclearSpeech: "گوێم لێت بوو، بەڵام بە ڕوونی نەبوو بۆ نووسینی دڵنیابوو. کەمێک نزیکتر بە مایکرۆفۆن دووبارە قسە بکە.", micOn: "تۆمار دەکرێت — مایکرۆفۆن دەنگت دەگرێت", micQuiet: "تۆمار دەکرێت — قسە بکە",
    voiceOutputApproximate: "ئەم ئامێرە دەنگی کوردیی خۆماڵی نییە، بۆیە Atlas نزیکترین دەنگی بەردەست بەکاردەهێنێت.", replay: "گوێ بگرە", you: "تۆ",
    modelAnswer: "وەڵامی زیرەکی دەستکرد · پێش کارکردن دڵنیا ببەوە", atlasAnswer: "وەڵامی Atlas · زانیارییە نوێیەکان بپشکنە", retry: "دووبارە پرسیار بکە", composerHint: "Enter بۆ ناردن · Shift + Enter بۆ دێڕی نوێ",
    presets: ["مەوعیدەکانی ئەمڕۆ بە کاتی ورد پیشان بدە.", "ئەمڕۆ چەند مەوعید هێشتا پشتڕاست نەکراوەتەوە؟", "کام بیرخستنەوەکان پێویستیان بە سەرنج هەیە؟", "ئەمڕۆ ڕیسێپشن سەرنجی لە چی بدات؟", "مەوعیدەکانی سبەی بە پێی دکتۆر پیشان بدە.", "بیرخستنەوەکانی کلینیک چالاکن؟", "لە حەوت ڕۆژی ڕابردوودا چەند نەخۆش نەهاتن؟"],
  },
  bd: {
    eyebrow: "هاریکارێ Atlas", title: "Atlas AI", subtitle: "ل سەر Atlas، خشتێ کلینیکێ، دکتۆران، بیرخستنەوە، کارێ ڕیسێپشنێ و وردەکاریێن مەوعیدێن ڕێپێدای پسیار بکە.",
    beta: "Beta · تەنێ خواندن", privacy: "Atlas AI ئامارێن کلینیکێ و ڕێکخستنێن نەخۆش-نەناس یێن Atlas بۆ مودێلا AI ب کار دئینیت. پسیارێن تایبەت ب مەوعیدێ نەخۆشی ل ناڤ Atlas دا بەرسڤ ددرێن. زانیاری یان تێبینیێن پزیشکی مەنووسە.",
    placeholder: "ژ Atlas AI بپرسە…", send: "بفرێنە", thinking: "Atlas دپشکنیت…", examples: "ڤان پسیاران تاقی بکە", error: "Atlas AI نها نەشیا بەرسڤ بدەت.",
    busy: "Atlas AI نها مژوولە. پشتی کەمەکێ دیسان هەول بدە.", newChat: "گفتوگۆیا نوی", dictate: "دەنگ بۆ نڤیسینێ", stopDictation: "بوەستینە", dictateHint: "کلیک بکە، باخڤە، پاشی بوەستینە. Atlas دەنگێ تە دکەتە نڤیسین.",
    liveVoice: "گفتوگۆیا دەنگی", liveTitle: "دەنگێ Atlas", liveHint: "ب ئاسایی باخڤە. Atlas گوهدار دکەت، بەرسڤ ددەت و دیسان گوهدار دکەت.", starting: "مایکرۆفۆن ئامادە دبیت…", listening: "تۆمار دبیت — گوهدار دکەت", transcribing: "دەنگ دگوهۆڕیت بۆ نڤیسینێ…",
    speaking: "Atlas دئاخڤیت", paused: "دەنگ راوەستیا", sendNow: "نها بفرێنە", interrupt: "بوەستینە", tryAgain: "دیسان هەول بدە", endVoice: "دوماهیک",
    voiceUnavailable: "دەنگ نها بەردەست نینە. دیسان هەول بدە.", voicePermission: "Atlas پێدڤی ب ڕێکا مایکرۆفۆنێ هەیە.", noSpeech: "من ئاخفتنا پێدڤی نەگرت. دیسان هەول بدە.",
    unclearSpeech: "من گوهداریا تە کر، لێ بۆ نڤیسینا دڵنیابوو زۆر ڕوون نەبوو. کەمەکێ نزیکتر ب مایکرۆفۆنێ دیسان باخڤە.", micOn: "تۆمار دبیت — مایکرۆفۆن دەنگێ تە دگریت", micQuiet: "تۆمار دبیت — باخڤە",
    voiceOutputApproximate: "ڤی ئامێری دەنگەکێ کوردی یێ خۆماڵی نینە، لەورا Atlas نزیکترین دەنگێ بەردەست ب کار دئینیت.", replay: "گوهدار بکە", you: "تو",
    modelAnswer: "بەرسڤا زیرەکییا دەستکرد · بەری کارکرنێ پشتڕاست بکە", atlasAnswer: "بەرسڤا Atlas · زانیاریێن نوو بپشکنە", retry: "دیسان پسیار بکە", composerHint: "Enter بۆ فرێکرنێ · Shift + Enter بۆ دێڕا نوی",
    presets: ["مەوعیدێن ئەڤرۆ ب کاتێن ورد نیشان بدە.", "ئەڤرۆ چەند مەوعید هێشتا پشتڕاست نەبووینە؟", "کێژ بیرخستنەوە پێدڤی ب سەرنجێ هەنە؟", "ئەڤرۆ ڕیسێپشن بالێ خۆ بدەتە چی؟", "مەوعیدێن سبەی ب دکتۆری نیشان بدە.", "بیرخستنەوەیێن کلینیکێ چالاکن؟", "د حەفت ڕۆژێن بوری دا چەند نەخۆش نەهاتن؟"],
  },
  ar: {
    eyebrow: "مساعد Atlas", title: "Atlas AI", subtitle: "اسأل عن Atlas، جدول العيادة، الأطباء، التذكيرات، شغل الاستقبال وتفاصيل المواعيد المسموح لك تشوفها.",
    beta: "Beta · للقراءة فقط", privacy: "Atlas AI يستخدم إحصائيات العيادة وإعدادات Atlas غير الخاصة بالمريض ويّا نموذج AI. أسئلة تفاصيل مواعيد المرضى تنجاوب داخل Atlas. لا تكتب تشخيصات أو ملاحظات طبية.",
    placeholder: "اسأل Atlas AI…", send: "إرسال", thinking: "Atlas يدقق…", examples: "جرّب سؤال", error: "Atlas AI ما قدر يجاوب حالياً.",
    busy: "Atlas AI مشغول حالياً. حاول بعد شوي.", newChat: "محادثة جديدة", dictate: "صوت إلى نص", stopDictation: "إيقاف", dictateHint: "اضغط، احچي، وبعدين وقف. Atlas يحول كلامك إلى نص حتى تراجعه.",
    liveVoice: "محادثة صوتية", liveTitle: "صوت Atlas", liveHint: "احچي بشكل طبيعي. Atlas يسمعك، يجاوب، وبعدين يسمعك مرة ثانية.", starting: "أشغل المايكروفون…", listening: "جاري التسجيل — أسمعك", transcribing: "أحوّل الصوت إلى نص…",
    speaking: "Atlas يحچي", paused: "الصوت متوقف", sendNow: "إرسال هسه", interrupt: "قاطعه", tryAgain: "حاول مرة ثانية", endVoice: "إنهاء",
    voiceUnavailable: "الصوت غير متاح حالياً. حاول مرة ثانية.", voicePermission: "Atlas يحتاج إذن المايكروفون حتى يستخدم الصوت.", noSpeech: "ما سمعت كلام كافي. حاول مرة ثانية.",
    unclearSpeech: "سمعتك، بس الكلام مو واضح كفاية حتى أكتبه بثقة. قرب شوي من المايكروفون وحاول مرة ثانية.", micOn: "جاري التسجيل — المايكروفون يسمعك", micQuiet: "جاري التسجيل — احچي",
    voiceOutputApproximate: "هذا الجهاز ما بي صوت كردي أصلي، لذلك Atlas يستخدم أقرب صوت متاح.", replay: "اسمع", you: "إنت",
    modelAnswer: "جواب مولّد بالذكاء الاصطناعي · تأكد قبل الاعتماد عليه", atlasAnswer: "جواب من Atlas · راجع السجلات الحالية", retry: "إعادة السؤال", composerHint: "Enter للإرسال · Shift + Enter لسطر جديد",
    presets: ["وريني مواعيد اليوم ويّا الأوقات الدقيقة.", "كم موعد بعده ما متأكد اليوم؟", "يا تذكيرات تحتاج متابعة؟", "على شنو يركز الاستقبال اليوم؟", "وريني مواعيد باچر حسب الطبيب.", "التذكيرات مفعلة بهاي العيادة؟", "لخّص المرضى اللي ما حضروا خلال آخر سبعة أيام."],
  },
};

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function desiredSpeechLanguage(locale: UiLocale) {
  if (locale === "ar") return "ar-IQ";
  if (locale === "ku" || locale === "bd") return "ku-IQ";
  return "en-US";
}
function MicIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="8" height="12" rx="4"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>; }
function StopIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>; }
function SendIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 17 8-17 8 3-8-3-8Z"/><path d="M7 12h14"/></svg>; }
function SpeakerIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>; }
function LoadingRing() { return <span className="atlas-ai-loading-ring" aria-hidden="true"/>; }
function stripForSpeech(text: string) {
  return text.replace(/```[\s\S]*?```/g," ").replace(/`([^`]+)`/g,"$1").replace(/\*\*([^*]+)\*\*/g,"$1").replace(/^#{1,4}\s+/gm,"").replace(/^[-*]\s+/gm,"").replace(/\s+/g," ").trim();
}
function inlineRichText(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part,index) => part.startsWith("**") && part.endsWith("**") ? <strong key={`${index}-${part}`}>{part.slice(2,-2)}</strong> : <span key={`${index}-${part}`}>{part}</span>);
}
function RichMessage({ text }: { text: string }) {
  return <div className="atlas-ai-rich-text">{text.replace(/\r/g,"").split("\n").map((raw,index) => {
    const line=raw.trim(); if(!line) return <div className="atlas-ai-text-gap" key={`g-${index}`}/>;
    if(/^#{1,4}\s+/.test(line)) return <h3 key={`h-${index}`}>{inlineRichText(line.replace(/^#{1,4}\s+/,""))}</h3>;
    if(/^[-*•]\s+/.test(line)) return <div className="atlas-ai-bullet" key={`b-${index}`}><span>•</span><p>{inlineRichText(line.replace(/^[-*•]\s+/,""))}</p></div>;
    return <p key={`p-${index}`}>{inlineRichText(line)}</p>;
  })}</div>;
}

export function AtlasAiClient({ clinicId, clinicName, locale }: AtlasAiClientProps) {
  const t=copy[locale];
  const [question,setQuestion]=useState(""); const [messages,setMessages]=useState<ChatMessage[]>([]); const [error,setError]=useState<string|null>(null); const [voiceError,setVoiceError]=useState<string|null>(null);
  const [loading,setLoading]=useState(false); const [dictating,setDictating]=useState(false); const [liveVoice,setLiveVoice]=useState(false); const [voiceStage,setVoiceStage]=useState<VoiceStage>("idle");
  const [liveDisplayText,setLiveDisplayText]=useState(""); const [micLevel,setMicLevel]=useState(0); const [micQuiet,setMicQuiet]=useState(false); const [heardSpeech,setHeardSpeech]=useState(false); const [approximateVoice,setApproximateVoice]=useState(false);
  const messagesRef=useRef<ChatMessage[]>([]); const loadingRef=useRef(false); const liveVoiceRef=useRef(false); const speakingRef=useRef(false); const captureRef=useRef<AtlasPcmCapture|null>(null);
  const capturePurposeRef=useRef<RecordingPurpose|null>(null); const captureStreamRef=useRef<MediaStream|null>(null); const liveStreamRef=useRef<MediaStream|null>(null); const stoppingRef=useRef(false); const maxTimerRef=useRef<number|null>(null);
  const speechSeenRef=useRef(false); const lastSpeechAtRef=useRef(0); const lastAudibleAtRef=useRef(0); const speechCycleRef=useRef(0); const messageEndRef=useRef<HTMLDivElement|null>(null);

  useEffect(()=>{ messagesRef.current=messages; messageEndRef.current?.scrollIntoView({behavior:"smooth",block:"nearest"}); },[messages,loading]);
  useEffect(()=>()=>{ liveVoiceRef.current=false; speechCycleRef.current+=1; if(typeof window!=="undefined"&&"speechSynthesis" in window) window.speechSynthesis.cancel(); const capture=captureRef.current; captureRef.current=null; if(capture) void capture.discard(); captureStreamRef.current=null; liveStreamRef.current?.getTracks().forEach(track=>track.stop()); liveStreamRef.current=null; if(maxTimerRef.current!==null) window.clearTimeout(maxTimerRef.current); },[]);

  function setLoadingValue(value:boolean){ loadingRef.current=value; setLoading(value); }
  function setLiveVoiceValue(value:boolean){ liveVoiceRef.current=value; setLiveVoice(value); }
  function stopTracks(stream:MediaStream|null){ stream?.getTracks().forEach(track=>track.stop()); }
  function clearMaxTimer(){ if(maxTimerRef.current!==null){ window.clearTimeout(maxTimerRef.current); maxTimerRef.current=null; } }

  async function microphoneStream(purpose:RecordingPurpose){
    if(!atlasPcmCaptureSupported()) throw new Error("voice_unavailable");
    if(purpose==="live"&&liveStreamRef.current?.active) return liveStreamRef.current;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      if(purpose==="live") liveStreamRef.current=stream;
      return stream;
    }catch(caught){ const name=caught instanceof DOMException?caught.name:""; throw new Error(name==="NotAllowedError"||name==="SecurityError"?"permission":"voice_unavailable"); }
  }

  function onMicLevel(level:number,purpose:RecordingPurpose){
    setMicLevel(level); const now=performance.now();
    if(level>0.02){ speechSeenRef.current=true; lastSpeechAtRef.current=now; lastAudibleAtRef.current=now; setMicQuiet(false); setHeardSpeech(true); }
    else if(now-lastAudibleAtRef.current>3200) setMicQuiet(true);
    if(purpose==="live"&&speechSeenRef.current&&captureRef.current&&now-lastSpeechAtRef.current>1800&&now-captureRef.current.startedAt>1000) void stopCapture(false);
  }

  async function startCapture(purpose:RecordingPurpose){
    if(captureRef.current||stoppingRef.current||loadingRef.current||speakingRef.current||voiceStage==="transcribing") return;
    setVoiceStage("starting"); setVoiceError(null); setApproximateVoice(false); setMicLevel(0); setMicQuiet(false); setHeardSpeech(false); speechSeenRef.current=false; lastSpeechAtRef.current=performance.now(); lastAudibleAtRef.current=performance.now(); if(purpose==="live") setLiveDisplayText("");
    let stream:MediaStream;
    try{ stream=await microphoneStream(purpose); }catch(caught){ const code=caught instanceof Error?caught.message:"voice_unavailable"; setVoiceError(code==="permission"?t.voicePermission:t.voiceUnavailable); setVoiceStage("idle"); setDictating(false); return; }
    try{
      const capture=await startAtlasPcmCapture(stream,level=>onMicLevel(level,purpose)); captureRef.current=capture; capturePurposeRef.current=purpose; captureStreamRef.current=stream; setVoiceStage("listening"); if(purpose==="dictation") setDictating(true);
      clearMaxTimer(); maxTimerRef.current=window.setTimeout(()=>void stopCapture(false),purpose==="live"?30_000:45_000);
    }catch{ if(purpose!=="live") stopTracks(stream); setVoiceError(t.voiceUnavailable); setVoiceStage("idle"); setDictating(false); }
  }

  async function stopCapture(discard:boolean){
    if(stoppingRef.current) return; const capture=captureRef.current; const purpose=capturePurposeRef.current; const stream=captureStreamRef.current; if(!capture||!purpose) return;
    stoppingRef.current=true; captureRef.current=null; capturePurposeRef.current=null; captureStreamRef.current=null; clearMaxTimer(); setMicLevel(0); if(purpose==="dictation") setDictating(false);
    if(!discard){ setVoiceStage("transcribing"); setMicQuiet(false); }
    try{
      if(discard){ await capture.discard(); if(purpose==="dictation") stopTracks(stream); setVoiceStage("idle"); return; }
      const blob=await capture.stop(); if(purpose==="dictation") stopTracks(stream);
      if(blob.size<1000){ setVoiceError(t.noSpeech); setVoiceStage("idle"); return; }
      await finishRecordedTurn(blob,purpose);
    }finally{ stoppingRef.current=false; }
  }

  async function transcribeAudio(blob:Blob){
    const form=new FormData(); form.append("audio",new File([blob],"atlas-voice.wav",{type:"audio/wav"})); form.append("locale",locale);
    const response=await fetch("/api/atlas-ai/transcribe",{method:"POST",credentials:"same-origin",cache:"no-store",body:form});
    const payload=await response.json() as {text?:string;error?:string;confidence?:string};
    if(!response.ok||!payload.text?.trim()){ if(payload.error==="no_speech") throw new Error("no_speech"); if(payload.error==="unclear_speech") throw new Error("unclear_speech"); if(payload.error==="rate_limited") throw new Error("busy"); throw new Error("voice_unavailable"); }
    return payload.text.trim();
  }

  async function finishRecordedTurn(blob:Blob,purpose:RecordingPurpose){
    if(purpose==="live"&&!liveVoiceRef.current) return; setVoiceStage("transcribing"); setMicQuiet(false);
    try{ const transcript=await transcribeAudio(blob); if(purpose==="dictation"){ setQuestion(current=>`${current.trim()}${current.trim()?" ":""}${transcript}`.trim()); setVoiceStage("idle"); return; } if(!liveVoiceRef.current) return; setLiveDisplayText(transcript); await askAtlas(transcript,true); }
    catch(caught){ const code=caught instanceof Error?caught.message:"voice_unavailable"; setVoiceError(code==="no_speech"?t.noSpeech:code==="unclear_speech"?t.unclearSpeech:code==="busy"?t.busy:t.voiceUnavailable); setVoiceStage("idle"); }
  }

  function chooseVoice(lang:string){
    if(typeof window==="undefined"||!("speechSynthesis" in window)) return {voice:undefined,approximate:false}; const voices=window.speechSynthesis.getVoices(); const normalized=lang.toLowerCase();
    const exact=voices.find(voice=>voice.lang.toLowerCase()===normalized); if(exact) return {voice:exact,approximate:false}; const root=normalized.split("-")[0]; const rootVoice=voices.find(voice=>voice.lang.toLowerCase().startsWith(`${root}-`))??voices.find(voice=>voice.lang.toLowerCase()===root); if(rootVoice) return {voice:rootVoice,approximate:false};
    if(locale==="ku"||locale==="bd"){ const fallback=voices.find(voice=>voice.lang.toLowerCase().startsWith("fa-"))??voices.find(voice=>voice.lang.toLowerCase().startsWith("ar-")); if(fallback) return {voice:fallback,approximate:true}; }
    return {voice:undefined,approximate:false};
  }

  async function speakAnswer(text:string,continueConversation:boolean){
    if(!text||typeof window==="undefined"||!("speechSynthesis" in window)||typeof SpeechSynthesisUtterance==="undefined"){ setVoiceStage("idle"); return; }
    speechCycleRef.current+=1; const cycle=speechCycleRef.current; window.speechSynthesis.cancel(); const utterance=new SpeechSynthesisUtterance(stripForSpeech(text)); const selected=chooseVoice(desiredSpeechLanguage(locale));
    if(selected.voice){ utterance.voice=selected.voice; utterance.lang=selected.voice.lang; }else utterance.lang=desiredSpeechLanguage(locale); utterance.rate=.98; utterance.pitch=1; utterance.volume=1; setApproximateVoice(selected.approximate);
    speakingRef.current=true; setVoiceStage("speaking"); setVoiceError(null); if(continueConversation) setLiveDisplayText(text);
    const finish=()=>{ if(speechCycleRef.current!==cycle) return; speakingRef.current=false; setVoiceStage("idle"); if(continueConversation&&liveVoiceRef.current) window.setTimeout(()=>{ if(liveVoiceRef.current) void startCapture("live"); },350); };
    utterance.onend=finish; utterance.onerror=finish; window.speechSynthesis.speak(utterance);
  }

  async function askAtlas(value:string,fromLiveVoice=false){
    const nextQuestion=value.trim(); if(nextQuestion.length<2||loadingRef.current) return null; setLoadingValue(true); setError(null); if(fromLiveVoice) setVoiceStage("thinking");
    const userMessage:ChatMessage={id:makeId(),role:"user",content:nextQuestion}; const previousMessages=messagesRef.current; const requestHistory=[...previousMessages,userMessage].slice(-14); messagesRef.current=requestHistory; setMessages(requestHistory); setQuestion("");
    try{
      const response=await fetch("/api/atlas-ai",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({clinicId,locale,interaction:fromLiveVoice?"voice":"text",messages:requestHistory.map(({role,content})=>({role,content}))})});
      const payload=await response.json() as {answer?:string;error?:string;mode?:"model"|"atlas_core"}; if(!response.ok||!payload.answer){ if(payload.error==="rate_limited"||payload.error==="ai_busy") throw new Error("busy"); throw new Error("failed"); }
      const assistantMessage:ChatMessage={id:makeId(),role:"assistant",content:payload.answer,mode:payload.mode}; const nextMessages=[...messagesRef.current,assistantMessage].slice(-14); messagesRef.current=nextMessages; setMessages(nextMessages); setLoadingValue(false); if(fromLiveVoice&&liveVoiceRef.current) await speakAnswer(payload.answer,true); else setVoiceStage("idle"); return payload.answer;
     }catch(caught){ const code=caught instanceof Error?caught.message:"failed"; const message=code==="busy"?t.busy:t.error;
      // Restore the full pre-request history (including the oldest turn if the 14-message window clipped it).
      messagesRef.current=previousMessages; setMessages(previousMessages); setQuestion(nextQuestion);
      setError(message); if(fromLiveVoice) setVoiceError(message); setVoiceStage("idle"); return null; }
    finally{ setLoadingValue(false); }
  }

  const transcribing=voiceStage==="transcribing"&&!liveVoice;
  const starting=voiceStage==="starting"&&!liveVoice;
  function toggleDictation(){ if(transcribing||starting) return; if(dictating){ void stopCapture(navigator.onLine===false); return; } if(liveVoiceRef.current||loadingRef.current||stoppingRef.current) return; setError(null); setVoiceError(null); void startCapture("dictation"); }
  function startLiveVoice(){ if(loadingRef.current||dictating||liveVoiceRef.current||stoppingRef.current||transcribing) return; if(!atlasPcmCaptureSupported()){ setVoiceError(t.voiceUnavailable); return; } setError(null); setVoiceError(null); setLiveDisplayText(""); setLiveVoiceValue(true); setVoiceStage("idle"); void startCapture("live"); }
  function endLiveVoice(){ setLiveVoiceValue(false); speechCycleRef.current+=1; if(typeof window!=="undefined"&&"speechSynthesis" in window) window.speechSynthesis.cancel(); speakingRef.current=false; const capture=captureRef.current; const captureStream=captureStreamRef.current; captureRef.current=null; capturePurposeRef.current=null; captureStreamRef.current=null; clearMaxTimer(); if(capture) void capture.discard(); if(captureStream&&captureStream!==liveStreamRef.current) stopTracks(captureStream); stopTracks(liveStreamRef.current); liveStreamRef.current=null; setVoiceStage("idle"); setLiveDisplayText(""); setMicLevel(0); setMicQuiet(false); setHeardSpeech(false); setApproximateVoice(false); setVoiceError(null); }
  function interruptAtlas(){ if(!liveVoiceRef.current) return; speechCycleRef.current+=1; if(typeof window!=="undefined"&&"speechSynthesis" in window) window.speechSynthesis.cancel(); speakingRef.current=false; setVoiceStage("idle"); setVoiceError(null); void startCapture("live"); }
  function retryLiveVoice(){ if(!liveVoiceRef.current||loadingRef.current||captureRef.current||speakingRef.current||stoppingRef.current) return; setVoiceError(null); void startCapture("live"); }
  function newChat(){ if(loadingRef.current) return; endLiveVoice(); if(captureRef.current) void stopCapture(true); setDictating(false); setMessages([]); messagesRef.current=[]; setQuestion(""); setError(null); setVoiceError(null); }
  function submit(event:FormEvent<HTMLFormElement>){ event.preventDefault(); if(dictating||transcribing||starting) return; void askAtlas(question); }
  function composerKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){ if(event.key==="Enter"&&!event.shiftKey&&!dictating&&!transcribing&&!starting){ event.preventDefault(); void askAtlas(question); } }

  const voiceStatus=voiceStage==="starting"?t.starting:voiceStage==="listening"?t.listening:voiceStage==="transcribing"?t.transcribing:voiceStage==="thinking"?t.thinking:voiceStage==="speaking"?t.speaking:t.paused;
  const micStatus=heardSpeech&&!micQuiet?t.micOn:t.micQuiet; const orbScale=.96+Math.min(.08,micLevel*.08); const orbStyle={transform:`scale(${orbScale})`,boxShadow:`0 0 ${45+Math.round(micLevel*75)}px rgba(82,220,168,.25)`} as CSSProperties;
  const dictationLabel=transcribing?t.transcribing:starting?t.starting:dictating?t.stopDictation:t.dictate;
  const dictationIcon=transcribing||starting?<LoadingRing/>:dictating?<><span className="atlas-ai-record-dot"/><StopIcon/></>:<MicIcon/>;
  const dictationHint=transcribing?t.transcribing:starting?t.starting:dictating?micStatus:t.dictateHint;

  return <section className="atlas-ai-card" aria-labelledby="atlas-ai-title">
    <div className="atlas-ai-heading"><div><div className="eyebrow">{t.eyebrow}</div><h1 id="atlas-ai-title">{t.title}</h1><p>{t.subtitle}</p></div><div className="atlas-ai-heading-actions"><span className="atlas-ai-beta">{t.beta}</span><button type="button" onClick={newChat} disabled={loading}>{t.newChat}</button></div></div>
    <div className="atlas-ai-clinic" data-atlas-user-content="true">{clinicName}</div><p className="atlas-ai-privacy">{t.privacy}</p>
    <div className="atlas-ai-thread" aria-live="polite">
      {messages.length===0?<div className="atlas-ai-empty"><div className="atlas-ai-orb">A</div><strong>{t.title}</strong><span>{t.examples}</span><div className="atlas-ai-presets">{t.presets.map(preset=><button key={preset} type="button" onClick={()=>void askAtlas(preset)} disabled={loading}>{preset}</button>)}</div></div>:messages.map(message=><article key={message.id} className={`atlas-ai-message is-${message.role}`}><div className="atlas-ai-message-role">{message.role==="assistant"?"Atlas AI":t.you}</div>{message.role==="assistant"?<div data-atlas-user-content="true" dir="auto"><RichMessage text={message.content}/></div>:<p data-atlas-user-content="true" dir="auto">{message.content}</p>}{message.role==="assistant"?<div className="atlas-ai-answer-source">{message.mode==="atlas_core"?t.atlasAnswer:t.modelAnswer}</div>:null}{message.role==="assistant"?<button className="atlas-ai-listen-button" type="button" onClick={()=>void speakAnswer(message.content,false)}><SpeakerIcon/> {t.replay}</button>:null}</article>)}
      {loading?<article className="atlas-ai-message is-assistant is-thinking" role="status"><div className="atlas-ai-message-role">Atlas AI</div><p><i/><i/><i/> {t.thinking}</p></article>:null}<div ref={messageEndRef}/>
    </div>
    {error?<div className="atlas-ai-error atlas-ai-request-recovery" role="alert"><span>{error}</span><button type="button" onClick={()=>void askAtlas(question)} disabled={loading||question.trim().length<2}>{t.retry}</button></div>:null}{voiceError&&!liveVoice?<p className="atlas-ai-error" role="alert">{voiceError}</p>:null}
    <div className="atlas-ai-voice-tools" aria-live="polite"><button className="atlas-ai-live-button" type="button" onClick={startLiveVoice} disabled={loading||dictating||transcribing||starting}><span className="atlas-ai-live-dot"/> {t.liveVoice}</button><button className={`atlas-ai-dictate-button ${dictating?"is-on":""} ${transcribing||starting?"is-loading":""}`} type="button" data-atlas-offline-local-action={dictating?"true":undefined} onClick={toggleDictation} disabled={loading||liveVoice||transcribing||starting} aria-busy={transcribing||starting}>{dictationIcon}<span>{dictationLabel}</span></button><div className={`atlas-ai-mic-mini ${dictating?"is-live":""}`} aria-hidden="true"><span style={{transform:`scaleY(${Math.max(.12,micLevel)})`}}/><span style={{transform:`scaleY(${Math.max(.2,micLevel*.8)})`}}/><span style={{transform:`scaleY(${Math.max(.1,micLevel*.65)})`}}/></div><span className="atlas-ai-dictate-hint">{dictationHint}</span></div>
    <form className={`atlas-ai-composer ${transcribing||starting?"is-voice-busy":""}`} onSubmit={submit} aria-busy={transcribing||starting}><textarea dir="auto" value={question} onChange={event=>setQuestion(event.target.value)} onKeyDown={composerKeyDown} placeholder={t.placeholder} maxLength={1200} rows={2} aria-label={t.placeholder} disabled={loading||transcribing||starting}/><div className="atlas-ai-composer-actions"><button className={`atlas-ai-mic-button ${dictating?"is-on":""} ${transcribing||starting?"is-loading":""}`} type="button" data-atlas-offline-local-action={dictating?"true":undefined} onClick={toggleDictation} aria-label={dictationLabel} aria-busy={transcribing||starting} disabled={loading||liveVoice||transcribing||starting}>{dictationIcon}</button><button className="atlas-ai-send-button" type="submit" disabled={loading||dictating||transcribing||starting||question.trim().length<2} aria-label={t.send}><SendIcon/></button></div></form><p className="atlas-ai-composer-hint">{t.composerHint}</p>
    {(transcribing||starting)?<div className="atlas-ai-inline-voice-progress" role="status"><LoadingRing/><span>{dictationHint}</span></div>:null}
    {liveVoice?<div className="atlas-ai-live-overlay" role="dialog" aria-modal="true" aria-label={t.liveTitle}><div className="atlas-ai-live-topbar"><div><span>ATLAS</span><strong>{t.liveTitle}</strong></div><button type="button" data-atlas-offline-local-action="true" onClick={endLiveVoice}>{t.endVoice}</button></div><div className={`atlas-ai-live-center is-${voiceStage}`}><div className="atlas-ai-live-orb" style={orbStyle}><span>A</span><i/><i/><i/></div><strong className="atlas-ai-live-state">{voiceStage==="starting"||voiceStage==="transcribing"?<LoadingRing/>:null}{voiceStatus}</strong>{voiceStage==="listening"?<div className={`atlas-ai-live-mic-state ${micQuiet?"is-quiet":""}`}><span className="atlas-ai-record-dot"/>{micStatus}</div>:null}{liveDisplayText?<div className="atlas-ai-live-transcript" data-atlas-user-content="true">{stripForSpeech(liveDisplayText).slice(0,500)}</div>:<div className="atlas-ai-live-transcript is-hint">{t.liveHint}</div>}{approximateVoice&&voiceStage==="speaking"?<div className="atlas-ai-live-note">{t.voiceOutputApproximate}</div>:null}{voiceError?<div className="atlas-ai-live-error" role="alert">{voiceError}</div>:null}</div><div className="atlas-ai-live-controls">{voiceStage==="listening"?<button className="is-primary" type="button" onClick={()=>void stopCapture(false)}>{t.sendNow}</button>:null}{voiceStage==="speaking"?<button className="is-primary" type="button" onClick={interruptAtlas}>{t.interrupt}</button>:null}{voiceStage==="idle"?<button className="is-primary" type="button" onClick={retryLiveVoice}>{t.tryAgain}</button>:null}<button type="button" data-atlas-offline-local-action="true" onClick={endLiveVoice}>{t.endVoice}</button></div></div>:null}
    <style>{`
      .atlas-ai-card{border:1px solid var(--line);border-radius:24px;padding:22px;background:var(--surface);box-shadow:var(--shadow-sm);min-height:650px;display:flex;flex-direction:column}.atlas-ai-heading{display:flex;justify-content:space-between;gap:18px}.atlas-ai-heading h1{margin:0;font-size:30px;letter-spacing:-.04em}.atlas-ai-heading p{margin:7px 0 0;color:var(--muted);font-size:13px;line-height:1.55;max-width:700px}.atlas-ai-heading-actions{display:flex;align-items:center;gap:8px}.atlas-ai-heading-actions button,.atlas-ai-beta{border:1px solid var(--line);border-radius:999px;padding:7px 10px;background:transparent;color:var(--ink-soft);font-size:10px;font-weight:800}.atlas-ai-beta{border:0;background:var(--accent-soft);color:var(--accent)}.atlas-ai-clinic{margin-top:16px;font-size:12px;font-weight:820}.atlas-ai-privacy{margin:7px 0 12px;border-radius:12px;padding:9px 11px;background:var(--surface-soft);color:var(--muted);font-size:10px;line-height:1.45}.atlas-ai-thread{flex:1;min-height:330px;max-height:510px;overflow:auto;display:flex;flex-direction:column;gap:12px;padding:12px 3px 16px}.atlas-ai-empty{margin:auto;display:grid;justify-items:center;text-align:center;gap:9px;width:min(100%,650px);padding:24px 10px}.atlas-ai-orb{display:grid;place-items:center;width:54px;height:54px;border-radius:20px;background:linear-gradient(145deg,var(--accent),#0c6b50);color:#fff;font-size:22px;font-weight:900}.atlas-ai-presets{display:flex;flex-wrap:wrap;justify-content:center;gap:7px}.atlas-ai-presets button{border:1px solid var(--line);border-radius:999px;padding:9px 11px;background:var(--surface-soft);font-size:10.5px;font-weight:720}.atlas-ai-message{width:min(88%,690px);border-radius:18px;padding:12px 14px;display:grid;gap:5px}.atlas-ai-message.is-user{align-self:flex-end;background:var(--accent);color:#fff}.atlas-ai-message.is-assistant{align-self:flex-start;background:var(--surface-soft);border:1px solid var(--line)}.atlas-ai-message-role{font-size:9.5px;font-weight:850;opacity:.68;text-transform:uppercase;letter-spacing:.05em}.atlas-ai-message>p,.atlas-ai-rich-text p{margin:0;font-size:13px;line-height:1.65;white-space:pre-wrap}.atlas-ai-rich-text{display:grid;gap:6px}.atlas-ai-rich-text h3{font-size:14px;margin:4px 0 1px}.atlas-ai-bullet{display:grid;grid-template-columns:13px 1fr;gap:5px}.atlas-ai-text-gap{height:4px}.atlas-ai-listen-button{justify-self:start;border:0;background:transparent;color:var(--accent);padding:3px 0;display:flex;align-items:center;gap:5px;font-size:10px;font-weight:800}.atlas-ai-listen-button svg,.atlas-ai-mic-button svg,.atlas-ai-send-button svg,.atlas-ai-dictate-button svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8}.is-thinking p{display:flex;align-items:center;gap:4px;color:var(--muted)}.is-thinking i{width:5px;height:5px;border-radius:50%;background:var(--accent);animation:atlasPulse 1s infinite}.is-thinking i:nth-child(2){animation-delay:.15s}.is-thinking i:nth-child(3){animation-delay:.3s}@keyframes atlasPulse{50%{opacity:.25;transform:translateY(-2px)}}.atlas-ai-error{margin:7px 0;color:var(--danger);font-size:11px}.atlas-ai-voice-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:5px 0 9px}.atlas-ai-live-button,.atlas-ai-dictate-button{border:1px solid var(--line);border-radius:999px;min-height:36px;padding:8px 12px;background:var(--surface-soft);display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:820}.atlas-ai-live-button{background:var(--accent);color:#fff;border-color:var(--accent)}.atlas-ai-dictate-button.is-on{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}.atlas-ai-dictate-button.is-loading{color:var(--accent);border-color:var(--accent)}.atlas-ai-record-dot{width:7px;height:7px;border-radius:50%;background:#12a56f;display:inline-block;animation:atlasRecordPulse .85s ease-in-out infinite alternate;box-shadow:0 0 0 4px rgba(18,165,111,.12)}@keyframes atlasRecordPulse{to{opacity:.35;transform:scale(.72)}}.atlas-ai-live-dot{width:7px;height:7px;border-radius:50%;background:#b9ffd9;box-shadow:0 0 0 5px rgba(185,255,217,.12)}.atlas-ai-loading-ring{width:15px;height:15px;border-radius:50%;border:2px solid currentColor;border-inline-end-color:transparent;display:inline-block;flex:0 0 auto;animation:atlasSpin .7s linear infinite}@keyframes atlasSpin{to{transform:rotate(360deg)}}.atlas-ai-dictate-hint{color:var(--muted);font-size:10px}.atlas-ai-mic-mini{display:flex;align-items:center;gap:2px;height:19px;opacity:.35}.atlas-ai-mic-mini.is-live{opacity:1}.atlas-ai-mic-mini span{width:3px;height:16px;border-radius:99px;background:var(--accent);transform-origin:center;transition:transform .08s linear}.atlas-ai-composer{display:flex;align-items:flex-end;gap:9px;border:1px solid #cbd4ce;border-radius:18px;padding:8px;background:#fff;transition:border-color .15s,box-shadow .15s}.atlas-ai-composer.is-voice-busy{border-color:rgba(18,165,111,.5);box-shadow:0 0 0 3px rgba(18,165,111,.07)}.atlas-ai-composer textarea{flex:1;min-height:52px;max-height:160px;resize:none;border:0;padding:8px 4px;background:transparent;font:inherit;font-size:13px;outline:none}.atlas-ai-composer-actions{display:flex;gap:6px}.atlas-ai-mic-button,.atlas-ai-send-button{width:38px;height:38px;border-radius:50%;display:grid;place-items:center}.atlas-ai-mic-button{border:1px solid var(--line);background:var(--surface-soft)}.atlas-ai-mic-button.is-on{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}.atlas-ai-mic-button.is-loading{color:var(--accent);border-color:var(--accent)}.atlas-ai-mic-button .atlas-ai-record-dot{position:absolute;transform:translate(12px,-12px)}.atlas-ai-send-button{border:0;background:var(--accent);color:#fff}.atlas-ai-send-button:disabled,.atlas-ai-mic-button:disabled,.atlas-ai-dictate-button:disabled{opacity:.55}.atlas-ai-inline-voice-progress{display:flex;align-items:center;justify-content:flex-end;gap:7px;color:var(--accent);font-size:10px;font-weight:800;padding:7px 4px 0}.atlas-ai-live-overlay{position:fixed;inset:0;z-index:1000;background:radial-gradient(circle at 50% 38%,rgba(28,128,92,.23),transparent 34%),linear-gradient(180deg,#071f19,#0b2b22);color:#fff;display:flex;flex-direction:column;padding:max(22px,env(safe-area-inset-top)) max(22px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(22px,env(safe-area-inset-left))}.atlas-ai-live-topbar{display:flex;justify-content:space-between;align-items:center}.atlas-ai-live-topbar>div{display:grid;gap:2px}.atlas-ai-live-topbar span{font-size:9px;letter-spacing:.22em;opacity:.65;font-weight:900}.atlas-ai-live-topbar strong{font-size:16px}.atlas-ai-live-topbar button,.atlas-ai-live-controls button{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#fff;border-radius:999px;padding:10px 15px;font-weight:800}.atlas-ai-live-center{margin:auto;display:grid;justify-items:center;text-align:center;gap:15px;width:min(92vw,650px)}.atlas-ai-live-orb{position:relative;width:160px;height:160px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 25%,#7ff0c2,#188561 45%,#0b3f31 75%);transition:transform .09s linear,box-shadow .09s linear}.atlas-ai-live-orb span{font-size:44px;font-weight:900}.atlas-ai-live-orb i{position:absolute;inset:-11px;border:1px solid rgba(133,255,209,.18);border-radius:50%;animation:atlasRing 2.4s infinite}.atlas-ai-live-orb i:nth-child(2){inset:-24px;animation-delay:.3s}.atlas-ai-live-orb i:nth-child(3){inset:-38px;animation-delay:.6s}@keyframes atlasRing{50%{opacity:.25;transform:scale(1.03)}}.is-speaking .atlas-ai-live-orb{animation:atlasSpeak .85s ease-in-out infinite alternate}.is-starting .atlas-ai-live-orb,.is-transcribing .atlas-ai-live-orb{animation:atlasBreathe 1.25s ease-in-out infinite alternate}@keyframes atlasSpeak{to{transform:scale(1.05)}}@keyframes atlasBreathe{to{filter:brightness(1.12);transform:scale(1.025)}}.atlas-ai-live-state{font-size:20px;display:flex;align-items:center;justify-content:center;gap:9px}.atlas-ai-live-mic-state{font-size:11px;color:#a8f3d5;display:flex;align-items:center;gap:8px}.atlas-ai-live-mic-state .atlas-ai-record-dot{background:#b9ffd9;box-shadow:0 0 0 4px rgba(185,255,217,.12)}.atlas-ai-live-mic-state.is-quiet{color:#ffd99b}.atlas-ai-live-transcript{max-width:600px;font-size:15px;line-height:1.55;color:rgba(255,255,255,.9)}.atlas-ai-live-transcript.is-hint{font-size:12px;color:rgba(255,255,255,.56)}.atlas-ai-live-note{font-size:10px;color:#ffd99b}.atlas-ai-live-error{max-width:520px;padding:10px 13px;border-radius:12px;background:rgba(255,90,90,.13);font-size:11px;color:#ffd0d0}.atlas-ai-live-controls{display:flex;justify-content:center;gap:9px;flex-wrap:wrap}.atlas-ai-live-controls .is-primary{background:#fff;color:#0a2b22;border-color:#fff}@media(max-width:720px){.atlas-ai-card{padding:15px;border-radius:18px;min-height:calc(100dvh - 160px)}.atlas-ai-heading{display:grid}.atlas-ai-heading-actions{justify-content:flex-start}.atlas-ai-thread{max-height:none}.atlas-ai-message{width:94%}.atlas-ai-presets{display:grid;width:100%}.atlas-ai-voice-tools{align-items:flex-start}.atlas-ai-dictate-hint{width:100%}.atlas-ai-live-orb{width:138px;height:138px}}

        /* Native React workspace: no DOM rewriting and no new data flows. */
        .atlas-ai-card{position:relative;overflow:hidden;border-color:var(--line-strong);background:var(--surface);box-shadow:0 12px 36px rgba(13,47,37,.07)}
        .atlas-ai-heading{position:relative;isolation:isolate;overflow:hidden;align-items:flex-start;padding:25px 27px;border-radius:20px;background:linear-gradient(120deg,#07392f,#12684e);color:#fff}
        .atlas-ai-heading:after{content:"";pointer-events:none;position:absolute;z-index:-1;width:230px;height:230px;border:1px solid rgba(255,255,255,.15);border-radius:50%;inset-block-start:-155px;inset-inline-end:-40px;box-shadow:0 0 0 40px rgba(255,255,255,.04),0 0 0 80px rgba(255,255,255,.025)}
        .atlas-ai-heading .eyebrow{color:#a1ebd2;letter-spacing:.08em}.atlas-ai-heading h1{font-size:clamp(29px,3vw,39px)}.atlas-ai-heading p{color:rgba(255,255,255,.83);max-width:620px}
        .atlas-ai-heading-actions{flex-wrap:wrap;justify-content:flex-end}.atlas-ai-heading-actions button{border-color:rgba(255,255,255,.25);color:#fff;background:rgba(255,255,255,.09);min-height:36px}.atlas-ai-heading-actions button:disabled{opacity:.5}
        .atlas-ai-heading .atlas-ai-beta{background:rgba(167,255,211,.16);color:#d1ffe9}
        .atlas-ai-clinic{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border:1px solid var(--line);border-radius:999px;background:var(--surface-soft);overflow-wrap:anywhere;max-width:100%}
        .atlas-ai-clinic:before{content:"";width:7px;height:7px;flex:none;border-radius:50%;background:var(--accent)}
        .atlas-ai-privacy{font-size:11.5px;line-height:1.6;padding:12px 14px;border-inline-start:3px solid var(--accent);margin-block:12px 14px}
        .atlas-ai-thread{scroll-padding-block:18px;gap:15px;padding:18px 4px 23px;max-height:560px;overscroll-behavior:contain}
        .atlas-ai-empty{width:min(100%,780px);padding-block:32px}.atlas-ai-empty strong{font-size:21px}.atlas-ai-empty>span{font-size:13px;color:var(--muted)}
        .atlas-ai-orb{width:64px;height:64px;border-radius:22px;box-shadow:0 10px 32px rgba(20,120,86,.19)}
        .atlas-ai-presets{width:100%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-block-start:12px}
        .atlas-ai-presets button{min-height:54px;line-height:1.48;white-space:normal;text-align:start;overflow-wrap:anywhere;border-radius:13px;padding:11px 14px;font-size:12px;font-weight:700;background:var(--surface);transition:border-color .15s,background .15s}
        .atlas-ai-presets button:hover:not(:disabled){border-color:var(--accent);background:var(--accent-soft)}.atlas-ai-presets button:disabled{opacity:.55}
        .atlas-ai-message{min-width:0;width:min(90%,720px);padding:14px 16px;overflow-wrap:anywhere}.atlas-ai-message.is-assistant{border-inline-start:3px solid var(--accent)}.atlas-ai-message.is-user{background:linear-gradient(140deg,var(--accent),#0d7255)}
        .atlas-ai-message-role{font-size:10px}.atlas-ai-message>p,.atlas-ai-rich-text p{font-size:13.5px;line-height:1.75;unicode-bidi:plaintext}.atlas-ai-rich-text h3{font-size:15px}.atlas-ai-bullet{grid-template-columns:14px minmax(0,1fr)}
        .atlas-ai-answer-source{font-size:10.5px;line-height:1.45;color:var(--muted);padding-block-start:8px;margin-block-start:5px;border-block-start:1px solid var(--line)}
        .atlas-ai-composer{background:var(--surface);border-color:var(--line-strong);box-shadow:0 3px 12px rgba(12,36,27,.05)}.atlas-ai-composer:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
        .atlas-ai-composer textarea{min-width:0;font-size:14px;line-height:1.6}.atlas-ai-composer-hint{font-size:10.5px;line-height:1.5;color:var(--muted);text-align:end;margin:5px 8px 0}
        .atlas-ai-request-recovery{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface-soft)}
        .atlas-ai-request-recovery button{border:1px solid var(--accent);background:var(--accent-soft);color:var(--accent);border-radius:9px;padding:8px 11px;min-height:36px;font:inherit;font-weight:800;cursor:pointer}
        .atlas-ai-card :is(button,textarea):focus-visible{outline:2px solid var(--accent);outline-offset:3px}
        @media(max-width:720px){.atlas-ai-card{padding:11px}.atlas-ai-heading{padding:20px 17px;border-radius:15px;gap:13px}.atlas-ai-heading h1{font-size:30px}.atlas-ai-heading-actions{justify-content:flex-start}.atlas-ai-thread{padding:14px 2px 18px;min-height:280px}.atlas-ai-empty{padding:15px 4px}.atlas-ai-presets{grid-template-columns:1fr;gap:7px}.atlas-ai-presets button{min-height:48px;padding:11px 13px}.atlas-ai-message{width:min(96%,720px);padding:12px 13px}.atlas-ai-privacy{font-size:11px}}
        @media(min-width:721px) and (max-width:1024px){.atlas-ai-thread{max-height:57dvh}}
        @media(prefers-reduced-motion:reduce){.atlas-ai-card :is(.atlas-ai-presets button,.atlas-ai-loading-ring,.is-thinking i){transition:none;animation:none}}
    `}</style>
  </section>;
}
