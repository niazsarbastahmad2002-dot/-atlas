import Link from "next/link";
import { redirect } from "next/navigation";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { uiText, type UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import { LoginLanguagePicker } from "./language-picker";

type LoginPageProps = { searchParams: Promise<{ error?: string; notice?: string }> };
type LoginPageCopy = { eyebrow: string; title: string; subtitle: string; invalid: string; signedOut: string; storyKicker: string; storyTitle: string; storySubtitle: string; book: string; bookHelp: string; remind: string; remindHelp: string; confirm: string; confirmHelp: string; confirmed: string; next: string; language: string };

const pageCopy: Record<UiLocale, LoginPageCopy> = {
  en: { eyebrow: "Front desk", title: "Open Atlas. Start the clinic day.", subtitle: "Sign in once with the clinic work email. Atlas keeps a trusted device ready for reception.", invalid: "That email link expired or was already used. Request a fresh Atlas email below.", signedOut: "You signed out safely.", storyKicker: "Built for reception", storyTitle: "The clinic day, without the chaos.", storySubtitle: "One fast workspace for appointments, patient confirmations and the queue in front of you.", book: "Book fast", bookHelp: "Patient, doctor, date and time — without hunting through screens.", remind: "Remind automatically", remindHelp: "Atlas prepares WhatsApp reminders at the clinic's chosen times.", confirm: "See who is coming", confirmHelp: "Patients can confirm or cancel from their private appointment page.", confirmed: "Patient confirmed", next: "Next appointment", language: "Choose your language" },
  ku: { eyebrow: "پێشخانە", title: "Atlas بکەرەوە. ڕۆژی کلینیک دەستپێبکە.", subtitle: "جارێک بە ئیمەیڵی کاری کلینیک بچۆ ژوورەوە. Atlas ئامێری متمانەپێکراو بۆ پێشخانە ئامادە دەهێڵێتەوە.", invalid: "ئەم بەستەرە بەسەرچووە یان پێشتر بەکارهاتووە. ئیمەیڵێکی نوێی Atlas داوا بکە.", signedOut: "بە سەلامەتی چوویتە دەرەوە.", storyKicker: "بۆ پێشخانە دروست کراوە", storyTitle: "ڕۆژی کلینیک، بەبێ ئاڵۆزی.", storySubtitle: "یەک شوێنی خێرا بۆ وادەکان، پشتڕاستکردنەوەی نەخۆش و ئەوەی ئێستا لە پێشخانە پێویستە.", book: "وادە بە خێرایی", bookHelp: "نەخۆش، پزیشک، ڕێکەوت و کات — بەبێ گەڕان بە پەڕەکاندا.", remind: "بیرخستنەوەی خۆکار", remindHelp: "Atlas بیرخستنەوەی WhatsApp لە کاتی هەڵبژێردراوی کلینیک ئامادە دەکات.", confirm: "بزانە کێ دێت", confirmHelp: "نەخۆش لە پەڕەی تایبەتی وادەکەی دەتوانێت پشتڕاست یان هەڵوەشێنێتەوە.", confirmed: "نەخۆش پشتڕاستی کردەوە", next: "وادەی داهاتوو", language: "زمانەکەت هەڵبژێرە" },
  ar: { eyebrow: "الاستقبال", title: "افتح Atlas وابدأ يوم العيادة.", subtitle: "سجّل دخول مرة وحدة بإيميل العيادة. Atlas يبقي الجهاز الموثوق جاهز للاستقبال.", invalid: "رابط الدخول انتهت صلاحيته أو انستخدم قبل. اطلب إيميل Atlas جديد من جوه.", signedOut: "تم تسجيل الخروج بأمان.", storyKicker: "مصمم للاستقبال", storyTitle: "يوم العيادة، بدون لخبطة.", storySubtitle: "مكان واحد سريع للمواعيد، تأكيدات المرضى، والشغل اللي قدام موظف الاستقبال هسه.", book: "احجز بسرعة", bookHelp: "المريض، الطبيب، التاريخ والوقت — بدون لف بين الشاشات.", remind: "ذكّر تلقائياً", remindHelp: "Atlas يجهز تذكيرات WhatsApp بأوقات العيادة المختارة.", confirm: "اعرف منو جاي", confirmHelp: "المريض يگدر يأكد أو يلغي من صفحة موعده الخاصة.", confirmed: "المريض أكد", next: "الموعد الجاي", language: "اختار لغتك" },
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, notice } = await searchParams;
  if (process.env.ATLAS_E2E_NO_AUTH !== "true") { const supabase = await createClient(); const { data } = await supabase.auth.getUser(); if (data.user) redirect("/dashboard"); }
  const locale = await getUiLocale();
  const t = uiText(locale);
  const copy = pageCopy[locale];
  const errorMessage = error === "invalid_link" ? copy.invalid : null;
  const noticeMessage = notice === "signed_out" ? copy.signedOut : null;

  return <main className="login-page">
    <section className="login-card">
      <Link className="app-brand login-brand" href="/"><span className="app-brand-mark" aria-hidden="true">A</span><span className="app-brand-word">Atlas</span></Link>
      <div className="login-language-block"><span>{copy.language}</span><LoginLanguagePicker locale={locale} /></div>
      <div className="login-copy"><div className="eyebrow">{copy.eyebrow}</div><h1>{copy.title}</h1><p>{copy.subtitle}</p></div>
      {errorMessage ? <p className="notice notice-error login-notice" role="alert">{errorMessage}</p> : null}{noticeMessage ? <p className="notice notice-success login-notice" role="status">{noticeMessage}</p> : null}
      <LoginForm locale={locale} />
      <div className="auth-alternative login-demo"><span>{t.demoPrompt}</span><Link className="button button-ghost" href="/demo">{t.openDemo}</Link><p className="quiet">{t.demoHelp}</p></div>
    </section>
    <aside className="login-visual"><div className="login-story"><div className="login-story-brand"><span className="login-story-logo" aria-hidden="true" /><span>{copy.storyKicker}</span></div><h2>{copy.storyTitle}</h2><p>{copy.storySubtitle}</p><div className="login-story-steps"><article><span className="login-story-number">01</span><div><strong>{copy.book}</strong><small>{copy.bookHelp}</small></div></article><article><span className="login-story-number">02</span><div><strong>{copy.remind}</strong><small>{copy.remindHelp}</small></div></article><article><span className="login-story-number">03</span><div><strong>{copy.confirm}</strong><small>{copy.confirmHelp}</small></div></article></div><div className="login-mini-schedule" aria-label={t.schedule}><div className="login-mini-heading"><span>Atlas</span><strong>{t.schedule}</strong></div><div className="login-visual-card"><span className="login-visual-dot" /><div><strong>08:30</strong><span>{copy.confirmed}</span></div></div><div className="login-visual-card is-secondary"><span className="login-visual-dot" /><div><strong>09:00</strong><span>{copy.next}</span></div></div></div></div></aside>
  </main>;
}
