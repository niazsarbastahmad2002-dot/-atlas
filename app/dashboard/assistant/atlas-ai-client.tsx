"use client";

import { type FormEvent, useState } from "react";
import type { UiLocale } from "@/lib/i18n/ui";

type AtlasAiClientProps = {
  clinicId: string;
  clinicName: string;
  locale: UiLocale;
};

type Copy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  beta: string;
  privacy: string;
  placeholder: string;
  ask: string;
  asking: string;
  examples: string;
  answer: string;
  error: string;
  unavailable: string;
  budget: string;
  busy: string;
  presets: string[];
};

const copy: Record<UiLocale, Copy> = {
  en: {
    eyebrow: "Optional assistant",
    title: "Atlas AI",
    subtitle: "Ask simple questions about how the clinic is running.",
    beta: "Beta · read-only",
    privacy: "Atlas AI receives aggregated appointment statistics only — no patient names, phone numbers, messages, or clinical information.",
    placeholder: "Example: Which day looks busiest next week?",
    ask: "Ask Atlas",
    asking: "Thinking…",
    examples: "Try asking",
    answer: "Atlas AI",
    error: "Atlas AI could not answer that right now.",
    unavailable: "Atlas AI is not available in this environment yet.",
    budget: "Atlas AI's current test budget has been used.",
    busy: "Atlas AI is busy. Try again shortly.",
    presets: [
      "How busy are we today?",
      "What should reception pay attention to today?",
      "How many no-shows did we have in the last 7 days?",
      "Which day looks busiest in the next 7 days?",
    ],
  },
  ku: {
    eyebrow: "یاریدەدەری ئارەزوومەندانە",
    title: "Atlas AI",
    subtitle: "پرسیاری سادە لەسەر چۆنیەتی بەڕێوەچوونی کلینیک بکە.",
    beta: "Beta · تەنها خوێندنەوە",
    privacy: "Atlas AI تەنها ئاماری کۆکراوەی وادەکان دەبینێت؛ ناوی نەخۆش، ژمارەی مۆبایل، نامە یان زانیاری پزیشکی نانێردرێت.",
    placeholder: "نموونە: کام ڕۆژ لە هەفتەی داهاتوو قەرەباڵغترە؟",
    ask: "لە Atlas بپرسە",
    asking: "بیر دەکاتەوە…",
    examples: "ئەم پرسیارانە تاقی بکەوە",
    answer: "Atlas AI",
    error: "Atlas AI ئێستا نەیتوانی وەڵام بداتەوە.",
    unavailable: "Atlas AI هێشتا لەم ژینگەیە بەردەست نییە.",
    budget: "بودجەی تاقیکردنەوەی Atlas AI بۆ ئێستا تەواو بووە.",
    busy: "Atlas AI ئێستا سەرقاڵە. کەمێکی تر هەوڵ بدەرەوە.",
    presets: [
      "ئەمڕۆ چەند قەرەباڵغین؟",
      "ئەمڕۆ ڕیسێپشن سەرنجی لە چی بێت؟",
      "لە ٧ ڕۆژی ڕابردوودا چەند no-show هەبوو؟",
      "لە ٧ ڕۆژی داهاتوودا کام ڕۆژ قەرەباڵغترە؟",
    ],
  },
  bd: {
    eyebrow: "هاریکارێ ئارەزوومەندانە",
    title: "Atlas AI",
    subtitle: "پسیارێن سادە ل سەر چەوانیا کارێ کلینیکێ بکە.",
    beta: "Beta · تەنێ خواندن",
    privacy: "Atlas AI تەنێ ئامارێن کۆمکری یێن وادەیان دبینیت؛ ناڤێ نەخۆشی، ژمارا موبایلێ، پەیام یان زانیاریێن پزیشکی ناهێن ناردن.",
    placeholder: "نموونە: ل حەفتەیا بهێت کام ڕۆژ قەرەبالغترە؟",
    ask: "ژ Atlas بپرسە",
    asking: "هزر دکەت…",
    examples: "ڤان پسیاران تاقی بکە",
    answer: "Atlas AI",
    error: "Atlas AI نها نەشیا بەرسڤ بدەت.",
    unavailable: "Atlas AI هێشتا ل ڤێ ژینگەهێ بەردەست نینە.",
    budget: "بودجەیا تاقیکرنێ یا Atlas AI بۆ نها تەواو بوویە.",
    busy: "Atlas AI نها مژوولە. پشتی کەمەکێ دووبارە هەول بدە.",
    presets: [
      "ئەڤرۆ چەند قەرەبالغین؟",
      "ئەڤرۆ ڕیسێپشن بالێ خۆ بدەتە چی؟",
      "د ٧ ڕۆژێن بوری دا چەند no-show هەبوون؟",
      "د ٧ ڕۆژێن بهێت دا کام ڕۆژ قەرەبالغترە؟",
    ],
  },
  ar: {
    eyebrow: "مساعد اختياري",
    title: "Atlas AI",
    subtitle: "اسأل أسئلة بسيطة عن شغل العيادة.",
    beta: "Beta · للقراءة فقط",
    privacy: "Atlas AI يستلم إحصائيات مجمعة للمواعيد فقط؛ لا تُرسل أسماء المرضى أو أرقام الهواتف أو الرسائل أو المعلومات الطبية.",
    placeholder: "مثال: أي يوم يبدو الأكثر ازدحاماً الأسبوع القادم؟",
    ask: "اسأل Atlas",
    asking: "يفكر…",
    examples: "جرّب سؤال",
    answer: "Atlas AI",
    error: "Atlas AI ما قدر يجاوب حالياً.",
    unavailable: "Atlas AI غير متاح في هذه البيئة بعد.",
    budget: "ميزانية تجربة Atlas AI الحالية انتهت مؤقتاً.",
    busy: "Atlas AI مشغول حالياً. حاول بعد قليل.",
    presets: [
      "شلون زحمة العيادة اليوم؟",
      "على شنو لازم يركز الاستقبال اليوم؟",
      "كم حالة عدم حضور صارت خلال آخر 7 أيام؟",
      "أي يوم يبدو الأكثر ازدحاماً خلال الـ7 أيام القادمة؟",
    ],
  },
};

