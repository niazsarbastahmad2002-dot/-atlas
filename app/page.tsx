import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginLanguagePicker } from "@/app/login/language-picker";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { atlasPublicCompanyProfile } from "@/lib/public-company-profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type HomeCopy = {
  languageLabel: string;
  eyebrow: string;
  title: string;
  hero: string;
  onlineDescription: string;
  localDescription: string;
  modeNote: string;
  demo: string;
  scope: string;
  essentials: ReadonlyArray<{ title: string; text: string }>;
  support: string;
  privacy: string;
  terms: string;
};

const homeCopy: Record<UiLocale, HomeCopy> = {
  en: {
    languageLabel: "Choose your language",
    eyebrow: "Clinic appointments",
    title: "Your clinic day, in one place.",
    hero: "Schedule patients, keep the queue clear, and handle confirmations without turning reception into a complicated system.",
    onlineDescription: "Cloud, staff, WhatsApp & AI",
    localDescription: "Works on this device without internet",
    modeNote: "Choose the version that fits the clinic. Online and Local stay separate so offline appointments never silently overwrite cloud data.",
    demo: "Try a sample clinic",
    scope: "Scheduling and patient communication only — keep medical notes in the clinic's approved record system.",
    essentials: [
      { title: "Schedule", text: "See the clinic day and add the next patient fast." },
      { title: "Follow-up", text: "Confirm, cancel, complete, or mark no-show without leaving the schedule." },
      { title: "Communication", text: "Private patient links now; WhatsApp automation when provider approval is ready." },
    ],
    support: "Support",
    privacy: "Privacy",
    terms: "Terms",
  },
  ku: {
    languageLabel: "زمانەکەت هەڵبژێرە",
    eyebrow: "مەوعیدەکانی کلینیک",
    title: "ڕۆژی کلینیکەکەت، هەمووی لە یەک شوێن.",
    hero: "مەوعیدەکان ڕێکبخە، ڕیزی نەخۆشەکان ڕوون بپارێزە و پشتڕاستکردنەوەکان بەبێ ئاڵۆزکردنی کاری سکرتێر بەڕێوەببە.",
    onlineDescription: "کلاود، ستاف، WhatsApp و AI",
    localDescription: "لەسەر ئەم ئامێرە بەبێ ئینتەرنێت کار دەکات",
    modeNote: "ئەو وەشانە هەڵبژێرە کە بۆ کلینیکەکەت گونجاوە. Atlas Online و Atlas Local جیاوازن تا داتای ئۆفلاین بە نهێنی داتای کلاود نەنوسێتەوە.",
    demo: "کلینیکی نموونە تاقی بکەرەوە",
    scope: "تەنها بۆ ڕێکخستنی مەوعید و پەیوەندی بە نەخۆش — تێبینییە پزیشکییەکان لە سیستەمی پەسەندکراوی کلینیکەکەت بپارێزە.",
    essentials: [
      { title: "خشتە", text: "ڕۆژی کلینیک ببینە و نەخۆشی داهاتوو بەخێرایی زیاد بکە." },
      { title: "بەدواداچوون", text: "پشتڕاستکردنەوە، هەڵوەشاندنەوە، تەواوکردن یان نەهاتن لە هەمان خشتەدا تۆمار بکە." },
      { title: "پەیوەندی", text: "لینکی تایبەتی نەخۆش ئێستا؛ ئۆتۆماتیکی WhatsApp کاتێک پەسەندکردنی پێشکەشکار ئامادە بێت." },
    ],
    support: "یارمەتی",
    privacy: "تایبەتمەندی",
    terms: "مەرجەکان",
  },
  bd: {
    languageLabel: "زمانێ خۆ هەلبژێرە",
    eyebrow: "مەوعیدێن کلینیکێ",
    title: "ڕۆژا کلینیکا تە، هەمی ل جهەکێ.",
    hero: "مەوعیدان ڕێک بخە، ڕێزا نەخۆشان ڕوون بپارێزە و پشتڕاستکرنان بێ ئاڵۆزکرنا کارێ سکرتێری بەڕێڤە ببە.",
    onlineDescription: "کلاود، ستاف، WhatsApp و AI",
    localDescription: "ل سەر ڤی ئامێری بێ ئینتەرنێت کار دکەت",
    modeNote: "وەشانێ گونجای کلینیکا خۆ هەلبژێرە. Atlas Online و Atlas Local ژێک جودان دا مەوعیدێن ئۆفلاین ب نهێنی داتای کلاود نەگۆڕن.",
    demo: "کلینیکەکا نموونە تاقی بکە",
    scope: "تەنێ بۆ ڕێکخستنا مەوعیدان و پەیوەندیا نەخۆشان — تێبینیێن پزیشکی ل سیستەمێ پەسەندکری یێ کلینیکێ بپارێزە.",
    essentials: [
      { title: "خشتە", text: "ڕۆژا کلینیکێ ببینە و نەخۆشێ داهاتی ب لەز زیاد بکە." },
      { title: "بەدواداچوون", text: "پشتڕاستکرن، هەلوەشاندن، تەمامکرن یان نەهاتن ژ هەمان خشتەیێ تۆمار بکە." },
      { title: "پەیوەندی", text: "لینکێ تایبەت یێ نەخۆشی نوکە؛ ئۆتۆماتیکا WhatsApp دەمێ پەسەندکرنا پێشکەشکاری ئامادە بیت." },
    ],
    support: "یارمەتی",
    privacy: "تایبەتمەندی",
    terms: "مەرج",
  },
  ar: {
    languageLabel: "اختار لغتك",
    eyebrow: "مواعيد العيادة",
    title: "يوم عيادتك كله بمكان واحد.",
    hero: "رتّب المواعيد، خلّ قائمة المرضى واضحة، وتعامل مع التأكيدات بدون ما يتحول الاستقبال إلى نظام معقد.",
    onlineDescription: "السحابة، الموظفون، WhatsApp والذكاء الاصطناعي",
    localDescription: "يعمل على هذا الجهاز بدون إنترنت",
    modeNote: "اختار النسخة المناسبة للعيادة. Atlas Online وAtlas Local يبقون منفصلين حتى المواعيد المحلية ما تستبدل بيانات السحابة بصمت.",
    demo: "جرّب عيادة نموذجية",
    scope: "للمواعيد والتواصل مع المرضى فقط — احتفظ بالملاحظات الطبية داخل نظام السجل المعتمد في العيادة.",
    essentials: [
      { title: "الجدول", text: "شوف يوم العيادة وأضف المريض التالي بسرعة." },
      { title: "المتابعة", text: "أكد أو ألغِ أو أكمل الموعد أو سجّل عدم الحضور بدون ما تترك الجدول." },
      { title: "التواصل", text: "روابط خاصة للمرضى الآن؛ وأتمتة WhatsApp عندما تكتمل موافقة المزوّد." },
    ],
    support: "الدعم",
    privacy: "الخصوصية",
    terms: "الشروط",
  },
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");

  const locale = await getUiLocale();
  const copy = homeCopy[locale];
  const company = atlasPublicCompanyProfile();

  return (
    <main className="marketing-page atlas-simple-home">
      <nav className="nav shell marketing-nav">
        <Link className="app-brand atlas-marketing-brand" href="/" aria-label="Atlas home">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </Link>
      </nav>

      <section className="hero shell atlas-simple-hero">
        <div className="atlas-home-language">
          <div className="eyebrow">{copy.languageLabel}</div>
          <LoginLanguagePicker locale={locale} source="home" />
        </div>

        <div className="eyebrow">{copy.eyebrow}</div>
        <h1>{copy.title}</h1>
        <p className="hero-copy">{copy.hero}</p>
        <div className="hero-actions atlas-home-actions" aria-label="Choose Atlas mode">
          <Link className="button atlas-mode-button" href="/dashboard">
            <strong>Atlas Online</strong>
            <span>{copy.onlineDescription}</span>
          </Link>
          <a className="button button-ghost atlas-mode-button atlas-local-mode" href="/atlas-local.html">
            <strong>Atlas Local</strong>
            <span>{copy.localDescription}</span>
          </a>
        </div>
        <p className="quiet atlas-mode-note">{copy.modeNote}</p>
        <Link className="button button-ghost atlas-demo-link" href="/demo">{copy.demo}</Link>
        <p className="quiet atlas-scope-note">{copy.scope}</p>
      </section>

      <section className="shell atlas-simple-essentials" aria-label={copy.eyebrow}>
        {copy.essentials.map((item) => (
          <div key={item.title}><strong>{item.title}</strong><span>{item.text}</span></div>
        ))}
      </section>

      <footer className="shell atlas-simple-footer">
        <Link href="/support">{copy.support}</Link>
        <Link href="/privacy">{copy.privacy}</Link>
        <Link href="/terms">{copy.terms}</Link>
        {company.isVerifiedCompanyProfile && company.legalEntityName ? <span className="quiet">{company.legalEntityName}</span> : null}
      </footer>

      <style>{`
        .atlas-simple-home{min-height:100dvh}.atlas-marketing-brand .app-brand-word{color:var(--ink);opacity:1}.atlas-simple-hero{max-width:850px;padding-top:clamp(54px,9vh,96px);padding-bottom:42px}.atlas-home-language{max-width:650px;margin-bottom:34px}.atlas-home-language>.eyebrow{margin-bottom:10px}.atlas-home-language .login-language-picker{max-width:650px}.atlas-simple-hero h1{max-width:720px}.atlas-simple-hero .hero-copy{max-width:650px}.atlas-home-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-width:650px}.atlas-mode-button{min-height:74px;display:grid;align-content:center;justify-items:start;gap:4px;text-align:start;text-decoration:none}.atlas-mode-button strong{font-size:14px}.atlas-mode-button span{font-size:10.5px;font-weight:650;opacity:.82}.atlas-local-mode{color:var(--accent);background:rgba(255,255,255,.8);border-color:rgba(8,119,90,.2)}.atlas-local-mode:hover{background:#fff;border-color:rgba(8,119,90,.35)}.atlas-mode-note{max-width:650px;margin-top:12px;font-size:11.5px}.atlas-demo-link{display:inline-flex;margin-top:9px;min-height:40px;align-items:center;justify-content:center;color:var(--accent);font-size:12px;font-weight:800;text-decoration:none}.atlas-scope-note{max-width:620px;margin-top:18px}.atlas-simple-essentials{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;overflow:hidden;border:1px solid var(--line);border-radius:18px;background:var(--line)}.atlas-simple-essentials>div{display:grid;gap:6px;padding:18px;background:#fff}.atlas-simple-essentials strong{font-size:13px}.atlas-simple-essentials span{color:var(--muted);font-size:12px;line-height:1.55}.atlas-simple-footer{display:flex;gap:16px;flex-wrap:wrap;padding-top:26px;padding-bottom:48px;color:var(--muted);font-size:12px}.atlas-simple-footer a{color:inherit}@media(max-width:680px){.atlas-simple-essentials{grid-template-columns:1fr}.atlas-simple-hero{padding-top:38px}.atlas-home-actions{grid-template-columns:1fr}}
      `}</style>
    </main>
  );
}
