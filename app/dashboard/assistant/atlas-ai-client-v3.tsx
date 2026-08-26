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
type VoiceStage = "idle" | "listening" | "transcribing" | "thinking" | "speaking";
type RecordingPurpose = "dictation" | "live";

type Copy = {
  eyebrow: string; title: string; subtitle: string; beta: string; privacy: string; placeholder: string; send: string;
  thinking: string; examples: string; error: string; busy: string; newChat: string; dictate: string; stopDictation: string;
  dictateHint: string; liveVoice: string; liveTitle: string; liveHint: string; listening: string; transcribing: string;
  speaking: string; paused: string; sendNow: string; interrupt: string; tryAgain: string; endVoice: string;
  voiceUnavailable: string; voicePermission: string; noSpeech: string; unclearSpeech: string; micOn: string; micQuiet: string;
  voiceOutputApproximate: string; replay: string; you: string; presets: string[];
};

const copy: Record<UiLocale, Copy> = {
  en: {
    eyebrow: "Your Atlas assistant", title: "Atlas AI", subtitle: "Simple help for clinic work, writing, planning, translation, and everyday questions.",
    beta: "Beta · read-only", privacy: "Atlas sends this conversation plus aggregated appointment statistics to the AI provider. Do not include patient names, phone numbers, message contents, or patient-specific clinical information.",
    placeholder: "Message Atlas AI…", send: "Send", thinking: "Thinking…", examples: "Try asking", error: "Atlas AI could not answer that right now.",
    busy: "Atlas AI is busy. Try again shortly.", newChat: "New chat", dictate: "Dictate", stopDictation: "Stop", dictateHint: "Speak, review the text, then tap Send yourself.",
    liveVoice: "Live voice", liveTitle: "Atlas Voice", liveHint: "Talk naturally. Atlas listens, answers, and listens again.", listening: "Listening", transcribing: "Understanding what you said…",
    speaking: "Atlas is speaking", paused: "Voice paused", sendNow: "Send now", interrupt: "Interrupt", tryAgain: "Try again", endVoice: "End",
    voiceUnavailable: "Voice is not available right now. Try again.", voicePermission: "Atlas needs microphone permission for voice.", noSpeech: "I didn't hear enough speech. Try again.",
    unclearSpeech: "I heard you, but not clearly enough to write it reliably. Try again a little closer to the microphone.", micOn: "Microphone is hearing you", micQuiet: "Microphone is on — speak now",
    voiceOutputApproximate: "This device has no native Kurdish voice, so Atlas is using the closest available voice.", replay: "Listen", you: "You",
    presets: ["How busy are we today?", "What should reception focus on today?", "What can Atlas AI do?", "Help me write a polite appointment message."],
  },
  ku: {
    eyebrow: "یاریدەدەری Atlas", title: "Atlas AI", subtitle: "یارمەتیی سادە بۆ کاری کلینیک، نووسین، پلان، وەرگێڕان و پرسیاری ڕۆژانە.",
    beta: "Beta · تەنها خوێندنەوە", privacy: "Atlas ئەم گفتوگۆیە لەگەڵ ئاماری کۆکراوەی مەوعیدەکان دەنێرێت بۆ دابینکەری AI. ناوی نەخۆش، ژمارەی مۆبایل، ناوەڕۆکی نامە یان زانیاری پزیشکی تایبەت بە نەخۆش مەنووسە.",
    placeholder: "نامە بۆ Atlas AI…", send: "بنێرە", thinking: "بیر دەکاتەوە…", examples: "ئەم پرسیارانە تاقی بکەوە", error: "Atlas AI ئێستا نەیتوانی وەڵام بداتەوە.",
    busy: "Atlas AI ئێستا سەرقاڵە. کەمێکی تر هەوڵ بدەرەوە.", newChat: "گفتوگۆی نوێ", dictate: "دەنگ بۆ نووسین", stopDictation: "بوەستێنە", dictateHint: "قسە بکە، نووسینەکە ببینە، پاشان خۆت بنێرە.",
    liveVoice: "گفتوگۆی دەنگی", liveTitle: "دەنگی Atlas", liveHint: "بە ئاسایی قسە بکە. Atlas گوێ دەگرێت، وەڵام دەداتەوە و دووبارە گوێ دەگرێت.", listening: "گوێ دەگرێت", transcribing: "قسەکەت تێدەگات…",
    speaking: "Atlas قسە دەکات", paused: "دەنگ وەستاوە", sendNow: "ئێستا بنێرە", interrupt: "بوەستێنە", tryAgain: "دووبارە هەوڵ بدە", endVoice: "کۆتایی",
    voiceUnavailable: "دەنگ ئێستا بەردەست نییە. دووبارە هەوڵ بدە.", voicePermission: "Atlas پێویستی بە ڕێگەی مایکرۆفۆن هەیە.", noSpeech: "قسەی پێویستم نەبیست. دووبارە هەوڵ بدە.",
    unclearSpeech: "گوێم لێت بوو، بەڵام بە ڕوونی نەبوو بۆ نووسینی دڵنیابوو. کەمێک نزیکتر بە مایکرۆفۆن دووبارە قسە بکە.", micOn: "مایکرۆفۆن دەنگت دەگرێت", micQuiet: "مایکرۆفۆن کراوەیە — قسە بکە",
    voiceOutputApproximate: "ئەم ئامێرە دەنگی کوردیی خۆماڵی نییە، بۆیە Atlas نزیکترین دەنگی بەردەست بەکاردەهێنێت.", replay: "گوێ بگرە", you: "تۆ",
    presets: ["ئەمڕۆ چەند قەرەباڵغین؟", "ئەمڕۆ ڕیسێپشن سەرنجی لە چی بێت؟", "Atlas AI چی دەتوانێت بکات؟", "یارمەتیم بدە نامەیەکی ڕێک بۆ مەوعید بنووسم."],
  },
  bd: {
    eyebrow: "هاریکارێ Atlas", title: "Atlas AI", subtitle: "هاریکاریا سادە بۆ کارێ کلینیکێ، نڤیسین، پلان، وەرگێڕان و پسیارێن ڕۆژانە.",
    beta: "Beta · تەنێ خواندن", privacy: "Atlas ئەڤ گفتوگۆیێ ل گەل ئامارێن کۆمکری یێن مەوعیدان دفرێنیت بۆ دابینکەرێ AI. ناڤێ نەخۆشی، ژمارا موبایلێ، ناڤەروکا پەیامان یان زانیاریێن پزیشکی یێن تایبەت ب نەخۆشی مەنووسە.",
    placeholder: "پەیام بۆ Atlas AI…", send: "بفرێنە", thinking: "هزر دکەت…", examples: "ڤان پسیاران تاقی بکە", error: "Atlas AI نها نەشیا بەرسڤ بدەت.",
    busy: "Atlas AI نها مژوولە. پشتی کەمەکێ دیسان هەول بدە.", newChat: "گفتوگۆیا نوی", dictate: "دەنگ بۆ نڤیسینێ", stopDictation: "بوەستینە", dictateHint: "باخڤە، نڤیسینێ ببینە، پاشی خۆ بفرێنە.",
    liveVoice: "گفتوگۆیا دەنگی", liveTitle: "دەنگێ Atlas", liveHint: "ب ئاسایی باخڤە. Atlas گوهدار دکەت، بەرسڤ ددەت و دیسان گوهدار دکەت.", listening: "گوهدار دکەت", transcribing: "ئاخفتنا تە تێدگەهیت…",
    speaking: "Atlas دئاخڤیت", paused: "دەنگ راوەستیا", sendNow: "نها بفرێنە", interrupt: "بوەستینە", tryAgain: "دیسان هەول بدە", endVoice: "دوماهیک",
    voiceUnavailable: "دەنگ نها بەردەست نینە. دیسان هەول بدە.", voicePermission: "Atlas پێدڤی ب ڕێکا مایکرۆفۆنێ هەیە.", noSpeech: "من ئاخفتنا پێدڤی نەگرت. دیسان هەول بدە.",
    unclearSpeech: "من گوهداریا تە کر، لێ بۆ نڤیسینا دڵنیابوو زۆر ڕوون نەبوو. کەمەکێ نزیکتر ب مایکرۆفۆنێ دیسان باخڤە.", micOn: "مایکرۆفۆن دەنگێ تە دگریت", micQuiet: "مایکرۆفۆن ڤەکرییە — باخڤە",
    voiceOutputApproximate: "ڤی ئامێری دەنگەکێ کوردی یێ خۆماڵی نینە، لەورا Atlas نزیکترین دەنگێ بەردەست ب کار دئینیت.", replay: "گوهدار بکە", you: "تو",
    presets: ["ئەڤرۆ چەند قەرەبالغین؟", "ئەڤرۆ ڕیسێپشن بالێ خۆ بدەتە چی؟", "Atlas AI چ دکاریت بکەت؟", "هاریکاریا من بکە پەیامەکا جوان بۆ مەوعیدێ بنڤیسم."],
  },
  ar: {
    eyebrow: "مساعد Atlas", title: "Atlas AI", subtitle: "مساعدة بسيطة لشغل العيادة، الكتابة، التخطيط، الترجمة والأسئلة اليومية.",
    beta: "Beta · للقراءة فقط", privacy: "Atlas يرسل هالمحادثة ويّا إحصائيات مجمعة للمواعيد إلى مزود AI. لا تكتب اسم المريض أو رقم الهاتف أو محتوى الرسائل أو معلومات طبية خاصة بمريض.",
    placeholder: "اكتب لـ Atlas AI…", send: "إرسال", thinking: "يفكر…", examples: "جرّب سؤال", error: "Atlas AI ما قدر يجاوب حالياً.",
    busy: "Atlas AI مشغول حالياً. حاول بعد شوي.", newChat: "محادثة جديدة", dictate: "إملاء صوتي", stopDictation: "إيقاف", dictateHint: "احچي، راجع الكلام المكتوب، وبعدها إنت اضغط إرسال.",
    liveVoice: "محادثة صوتية", liveTitle: "صوت Atlas", liveHint: "احچي بشكل طبيعي. Atlas يسمعك، يجاوب، وبعدين يسمعك مرة ثانية.", listening: "أسمعك", transcribing: "أفهم كلامك…",
    speaking: "Atlas يحچي", paused: "الصوت متوقف", sendNow: "إرسال هسه", interrupt: "قاطعه", tryAgain: "حاول مرة ثانية", endVoice: "إنهاء",
    voiceUnavailable: "الصوت غير متاح حالياً. حاول مرة ثانية.", voicePermission: "Atlas يحتاج إذن المايكروفون حتى يستخدم الصوت.", noSpeech: "ما سمعت كلام كافي. حاول مرة ثانية.",
    unclearSpeech: "سمعتك، بس الكلام مو واضح كفاية حتى أكتبه بثقة. قرب شوي من المايكروفون وحاول مرة ثانية.", micOn: "المايكروفون يسمعك", micQuiet: "المايكروفون شغال — احچي",
    voiceOutputApproximate: "هذا الجهاز ما بي صوت كردي أصلي، لذلك Atlas يستخدم أقرب صوت متاح.", replay: "اسمع", you: "إنت",
    presets: ["شلون زحمة العيادة اليوم؟", "على شنو لازم يركز الاستقبال اليوم؟", "شنو يگدر يسوي Atlas AI؟", "ساعدني أكتب رسالة موعد لطيفة."],
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
    if(/^[-*]\s+/.test(line)) return <div className="atlas-ai-bullet" key={`b-${index}`}><span>•</span><p>{inlineRichText(line.replace(/^[-*]\s+/,""))}</p></div>;
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
    if(captureRef.current||stoppingRef.current||loadingRef.current||speakingRef.current) return;
    setVoiceError(null); setApproximateVoice(false); setMicLevel(0); setMicQuiet(false); setHeardSpeech(false); speechSeenRef.current=false; lastSpeechAtRef.current=performance.now(); lastAudibleAtRef.current=performance.now(); if(purpose==="live") setLiveDisplayText("");
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
    const finish=()=>{ if(speechCycleRef.current!==cycle) return; speakingRef.current=false; setVoiceStage("idle"); if(continueConversation&&liveVoiceRef.current) window.setTimeout(()=>{ if(liveVoiceRef.current) void startCapture("live"); },500); };
    utterance.onend=finish; utterance.onerror=finish; window.speechSynthesis.speak(utterance);
  }

  async function askAtlas(value:string,fromLiveVoice=false){
    const nextQuestion=value.trim(); if(nextQuestion.length<2||loadingRef.current) return null; setLoadingValue(true); setError(null); if(fromLiveVoice) setVoiceStage("thinking");
    const userMessage:ChatMessage={id:makeId(),role:"user",content:nextQuestion}; const requestHistory=[...messagesRef.current,userMessage].slice(-14); messagesRef.current=requestHistory; setMessages(requestHistory); setQuestion("");
    try{
      const response=await fetch("/api/atlas-ai",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({clinicId,locale,interaction:fromLiveVoice?"voice":"text",messages:requestHistory.map(({role,content})=>({role,content}))})});
      const payload=await response.json() as {answer?:string;error?:string;mode?:"model"|"atlas_core"}; if(!response.ok||!payload.answer){ if(payload.error==="rate_limited"||payload.error==="ai_busy") throw new Error("busy"); throw new Error("failed"); }
      const assistantMessage:ChatMessage={id:makeId(),role:"assistant",content:payload.answer,mode:payload.mode}; const nextMessages=[...messagesRef.current,assistantMessage].slice(-14); messagesRef.current=nextMessages; setMessages(nextMessages); setLoadingValue(false); if(fromLiveVoice&&liveVoiceRef.current) await speakAnswer(payload.answer,true); else setVoiceStage("idle"); return payload.answer;
    }catch(caught){ const code=caught instanceof Error?caught.message:"failed"; const message=code==="busy"?t.busy:t.error; setError(message); if(fromLiveVoice) setVoiceError(message); setVoiceStage("idle"); return null; }
    finally{ setLoadingValue(false); }
  }

  function toggleDictation(){ if(dictating){ void stopCapture(false); return; } if(liveVoiceRef.current||loadingRef.current||stoppingRef.current) return; setError(null); setVoiceError(null); void startCapture("dictation"); }
  function startLiveVoice(){ if(loadingRef.current||dictating||liveVoiceRef.current||stoppingRef.current) return; if(!atlasPcmCaptureSupported()){ setVoiceError(t.voiceUnavailable); return; } setError(null); setVoiceError(null); setLiveDisplayText(""); setLiveVoiceValue(true); setVoiceStage("idle"); void startCapture("live"); }
  function endLiveVoice(){ setLiveVoiceValue(false); speechCycleRef.current+=1; if(typeof window!=="undefined"&&"speechSynthesis" in window) window.speechSynthesis.cancel(); speakingRef.current=false; const capture=captureRef.current; const captureStream=captureStreamRef.current; captureRef.current=null; capturePurposeRef.current=null; captureStreamRef.current=null; clearMaxTimer(); if(capture) void capture.discard(); if(captureStream&&captureStream!==liveStreamRef.current) stopTracks(captureStream); stopTracks(liveStreamRef.current); liveStreamRef.current=null; setVoiceStage("idle"); setLiveDisplayText(""); setMicLevel(0); setMicQuiet(false); setHeardSpeech(false); setApproximateVoice(false); setVoiceError(null); }
  function interruptAtlas(){ if(!liveVoiceRef.current) return; speechCycleRef.current+=1; if(typeof window!=="undefined"&&"speechSynthesis" in window) window.speechSynthesis.cancel(); speakingRef.current=false; setVoiceStage("idle"); setVoiceError(null); void startCapture("live"); }
  function retryLiveVoice(){ if(!liveVoiceRef.current||loadingRef.current||captureRef.current||speakingRef.current||stoppingRef.current) return; setVoiceError(null); void startCapture("live"); }
  function newChat(){ endLiveVoice(); if(captureRef.current) void stopCapture(true); setDictating(false); setMessages([]); messagesRef.current=[]; setQuestion(""); setError(null); setVoiceError(null); }
  function submit(event:FormEvent<HTMLFormElement>){ event.preventDefault(); if(dictating||voiceStage==="transcribing") return; void askAtlas(question); }
  function composerKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){ if(event.key==="Enter"&&!event.shiftKey&&!dictating&&voiceStage!=="transcribing"){ event.preventDefault(); void askAtlas(question); } }

  const voiceStatus=voiceStage==="listening"?t.listening:voiceStage==="transcribing"?t.transcribing:voiceStage==="thinking"?t.thinking:voiceStage==="speaking"?t.speaking:t.paused;
  const micStatus=heardSpeech&&!micQuiet?t.micOn:t.micQuiet; const orbScale=.96+Math.min(.08,micLevel*.08); const orbStyle={transform:`scale(${orbScale})`,boxShadow:`0 0 ${45+Math.round(micLevel*75)}px rgba(82,220,168,.25)`} as CSSProperties;

  return <section className="atlas-ai-card" aria-labelledby="atlas-ai-title">
    <div className="atlas-ai-heading"><div><div className="eyebrow">{t.eyebrow}</div><h1 id="atlas-ai-title">{t.title}</h1><p>{t.subtitle}</p></div><div className="atlas-ai-heading-actions"><span className="atlas-ai-beta">{t.beta}</span><button type="button" onClick={newChat}>{t.newChat}</button></div></div>
    <div className="atlas-ai-clinic">{clinicName}</div><p className="atlas-ai-privacy">{t.privacy}</p>
    <div className="atlas-ai-thread" aria-live="polite">
      {messages.length===0?<div className="atlas-ai-empty"><div className="atlas-ai-orb">A</div><strong>{t.title}</strong><span>{t.examples}</span><div className="atlas-ai-presets">{t.presets.map(preset=><button key={preset} type="button" onClick={()=>void askAtlas(preset)} disabled={loading}>{preset}</button>)}</div></div>:messages.map(message=><article key={message.id} className={`atlas-ai-message is-${message.role}`}><div className="atlas-ai-message-role">{message.role==="assistant"?"Atlas AI":t.you}</div>{message.role==="assistant"?<RichMessage text={message.content}/>:<p>{message.content}</p>}{message.role==="assistant"?<button className="atlas-ai-listen-button" type="button" onClick={()=>void speakAnswer(message.content,false)}><SpeakerIcon/> {t.replay}</button>:null}</article>)}
      {loading?<article className="atlas-ai-message is-assistant is-thinking"><div className="atlas-ai-message-role">Atlas AI</div><p><i/><i/><i/> {t.thinking}</p></article>:null}<div ref={messageEndRef}/>
    </div>
    {error?<p className="atlas-ai-error" role="alert">{error}</p>:null}{voiceError&&!liveVoice?<p className="atlas-ai-error" role="alert">{voiceError}</p>:null}
    <div className="atlas-ai-voice-tools"><button className="atlas-ai-live-button" type="button" onClick={startLiveVoice} disabled={loading||dictating}><span className="atlas-ai-live-dot"/> {t.liveVoice}</button><button className={`atlas-ai-dictate-button ${dictating?"is-on":""}`} type="button" onClick={toggleDictation} disabled={loading||liveVoice}>{dictating?<StopIcon/>:<MicIcon/>}{dictating?t.stopDictation:t.dictate}</button><div className="atlas-ai-mic-mini"><span style={{transform:`scaleY(${Math.max(.12,micLevel)})`}}/><span style={{transform:`scaleY(${Math.max(.2,micLevel*.8)})`}}/><span style={{transform:`scaleY(${Math.max(.1,micLevel*.65)})`}}/></div><span className="atlas-ai-dictate-hint">{dictating?micStatus:t.dictateHint}</span></div>
    <form className="atlas-ai-composer" onSubmit={submit}><textarea value={question} onChange={event=>setQuestion(event.target.value)} onKeyDown={composerKeyDown} placeholder={t.placeholder} maxLength={1200} rows={2} aria-label={t.placeholder} disabled={loading||voiceStage==="transcribing"}/><div className="atlas-ai-composer-actions"><button className={`atlas-ai-mic-button ${dictating?"is-on":""}`} type="button" onClick={toggleDictation} aria-label={dictating?t.stopDictation:t.dictate} disabled={loading||liveVoice}>{dictating?<StopIcon/>:<MicIcon/>}</button><button className="atlas-ai-send-button" type="submit" disabled={loading||dictating||voiceStage==="transcribing"||question.trim().length<2} aria-label={t.send}><SendIcon/></button></div></form>
    {liveVoice?<div className="atlas-ai-live-overlay" role="dialog" aria-modal="true" aria-label={t.liveTitle}><div className="atlas-ai-live-topbar"><div><span>ATLAS</span><strong>{t.liveTitle}</strong></div><button type="button" onClick={endLiveVoice}>{t.endVoice}</button></div><div className={`atlas-ai-live-center is-${voiceStage}`}><div className="atlas-ai-live-orb" style={orbStyle}><span>A</span><i/><i/><i/></div><strong className="atlas-ai-live-state">{voiceStatus}</strong>{voiceStage==="listening"?<div className={`atlas-ai-live-mic-state ${micQuiet?"is-quiet":""}`}>{micStatus}</div>:null}{liveDisplayText?<div className="atlas-ai-live-transcript">{stripForSpeech(liveDisplayText).slice(0,500)}</div>:<div className="atlas-ai-live-transcript is-hint">{t.liveHint}</div>}{approximateVoice&&voiceStage==="speaking"?<div className="atlas-ai-live-note">{t.voiceOutputApproximate}</div>:null}{voiceError?<div className="atlas-ai-live-error" role="alert">{voiceError}</div>:null}</div><div className="atlas-ai-live-controls">{voiceStage==="listening"?<button className="is-primary" type="button" onClick={()=>void stopCapture(false)}>{t.sendNow}</button>:null}{voiceStage==="speaking"?<button className="is-primary" type="button" onClick={interruptAtlas}>{t.interrupt}</button>:null}{voiceStage==="idle"?<button className="is-primary" type="button" onClick={retryLiveVoice}>{t.tryAgain}</button>:null}<button type="button" onClick={endLiveVoice}>{t.endVoice}</button></div></div>:null}
    <style>{`
      .atlas-ai-card{border:1px solid var(--line);border-radius:24px;padding:22px;background:var(--surface);box-shadow:var(--shadow-sm);min-height:650px;display:flex;flex-direction:column}.atlas-ai-heading{display:flex;justify-content:space-between;gap:18px}.atlas-ai-heading h1{margin:0;font-size:30px;letter-spacing:-.04em}.atlas-ai-heading p{margin:7px 0 0;color:var(--muted);font-size:13px;line-height:1.5;max-width:650px}.atlas-ai-heading-actions{display:flex;align-items:center;gap:8px}.atlas-ai-heading-actions button,.atlas-ai-beta{border:1px solid var(--line);border-radius:999px;padding:7px 10px;background:transparent;color:var(--ink-soft);font-size:10px;font-weight:800}.atlas-ai-beta{border:0;background:var(--accent-soft);color:var(--accent)}.atlas-ai-clinic{margin-top:16px;font-size:12px;font-weight:820}.atlas-ai-privacy{margin:7px 0 12px;border-radius:12px;padding:9px 11px;background:var(--surface-soft);color:var(--muted);font-size:10px;line-height:1.45}.atlas-ai-thread{flex:1;min-height:330px;max-height:510px;overflow:auto;display:flex;flex-direction:column;gap:12px;padding:12px 3px 16px}.atlas-ai-empty{margin:auto;display:grid;justify-items:center;text-align:center;gap:9px;width:min(100%,620px);padding:24px 10px}.atlas-ai-orb{display:grid;place-items:center;width:54px;height:54px;border-radius:20px;background:linear-gradient(145deg,var(--accent),#0c6b50);color:#fff;font-size:22px;font-weight:900}.atlas-ai-presets{display:flex;flex-wrap:wrap;justify-content:center;gap:7px}.atlas-ai-presets button{border:1px solid var(--line);border-radius:999px;padding:9px 11px;background:var(--surface-soft);font-size:10.5px;font-weight:720}.atlas-ai-message{width:min(84%,650px);border-radius:18px;padding:12px 14px;display:grid;gap:5px}.atlas-ai-message.is-user{align-self:flex-end;background:var(--accent);color:#fff}.atlas-ai-message.is-assistant{align-self:flex-start;background:var(--surface-soft);border:1px solid var(--line)}.atlas-ai-message-role{font-size:9.5px;font-weight:850;opacity:.68;text-transform:uppercase;letter-spacing:.05em}.atlas-ai-message>p,.atlas-ai-rich-text p{margin:0;font-size:13px;line-height:1.6;white-space:pre-wrap}.atlas-ai-rich-text{display:grid;gap:5px}.atlas-ai-rich-text h3{font-size:14px;margin:4px 0 1px}.atlas-ai-bullet{display:grid;grid-template-columns:13px 1fr;gap:4px}.atlas-ai-text-gap{height:4px}.atlas-ai-listen-button{justify-self:start;border:0;background:transparent;color:var(--accent);padding:3px 0;display:flex;align-items:center;gap:5px;font-size:10px;font-weight:800}.atlas-ai-listen-button svg,.atlas-ai-mic-button svg,.atlas-ai-send-button svg,.atlas-ai-dictate-button svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8}.is-thinking p{display:flex;align-items:center;gap:4px;color:var(--muted)}.is-thinking i{width:5px;height:5px;border-radius:50%;background:var(--accent);animation:atlasPulse 1s infinite}.is-thinking i:nth-child(2){animation-delay:.15s}.is-thinking i:nth-child(3){animation-delay:.3s}@keyframes atlasPulse{50%{opacity:.25;transform:translateY(-2px)}}.atlas-ai-error{margin:7px 0;color:var(--danger);font-size:11px}.atlas-ai-voice-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:5px 0 9px}.atlas-ai-live-button,.atlas-ai-dictate-button{border:1px solid var(--line);border-radius:999px;min-height:36px;padding:8px 12px;background:var(--surface-soft);display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:820}.atlas-ai-live-button{background:var(--accent);color:#fff;border-color:var(--accent)}.atlas-ai-dictate-button.is-on{color:var(--accent);border-color:var(--accent)}.atlas-ai-live-dot{width:7px;height:7px;border-radius:50%;background:#b9ffd9;box-shadow:0 0 0 5px rgba(185,255,217,.12)}.atlas-ai-dictate-hint{color:var(--muted);font-size:10px}.atlas-ai-mic-mini{display:flex;align-items:center;gap:2px;height:19px}.atlas-ai-mic-mini span{width:3px;height:16px;border-radius:99px;background:var(--accent);transform-origin:center;transition:transform .08s linear}.atlas-ai-composer{display:flex;align-items:flex-end;gap:9px;border:1px solid #cbd4ce;border-radius:18px;padding:8px;background:#fff}.atlas-ai-composer textarea{flex:1;min-height:52px;max-height:160px;resize:none;border:0;padding:8px 4px;background:transparent;font:inherit;font-size:13px;outline:none}.atlas-ai-composer-actions{display:flex;gap:6px}.atlas-ai-mic-button,.atlas-ai-send-button{width:38px;height:38px;border-radius:50%;display:grid;place-items:center}.atlas-ai-mic-button{border:1px solid var(--line);background:var(--surface-soft)}.atlas-ai-mic-button.is-on{color:var(--accent);border-color:var(--accent)}.atlas-ai-send-button{border:0;background:var(--accent);color:#fff}.atlas-ai-send-button:disabled{opacity:.35}.atlas-ai-live-overlay{position:fixed;inset:0;z-index:1000;background:radial-gradient(circle at 50% 38%,rgba(28,128,92,.23),transparent 34%),linear-gradient(180deg,#071f19,#0b2b22);color:#fff;display:flex;flex-direction:column;padding:max(22px,env(safe-area-inset-top)) max(22px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(22px,env(safe-area-inset-left))}.atlas-ai-live-topbar{display:flex;justify-content:space-between;align-items:center}.atlas-ai-live-topbar>div{display:grid;gap:2px}.atlas-ai-live-topbar span{font-size:9px;letter-spacing:.22em;opacity:.65;font-weight:900}.atlas-ai-live-topbar strong{font-size:16px}.atlas-ai-live-topbar button,.atlas-ai-live-controls button{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#fff;border-radius:999px;padding:10px 15px;font-weight:800}.atlas-ai-live-center{margin:auto;display:grid;justify-items:center;text-align:center;gap:15px;width:min(92vw,650px)}.atlas-ai-live-orb{position:relative;width:160px;height:160px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 25%,#7ff0c2,#188561 45%,#0b3f31 75%);transition:transform .09s linear,box-shadow .09s linear}.atlas-ai-live-orb span{font-size:44px;font-weight:900}.atlas-ai-live-orb i{position:absolute;inset:-11px;border:1px solid rgba(133,255,209,.18);border-radius:50%;animation:atlasRing 2.4s infinite}.atlas-ai-live-orb i:nth-child(2){inset:-24px;animation-delay:.3s}.atlas-ai-live-orb i:nth-child(3){inset:-38px;animation-delay:.6s}@keyframes atlasRing{50%{opacity:.25;transform:scale(1.03)}}.is-speaking .atlas-ai-live-orb{animation:atlasSpeak .85s ease-in-out infinite alternate}@keyframes atlasSpeak{to{transform:scale(1.05)}}.atlas-ai-live-state{font-size:20px}.atlas-ai-live-mic-state{font-size:11px;color:#a8f3d5}.atlas-ai-live-mic-state.is-quiet{color:#ffd99b}.atlas-ai-live-transcript{max-width:600px;font-size:15px;line-height:1.55;color:rgba(255,255,255,.9)}.atlas-ai-live-transcript.is-hint{font-size:12px;color:rgba(255,255,255,.56)}.atlas-ai-live-note{font-size:10px;color:#ffd99b}.atlas-ai-live-error{max-width:520px;padding:10px 13px;border-radius:12px;background:rgba(255,90,90,.13);font-size:11px;color:#ffd0d0}.atlas-ai-live-controls{display:flex;justify-content:center;gap:9px;flex-wrap:wrap}.atlas-ai-live-controls .is-primary{background:#fff;color:#0a2b22;border-color:#fff}@media(max-width:720px){.atlas-ai-card{padding:15px;border-radius:18px;min-height:calc(100dvh - 160px)}.atlas-ai-heading{display:grid}.atlas-ai-heading-actions{justify-content:flex-start}.atlas-ai-thread{max-height:none}.atlas-ai-message{width:92%}.atlas-ai-presets{display:grid;width:100%}.atlas-ai-voice-tools{align-items:flex-start}.atlas-ai-dictate-hint{width:100%}.atlas-ai-live-orb{width:138px;height:138px}}
    `}</style>
  </section>;
}