export function AtlasAiClient({ clinicId, clinicName, locale }: AtlasAiClientProps) {
  const t = copy[locale];
  const [question, setQuestion] = useState("");
  const [askedQuestion, setAskedQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function askAtlas(value: string) {
    const nextQuestion = value.trim();
    if (nextQuestion.length < 2 || loading) return;

    setLoading(true);
    setError(null);
    setAnswer(null);
    setAskedQuestion(nextQuestion);

    try {
      const response = await fetch("/api/atlas-ai", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, question: nextQuestion }),
      });
      const payload = await response.json() as { answer?: string; error?: string };
      if (!response.ok || !payload.answer) {
        if (payload.error === "ai_not_configured") throw new Error("unavailable");
        if (payload.error === "ai_budget") throw new Error("budget");
        if (payload.error === "rate_limited" || payload.error === "ai_busy") throw new Error("busy");
        throw new Error("failed");
      }
      setAnswer(payload.answer);
      setQuestion("");
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "failed";
      setError(code === "unavailable" ? t.unavailable : code === "budget" ? t.budget : code === "busy" ? t.busy : t.error);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askAtlas(question);
  }

  return (
    <section className="atlas-ai-card" aria-labelledby="atlas-ai-title">
      <div className="atlas-ai-heading">
        <div>
          <div className="eyebrow">{t.eyebrow}</div>
          <h1 id="atlas-ai-title">{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <span className="atlas-ai-beta">{t.beta}</span>
      </div>

      <div className="atlas-ai-clinic">{clinicName}</div>
      <p className="atlas-ai-privacy">{t.privacy}</p>

      <form className="atlas-ai-form" onSubmit={submit}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t.placeholder}
          maxLength={600}
          rows={3}
          aria-label={t.placeholder}
          disabled={loading}
        />
        <button className="button" type="submit" disabled={loading || question.trim().length < 2}>
          {loading ? t.asking : t.ask}
        </button>
      </form>

      <div className="atlas-ai-examples">
        <strong>{t.examples}</strong>
        <div className="atlas-ai-presets">
          {t.presets.map((preset) => (
            <button key={preset} type="button" onClick={() => void askAtlas(preset)} disabled={loading}>
              {preset}
            </button>
          ))}
        </div>
      </div>

      {askedQuestion && (answer || error || loading) ? (
        <div className="atlas-ai-response" aria-live="polite">
          <small>{askedQuestion}</small>
          <strong>{t.answer}</strong>
          {loading ? <p className="quiet">{t.asking}</p> : null}
          {answer ? <p>{answer}</p> : null}
          {error ? <p className="atlas-ai-error" role="alert">{error}</p> : null}
        </div>
      ) : null}

      <style>{`
        .atlas-ai-card{border:1px solid var(--line);border-radius:22px;padding:24px;background:var(--surface);box-shadow:var(--shadow-sm)}
        .atlas-ai-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.atlas-ai-heading h1{margin:0;font-size:30px;letter-spacing:-.04em}.atlas-ai-heading p{margin:7px 0 0;color:var(--muted);font-size:13px;line-height:1.5}.atlas-ai-beta{flex:0 0 auto;border-radius:999px;padding:7px 10px;background:var(--accent-soft);color:var(--accent);font-size:10px;font-weight:820}.atlas-ai-clinic{margin-top:20px;color:var(--ink-soft);font-size:12px;font-weight:820}.atlas-ai-privacy{margin:8px 0 18px;border-radius:12px;padding:11px 12px;background:var(--surface-soft);color:var(--muted);font-size:10.5px;line-height:1.5}.atlas-ai-form{display:grid;gap:10px}.atlas-ai-form textarea{width:100%;resize:vertical;min-height:94px;border:1px solid #cbd4ce;border-radius:14px;padding:13px;color:var(--ink);background:#fff;font:inherit;line-height:1.45;outline:none}.atlas-ai-form textarea:focus{border-color:var(--accent);box-shadow:0 0 0 4px rgba(31,90,67,.10)}.atlas-ai-form .button{justify-self:end;min-width:120px}.atlas-ai-examples{margin-top:20px}.atlas-ai-examples>strong{display:block;margin-bottom:8px;color:var(--muted);font-size:10px;font-weight:850;text-transform:uppercase;letter-spacing:.06em}.atlas-ai-presets{display:flex;flex-wrap:wrap;gap:7px}.atlas-ai-presets button{border:1px solid var(--line);border-radius:999px;padding:8px 10px;background:var(--surface-soft);color:var(--ink-soft);font-size:10.5px;font-weight:720;cursor:pointer}.atlas-ai-presets button:hover{border-color:var(--line-strong);background:var(--accent-faint)}.atlas-ai-response{display:grid;gap:7px;margin-top:22px;border-top:1px solid var(--line);padding-top:18px}.atlas-ai-response>small{color:var(--muted);font-size:10.5px}.atlas-ai-response>strong{color:var(--accent);font-size:11px}.atlas-ai-response>p{margin:0;color:var(--ink-soft);font-size:13px;line-height:1.6;white-space:pre-wrap}.atlas-ai-response>.atlas-ai-error{color:var(--danger)}@media(max-width:720px){.atlas-ai-card{padding:18px;border-radius:18px}.atlas-ai-heading{display:grid}.atlas-ai-beta{justify-self:start}.atlas-ai-form .button{width:100%;justify-self:stretch}.atlas-ai-presets{display:grid}.atlas-ai-presets button{text-align:start}}
      `}</style>
    </section>
  );
}
