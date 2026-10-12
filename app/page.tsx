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
  patientTitle: string;
  patientDescription: string;
  professionalTitle: string;
  professionalDescription: string;
  localTitle: string;
  localDescription: string;
  modeNote: string;
  demo: string;
  patientAccount: string;
  scope: string;
  essentials: ReadonlyArray<{ title: string; text: string }>;
  support: string;
  privacy: string;
  terms: string;
};

const homeCopy: Record<UiLocale, HomeCopy> = {
  en: {
    languageLabel: "Choose your language",
    eyebrow: "Connected care",
    title: "Your care. Your clinic. One Atlas.",
    hero: "Choose where to begin.",
    patientTitle: "Find care",
    patientDescription: "Search doctors, clinics, specialties, locations, and real open times.",
    professionalTitle: "Run a clinic or center",
    professionalDescription: "Open Atlas Online for reception, appointments, staff, and clinic operations.",
    localTitle: "Atlas Local",
    localDescription: "Use this device without internet.",
    modeNote: "Patient discovery is public. Clinic work stays private. Atlas Local remains separate from cloud data.",
    demo: "Try a sample clinic",
    patientAccount: "My appointments",
    scope: "Scheduling and patient communication only — keep medical notes in the clinic's approved record system.", // keep medical notes in the clinic&apos;s approved record system
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
    eyebrow: "پەیوەندییەکانی تەندروستی",
    title: "چارەسەر و کلینیک، هەمووی لە Atlas.",
    hero: "شوێنی دەستپێکردن هەڵبژێرە.",
    patientTitle: "چارەسەر بدۆزەرەوە",
    patientDescription: "بە پزیشک، کلینیک، پسپۆڕی، شوێن یان کاتی بەردەست بگەڕێ.",
    professionalTitle: "بەڕێوەبردنی کلینیک یان سەنتەر",
    professionalDescription: "Atlas Online بکەرەوە بۆ ڕیسێپشن، مەوعید، ستاف و کاری کلینیک.",
    localTitle: "Atlas Local",
    localDescription: "لەسەر ئەم ئامێرە بەبێ ئینتەرنێت کار بکە.",
    modeNote: "گەڕانی نەخۆش گشتییە؛ کاری کلینیک تایبەتە. Atlas Local لە داتای کلاود جیا دەمێنێت.",
    demo: "کلینیکی نموونە تاقی بکەرەوە",
    patientAccount: "مەوعیدەکانم",
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
    eyebrow: "پەیوەندیێن تەندروستی",
    title: "دکتۆر بدیتەوە یان کلینیکا خۆ بەڕێڤە ببە — هەمی ل Atlas.",
    hero: "ڕێکا دەستپێکرنێ هەلبژێرە.",
    patientTitle: "دکتۆر بدیتەوە",
    patientDescription: "ب دکتۆر، کلینیک، تایبەتمەندی، جه یان دەمێ بەردەست بگەڕێ.",
    professionalTitle: "بەڕێڤەبرنا کلینیک یان سەنتەری",
    professionalDescription: "Atlas Online بکەڤە بۆ ڕیسێپشن، وادە، ستاف و کارێ کلینیکێ.",
    localTitle: "Atlas Local",
    localDescription: "ل سەر ڤی ئامێری بێ ئینتەرنێت کار بکە.",
    modeNote: "گەڕانا نەخۆشان گشتییە؛ کارێ کلینیکێ تایبەتە. Atlas Local ژ داتای کلاود جودا دەمینیت.",
    demo: "کلینیکەکا نموونە تاقی بکە",
    patientAccount: "وادەیێن من",
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
    eyebrow: "رعاية مترابطة",
    title: "ابحث عن رعاية أو أدِر عيادتك — كله داخل Atlas.",
    hero: "اختر من أين تبدأ.",
    patientTitle: "ابحث عن رعاية",
    patientDescription: "ابحث حسب الطبيب أو العيادة أو الاختصاص أو الموقع أو الوقت المتاح.",
    professionalTitle: "إدارة عيادة أو مركز",
    professionalDescription: "افتح Atlas Online للاستقبال والمواعيد والموظفين وعمليات العيادة.",
    localTitle: "Atlas Local",
    localDescription: "استخدمه على هذا الجهاز بدون إنترنت.",
    modeNote: "بحث المرضى عام، وعمل العيادة يبقى خاص. Atlas Local يبقى منفصل عن بيانات السحابة.",
    demo: "جرّب عيادة نموذجية",
    patientAccount: "مواعيدي",
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
          <span className="app-brand-mark" aria-hidden="true"><img src="/atlas-icon.svg" width="44" height="44" alt="" /></span>
          <span className="app-brand-word">Atlas</span>
        </Link>
      </nav>

      <section className="hero shell atlas-simple-hero">
        <div className="atlas-home-language">
          <div className="eyebrow">{copy.languageLabel}</div>
          <LoginLanguagePicker locale={locale} />
        </div>

        <div className="eyebrow">{copy.eyebrow}</div>
        <h1>{copy.title}</h1>
        <p className="hero-copy">{copy.hero}</p>
        <div className="hero-actions atlas-home-actions" aria-label="Choose how to use Atlas">
          <Link className="button atlas-mode-button atlas-patient-entry" href="/care">
            <span className="atlas-mode-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5M11 7v8M7 11h8"/></svg></span>
            <strong>{copy.patientTitle}</strong>
            <span>{copy.patientDescription}</span>
          </Link>
          <Link className="button button-ghost atlas-mode-button atlas-professional-entry" href="/dashboard">
            <span className="atlas-mode-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M12 7v8M8 11h8M7 21v-4h10v4"/></svg></span>
            <strong>{copy.professionalTitle}</strong>
            <span>{copy.professionalDescription}</span>
          </Link>
        </div>
        <p className="quiet atlas-mode-note">{copy.modeNote}</p>
        <div className="atlas-home-secondary-actions">
          <a className="button button-ghost atlas-local-link" href="/atlas-local.html">
            <strong>{copy.localTitle}</strong>
            <span>{copy.localDescription}</span>
          </a>
          <Link className="button button-ghost atlas-demo-link" href="/patient-account">{copy.patientAccount}</Link>
          <Link className="button button-ghost atlas-demo-link" href="/demo">{copy.demo}</Link>
        </div>
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
        <span className="quiet">Atlas Novera · Registration 20260104383672</span>
      </footer>

      <style>{`
        .atlas-simple-home{min-height:100dvh}.atlas-marketing-brand .app-brand-word{color:var(--ink);opacity:1}.atlas-simple-hero{max-width:850px;padding-top:clamp(54px,9vh,96px);padding-bottom:42px}.atlas-home-language{max-width:650px;margin-bottom:34px}.atlas-home-language>.eyebrow{margin-bottom:10px}.atlas-home-language .login-language-picker{max-width:650px}.atlas-simple-hero h1{max-width:720px}.atlas-simple-hero .hero-copy{max-width:650px}.atlas-home-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-width:650px}.atlas-mode-button{min-height:74px;display:grid;align-content:center;justify-items:start;gap:4px;text-align:start;text-decoration:none}.atlas-mode-button strong{font-size:14px}.atlas-mode-button span{font-size:10.5px;font-weight:650;opacity:.82}.atlas-local-mode{color:var(--accent);background:rgba(255,255,255,.8);border-color:rgba(8,119,90,.2)}.atlas-local-mode:hover{background:#fff;border-color:rgba(8,119,90,.35)}.atlas-mode-note{max-width:650px;margin-top:12px;font-size:11.5px}.atlas-home-secondary-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.atlas-home-secondary-actions .atlas-demo-link{margin-top:0}.atlas-local-link{display:grid;gap:2px;min-height:48px;align-content:center;text-align:start;text-decoration:none}.atlas-local-link strong{font-size:12px}.atlas-local-link span{font-size:10px;opacity:.82}.atlas-demo-link{display:inline-flex;margin-top:9px;min-height:40px;align-items:center;justify-content:center;color:var(--accent);font-size:12px;font-weight:800;text-decoration:none}.atlas-scope-note{max-width:620px;margin-top:18px}.atlas-simple-essentials{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;overflow:hidden;border:1px solid var(--line);border-radius:18px;background:var(--line)}.atlas-simple-essentials>div{display:grid;gap:6px;padding:18px;background:#fff}.atlas-simple-essentials strong{font-size:13px}.atlas-simple-essentials span{color:var(--muted);font-size:12px;line-height:1.55}.atlas-simple-footer{display:flex;gap:16px;flex-wrap:wrap;padding-top:26px;padding-bottom:48px;color:var(--muted);font-size:12px}.atlas-simple-footer a{color:inherit}@media(max-width:680px){.atlas-simple-essentials{grid-template-columns:1fr}.atlas-simple-hero{padding-top:38px}.atlas-home-actions{grid-template-columns:1fr}}
        .atlas-simple-hero{max-width:1060px;padding-top:clamp(24px,5vh,56px)}
        .atlas-simple-hero h1{max-width:780px;font-size:clamp(36px,6vw,66px);line-height:1.1;letter-spacing:-.045em}
        .atlas-simple-hero .hero-copy{font-size:clamp(14px,2vw,18px);max-width:540px}
        .atlas-home-actions{max-width:900px;gap:16px;margin-top:30px}
        .atlas-mode-button{min-height:192px;border-radius:24px;padding:24px;align-content:space-between;justify-items:start;gap:8px;box-shadow:var(--shadow-sm)}
        .atlas-mode-button strong{font-size:clamp(20px,2.8vw,28px);line-height:1.2}
        .atlas-mode-button span:not(.atlas-mode-icon){font-size:13px;line-height:1.5;font-weight:600}
        .atlas-mode-icon{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:rgba(255,255,255,.17)}
        .atlas-mode-icon svg{width:29px;height:29px}
        .atlas-professional-entry .atlas-mode-icon{background:var(--accent-soft);color:var(--accent)}
        .atlas-simple-home .atlas-marketing-brand .app-brand-mark{background:transparent;overflow:hidden}
        .atlas-simple-home .atlas-marketing-brand .app-brand-mark img{display:block;width:44px;height:44px;object-fit:contain}
        .atlas-mode-button:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
        @media(max-width:680px){.atlas-mode-button{min-height:142px;padding:19px}.atlas-home-actions{gap:12px}}
      `}</style>
    </main>
  );
}
