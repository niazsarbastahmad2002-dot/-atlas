import Link from "next/link";
import { redirect } from "next/navigation";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { uiText, type UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; notice?: string }>;
};

type LoginPageCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  invalid: string;
  signedOut: string;
  storyKicker: string;
  storyTitle: string;
  storySubtitle: string;
  book: string;
  bookHelp: string;
  remind: string;
  remindHelp: string;
  confirm: string;
  confirmHelp: string;
  confirmed: string;
  next: string;
};

const pageCopy: Record<UiLocale, LoginPageCopy> = {
  en: {
    eyebrow: "Reception",
    title: "Open Atlas. Start the day.",
    subtitle: "Use the clinic work email once. After that, Atlas normally keeps this trusted device signed in.",
    invalid: "That email link has expired or was already used. Request one fresh Atlas email below.",
    signedOut: "You signed out safely.",
    storyKicker: "Built for the front desk",
    storyTitle: "One calm place for the clinic day.",
    storySubtitle: "Book the appointment, remind the patient, and see what needs attention without chasing paper or chat messages.",
    book: "Book in seconds",
    bookHelp: "Patient, doctor, date, time. Done.",
    remind: "Reminders run quietly",
    remindHelp: "Atlas prepares the right reminder times automatically.",
    confirm: "Know who is coming",
    confirmHelp: "Patients can confirm or cancel their own appointment link.",
    confirmed: "Patient confirmed",
    next: "Next appointment",
  },
  ku: {
    eyebrow: "پێشخانە",
    title: "Atlas بکەرەوە. کار دەستپێبکە.",
    subtitle: "جارێک بە ئیمەیڵی کاری کلینیک بچۆ ژوورەوە. پاشان Atlas بە ئاسایی ئەم ئامێرە متمانەپێکراوە بە چوونەژوورەوە دەهێڵێتەوە.",
    invalid: "ئەم بەستەری ئیمەیڵە بەسەرچووە یان پێشتر بەکارهاتووە. لە خوارەوە ئیمەیڵێکی نوێی Atlas داوا بکە.",
    signedOut: "بە سەلامەتی چوویتە دەرەوە.",
    storyKicker: "بۆ پێشخانە دروست کراوە",
    storyTitle: "یەک شوێنی ئارام بۆ ڕۆژی کلینیک.",
    storySubtitle: "وادە دابنێ، نەخۆش بیر بخەرەوە، و بزانە چی پێویستی بە سەرنج هەیە؛ بەبێ گەڕان بەدوای کاغەز و چاتدا.",
    book: "وادە لە چەند چرکەیەکدا",
    bookHelp: "نەخۆش، پزیشک، ڕێکەوت، کات. تەواو.",
    remind: "بیرخستنەوە بە ئارامی کار دەکات",
    remindHelp: "Atlas کاتی گونجاوی بیرخستنەوە ئامادە دەکات.",
    confirm: "بزانە کێ دێت",
    confirmHelp: "نەخۆش دەتوانێت لە بەستەری خۆی وادەکە پشتڕاست یان هەڵوەشێنێتەوە.",
    confirmed: "نەخۆش پشتڕاستی کردەوە",
    next: "وادەی داهاتوو",
  },
  ar: {
    eyebrow: "الاستقبال",
    title: "افتح Atlas وابدأ يومك.",
    subtitle: "سجّل الدخول ببريد العيادة مرة واحدة. بعد ذلك يبقي Atlas هذا الجهاز الموثوق مسجلاً عادةً.",
    invalid: "انتهت صلاحية رابط البريد أو تم استخدامه من قبل. اطلب رسالة Atlas جديدة أدناه.",
    signedOut: "تم تسجيل الخروج بأمان.",
    storyKicker: "مصمم للاستقبال",
    storyTitle: "مكان واحد هادئ ليوم العيادة.",
    storySubtitle: "احجز الموعد، ذكّر المريض، واعرف ما يحتاج إلى انتباه دون مطاردة الأوراق أو رسائل الدردشة.",
    book: "احجز خلال ثوانٍ",
    bookHelp: "المريض، الطبيب، التاريخ، الوقت. انتهى.",
    remind: "التذكيرات تعمل بهدوء",
    remindHelp: "يجهّز Atlas أوقات التذكير المناسبة تلقائياً.",
    confirm: "اعرف من سيحضر",
    confirmHelp: "يمكن للمريض تأكيد أو إلغاء موعده من رابطه الخاص.",
    confirmed: "تم تأكيد المريض",
    next: "الموعد التالي",
  },
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, notice } = await searchParams;

  if (process.env.ATLAS_E2E_NO_AUTH !== "true") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/dashboard");
  }

  const locale = await getUiLocale();
  const t = uiText(locale);
  const copy = pageCopy[locale];
  const errorMessage = error === "invalid_link" ? copy.invalid : null;
  const noticeMessage = notice === "signed_out" ? copy.signedOut : null;

  return (
    <main className="login-page">
      <section className="login-card">
        <Link className="app-brand login-brand" href="/">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </Link>

        <div className="login-copy">
          <div className="eyebrow">{copy.eyebrow}</div>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>

        {errorMessage ? <p className="notice notice-error login-notice" role="alert">{errorMessage}</p> : null}
        {noticeMessage ? <p className="notice notice-success login-notice" role="status">{noticeMessage}</p> : null}

        <LoginForm locale={locale} />

        <div className="auth-alternative login-demo">
          <span>{t.demoPrompt}</span>
          <Link className="button button-ghost" href="/demo">{t.openDemo}</Link>
          <p className="quiet">{t.demoHelp}</p>
        </div>
      </section>

      <aside className="login-visual">
        <div className="login-story">
          <div className="login-story-brand">
            <span className="login-story-logo" aria-hidden="true" />
            <span>{copy.storyKicker}</span>
          </div>
          <h2>{copy.storyTitle}</h2>
          <p>{copy.storySubtitle}</p>

          <div className="login-story-steps">
            <article>
              <span className="login-story-number">01</span>
              <div><strong>{copy.book}</strong><small>{copy.bookHelp}</small></div>
            </article>
            <article>
              <span className="login-story-number">02</span>
              <div><strong>{copy.remind}</strong><small>{copy.remindHelp}</small></div>
            </article>
            <article>
              <span className="login-story-number">03</span>
              <div><strong>{copy.confirm}</strong><small>{copy.confirmHelp}</small></div>
            </article>
          </div>

          <div className="login-mini-schedule" aria-label={t.schedule}>
            <div className="login-mini-heading"><span>Atlas</span><strong>{t.schedule}</strong></div>
            <div className="login-visual-card">
              <span className="login-visual-dot" />
              <div><strong>08:30</strong><span>{copy.confirmed}</span></div>
            </div>
            <div className="login-visual-card is-secondary">
              <span className="login-visual-dot" />
              <div><strong>09:00</strong><span>{copy.next}</span></div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
