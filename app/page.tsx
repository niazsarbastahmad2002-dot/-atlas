import Link from "next/link";
import { redirect } from "next/navigation";
import { PatientLanguageSwitcher } from "@/app/care/patient-language-switcher";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { atlasPublicCompanyProfile } from "@/lib/public-company-profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type HomeCopy = {
  welcome: string;
  prompt: string;
  patientTitle: string;
  patientDescription: string;
  professionalTitle: string;
  professionalDescription: string;
  choicesLabel: string;
  secondaryTitle: string;
  localTitle: string;
  demo: string;
  patientAccount: string;
  modeNote: string;
  scope: string;
  support: string;
  privacy: string;
  terms: string;
};

const homeCopy: Record<UiLocale, HomeCopy> = {
  en: {
    welcome: "Welcome to Atlas.",
    prompt: "How would you like to begin?",
    patientTitle: "Find Care",
    patientDescription: "Explore doctors, clinics, and published appointment times.",
    professionalTitle: "Run a Clinic or Center",
    professionalDescription: "Manage reception, appointments, and everyday clinic work.",
    choicesLabel: "Choose how to use Atlas",
    secondaryTitle: "Other ways to use Atlas",
    localTitle: "Atlas Local",
    demo: "Try a sample clinic",
    patientAccount: "My appointments",
    modeNote: "Patient discovery is public. Clinic work stays private. Atlas Local is separate from cloud data.",
    scope: "Scheduling and communication only — keep medical notes in your clinic's approved record system.",
    support: "Support",
    privacy: "Privacy",
    terms: "Terms",
  },
  ku: {
    welcome: "بەخێربێیت بۆ Atlas",
    prompt: "چۆن دەتەوێت دەست پێ بکەیت؟",
    patientTitle: "پزیشک و کلینیک بدۆزەرەوە",
    patientDescription: "بەدوای پزیشک و کلینیکدا بگەڕێ و کاتە بەردەستە بڵاوکراوەکان ببینە.",
    professionalTitle: "کلینیک یان سەنتەر بەڕێوەببە",
    professionalDescription: "وادەکان، ڕیسێپشن و کاری ڕۆژانەی کلینیک بەڕێوەببە.",
    choicesLabel: "ڕێگای بەکارهێنانی Atlas هەڵبژێرە",
    secondaryTitle: "ڕێگاکانی تری بەکارهێنانی Atlas",
    localTitle: "Atlas Local",
    demo: "کلینیکی نموونە تاقی بکەرەوە",
    patientAccount: "وادەکانم",
    modeNote: "گەڕانی پزیشک و کلینیک بۆ هەمووانە؛ زانیاری کلینیک تایبەتە. Atlas Local لە زانیاریی ئۆنلاین جیاوازە.",
    scope: "تەنها بۆ وادەکان و پەیوەندی — تێبینیی پزیشکی لە سیستەمی پەسەندکراوی کلینیکەکەت بپارێزە.",
    support: "یارمەتی",
    privacy: "تایبەتمەندی",
    terms: "مەرجەکان",
  },
  bd: {
    welcome: "بخێرهاتی بۆ Atlas",
    prompt: "ڕێکا دەستپێکرنێ هەلبژێرە.",
    patientTitle: "دکتۆر و کلینیک بدیتەوە",
    patientDescription: "ل دکتۆر و کلینیکان بگەڕێ و دەمێن بەردەست یێن بڵاوکری ببینە.",
    professionalTitle: "کلینیک یان سەنتەر بەڕێڤە ببە",
    professionalDescription: "وادە، ڕیسێپشن و کارێن ڕۆژانە یێن کلینیکێ بەڕێڤە ببە.",
    choicesLabel: "ڕێکا بەکارهینانا Atlas هەلبژێرە",
    secondaryTitle: "ڕێکێن دی یێن بەکارهینانا Atlas",
    localTitle: "Atlas Local",
    demo: "کلینیکەکا نموونە تاقی بکە",
    patientAccount: "وادەیێن من",
    modeNote: "گەڕانا دکتۆر و کلینیکان بۆ هەمی کەسانە؛ زانیاریێن کلینیکێ تایبەتن. Atlas Local ژ زانیاریێن ئۆنلاین جودایە.",
    scope: "تەنێ بۆ وادە و پەیوەندیێ — تێبینیێن پزیشکی ل سیستەمێ پەسەندکری یێ کلینیکێ بپارێزە.",
    support: "یارمەتی",
    privacy: "تایبەتمەندی",
    terms: "مەرج",
  },
  ar: {
    welcome: "أهلًا بك في Atlas",
    prompt: "كيف تحب أن تبدأ؟",
    patientTitle: "ابحث عن رعاية طبية",
    patientDescription: "تصفح الأطباء والعيادات والمواعيد المتاحة المنشورة.",
    professionalTitle: "أدِر عيادة أو مركزًا",
    professionalDescription: "نظّم المواعيد والاستقبال والعمل اليومي للعيادة.",
    choicesLabel: "اختر كيف تستخدم Atlas",
    secondaryTitle: "طرق أخرى لاستخدام Atlas",
    localTitle: "Atlas Local",
    demo: "جرّب عيادة نموذجية",
    patientAccount: "مواعيدي",
    modeNote: "البحث عن الأطباء والعيادات متاح للجميع، وبيانات العيادة خاصة. Atlas Local منفصل عن البيانات السحابية.",
    scope: "للمواعيد والتواصل فقط — احفظ الملاحظات الطبية في نظام السجلات المعتمد في عيادتك.",
    support: "الدعم",
    privacy: "الخصوصية",
    terms: "الشروط",
  },
};

const welcomeStyles = `
.atlas-welcome-page{min-height:100dvh;display:flex;flex-direction:column;background:radial-gradient(ellipse at 15% 14%,rgba(65,166,124,.105),transparent 48%),radial-gradient(ellipse at 89% 64%,rgba(65,166,124,.055),transparent 40%),var(--canvas);color:var(--ink)}
.atlas-welcome-page .atlas-welcome-nav{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:90px;padding-block:17px}
.atlas-welcome-page .atlas-marketing-brand{display:inline-flex;align-items:center;gap:12px;min-height:48px;text-decoration:none}
.atlas-marketing-brand .app-brand-word{color:var(--ink);opacity:1}
.atlas-welcome-page .atlas-marketing-brand .app-brand-word{font-size:27px;font-weight:850;letter-spacing:-.055em}
.atlas-welcome-page .atlas-marketing-brand .app-brand-mark{display:grid;place-items:center;width:47px;height:47px;border-radius:14px;background:transparent!important;background-image:none!important;box-shadow:none;overflow:hidden}
.atlas-welcome-page .atlas-marketing-brand img{display:block;width:47px;height:47px;object-fit:contain}
.atlas-welcome-page .atlas-welcome-language .atlas-patient-language{display:inline-flex;align-items:center;gap:9px;min-height:46px;border:1px solid var(--line-strong);border-radius:14px;padding:0 12px;background:var(--surface);color:var(--ink-soft);font-size:13px;font-weight:700;box-shadow:var(--shadow-sm)}
.atlas-welcome-page .atlas-welcome-language .atlas-patient-language select{appearance:auto;width:auto;min-width:116px;min-height:44px;border:0;padding:0;background:transparent;color:var(--ink);font-size:13px;font-weight:720;box-shadow:none;cursor:pointer}
.atlas-welcome-page .atlas-welcome-language .atlas-patient-language select:focus{outline:none;box-shadow:none}
.atlas-welcome-page .atlas-welcome-language .atlas-patient-language:focus-within{outline:3px solid var(--accent);outline-offset:3px}
.atlas-welcome-page .atlas-welcome-main{width:min(960px,calc(100% - 40px));margin-inline:auto;flex:1;display:flex;flex-direction:column;justify-content:center;padding-block:clamp(42px,9vh,106px)}
.atlas-welcome-page .atlas-welcome-heading{max-width:790px}
.atlas-welcome-page .atlas-welcome-eyebrow{margin:0 0 16px;color:var(--accent);font-size:12px;font-weight:850;letter-spacing:.13em;text-transform:uppercase}
.atlas-welcome-page .atlas-welcome-heading h1{margin:0;color:var(--ink);font-size:clamp(42px,6.4vw,76px);font-weight:820;line-height:1.1;letter-spacing:-.055em;text-wrap:balance}
.atlas-welcome-page .atlas-welcome-subtitle{margin:20px 0 0;color:var(--muted);font-size:clamp(17px,2vw,20px);line-height:1.55}
.atlas-welcome-page .atlas-home-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;width:100%;margin-top:42px}
.atlas-welcome-page .atlas-mode-button{display:flex;flex-direction:column;align-items:stretch;justify-content:space-between;gap:24px;min-width:0;min-height:252px;border:1px solid var(--line);border-radius:27px;padding:29px;text-align:start;text-decoration:none;box-shadow:0 12px 36px rgba(18,50,34,.065);transition:transform .18s ease,box-shadow .18s ease,background .18s ease,border-color .18s ease}
.atlas-welcome-page .atlas-patient-entry{border-color:#064b3a;background:linear-gradient(145deg,#075f49 0%,#064635 100%);color:#fff}
.atlas-welcome-page .atlas-patient-entry:hover{background:linear-gradient(145deg,#086e55,#075040);box-shadow:0 18px 38px rgba(5,65,46,.22)}
.atlas-welcome-page .atlas-professional-entry{background:var(--surface);color:var(--ink);border-color:var(--line-strong)}
.atlas-welcome-page .atlas-professional-entry:hover{background:var(--surface-soft);border-color:var(--accent);box-shadow:0 18px 38px rgba(18,50,34,.1)}
.atlas-welcome-page .atlas-mode-button:hover{transform:translateY(-3px)}
.atlas-welcome-page .atlas-mode-button:focus-visible,.atlas-welcome-page .atlas-marketing-brand:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
.atlas-welcome-page .atlas-patient-entry:focus-visible{outline-color:#35a981}
.atlas-welcome-page .atlas-mode-icon{display:grid;place-items:center;flex:none;width:51px;height:51px;border-radius:16px;background:rgba(255,255,255,.16)}
.atlas-welcome-page .atlas-professional-entry .atlas-mode-icon{background:var(--accent-soft);color:var(--accent)}
.atlas-welcome-page .atlas-mode-icon svg{display:block;width:29px;height:29px}
.atlas-welcome-page .atlas-mode-copy{display:grid;gap:10px}
.atlas-welcome-page .atlas-mode-button strong{color:inherit;font-size:clamp(23px,2.7vw,29px);font-weight:800;line-height:1.26;letter-spacing:-.026em}
.atlas-welcome-page .atlas-mode-button .atlas-mode-description{color:inherit;opacity:.83;font-size:14px;font-weight:550;line-height:1.55}
.atlas-welcome-page .atlas-card-end{display:flex;justify-content:space-between;align-items:flex-end;gap:14px}
.atlas-welcome-page .atlas-card-arrow{display:grid;place-items:center;flex:none;width:35px;height:35px;border:1px solid currentColor;border-radius:50%;font-size:20px;line-height:1;opacity:.8}
html[dir="rtl"] .atlas-welcome-page .atlas-welcome-heading h1,html[dir="rtl"] .atlas-welcome-page .atlas-mode-button strong{letter-spacing:0;line-height:1.45}
html[dir="rtl"] .atlas-welcome-page .atlas-welcome-eyebrow{letter-spacing:0;text-transform:none}
html[dir="rtl"] .atlas-welcome-page .atlas-card-arrow{transform:rotate(180deg)}
.atlas-welcome-page .atlas-welcome-aux{border-top:1px solid var(--line);padding-block:24px 14px}
.atlas-welcome-page .atlas-welcome-aux-title{margin:0 0 10px;color:var(--muted);font-size:12px;font-weight:800}
.atlas-welcome-page .atlas-home-secondary-actions{display:flex;flex-wrap:wrap;gap:7px 23px}
.atlas-welcome-page .atlas-home-secondary-actions a.button{display:inline-flex;min-height:40px;padding:6px 0;border:0;background:transparent;color:var(--accent);font-size:13px;font-weight:730;text-decoration:underline;text-decoration-color:transparent;text-underline-offset:3px;box-shadow:none}
.atlas-welcome-page .atlas-home-secondary-actions a:hover{text-decoration-color:currentColor}
.atlas-welcome-page .atlas-simple-footer{display:flex;flex-wrap:wrap;align-items:center;gap:9px 20px;padding-block:14px 36px;color:var(--muted);font-size:12px;line-height:1.55}
.atlas-welcome-page .atlas-simple-footer a{color:inherit;text-underline-offset:3px}
.atlas-welcome-page .atlas-footer-note{flex-basis:100%;max-width:820px}
.atlas-welcome-page .atlas-footer-legal{flex-basis:100%;font-size:11px;opacity:.83}
:root[data-theme="dark"] .atlas-welcome-page .atlas-patient-entry strong{color:#fff!important}
@media(prefers-color-scheme:dark){:root[data-theme="system"] .atlas-welcome-page .atlas-patient-entry strong{color:#fff!important}}
@media(max-width:720px){
 .atlas-welcome-page .atlas-welcome-main{padding-block:38px 58px}
 .atlas-welcome-page .atlas-home-actions{grid-template-columns:1fr;gap:14px;margin-top:31px}
 .atlas-welcome-page .atlas-mode-button{min-height:172px;padding:21px;gap:16px;border-radius:22px}
 .atlas-welcome-page .atlas-mode-icon{width:43px;height:43px;border-radius:13px}
 .atlas-welcome-page .atlas-mode-icon svg{width:25px;height:25px}
 .atlas-welcome-page .atlas-card-arrow{width:30px;height:30px}
 .atlas-welcome-page .atlas-welcome-heading h1{font-size:clamp(35px,8.8vw,53px)}
 .atlas-welcome-page .atlas-mode-button strong{font-size:23px}
}
@media(max-width:400px){
 .atlas-welcome-page .atlas-welcome-nav{min-height:75px;gap:8px}
 .atlas-welcome-page .atlas-marketing-brand .app-brand-word{font-size:23px}
 .atlas-welcome-page .atlas-marketing-brand .app-brand-mark,.atlas-welcome-page .atlas-marketing-brand img{width:40px;height:40px}
 .atlas-welcome-page .atlas-welcome-language .atlas-patient-language{padding-inline:9px}
 .atlas-welcome-page .atlas-welcome-language .atlas-patient-language span{display:none}
 .atlas-welcome-page .atlas-welcome-language .atlas-patient-language select{min-width:104px;font-size:12px}
 .atlas-welcome-page .atlas-welcome-main{width:calc(100% - 32px)}
 .atlas-welcome-page .atlas-mode-button{padding:18px}
}
@media(prefers-reduced-motion:reduce){.atlas-welcome-page .atlas-mode-button{transition:none}.atlas-welcome-page .atlas-mode-button:hover{transform:none}}
`;

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");

  const locale = await getUiLocale();
  const copy = homeCopy[locale];
  const company = atlasPublicCompanyProfile();

  return (
    <main className="marketing-page atlas-simple-home atlas-welcome-page">
      <header className="shell atlas-welcome-nav">
        <Link className="app-brand atlas-marketing-brand" href="/" aria-label="Atlas home">
          <span className="app-brand-mark" aria-hidden="true">
            <img src="/atlas-icon.svg" width="47" height="47" alt="" />
          </span>
          <span className="app-brand-word">Atlas</span>
        </Link>
        <div className="atlas-welcome-language">
          <PatientLanguageSwitcher locale={locale} />
        </div>
      </header>

      <section className="atlas-welcome-main" aria-labelledby="atlas-welcome-title">
        <div className="atlas-welcome-heading">
          <p className="atlas-welcome-eyebrow">Atlas</p>
          <h1 id="atlas-welcome-title">{copy.welcome}</h1>
          <p className="atlas-welcome-subtitle">{copy.prompt}</p>
        </div>

        <div className="atlas-home-actions" aria-label={copy.choicesLabel}>
          <Link className="button atlas-mode-button atlas-patient-entry" href="/care">
            <span className="atlas-mode-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m16 16 5 5M11 7v8M7 11h8" />
              </svg>
            </span>
            <span className="atlas-card-end">
              <span className="atlas-mode-copy">
                <strong>{copy.patientTitle}</strong>
                <span className="atlas-mode-description">{copy.patientDescription}</span>
              </span>
              <span className="atlas-card-arrow" aria-hidden="true">→</span>
            </span>
          </Link>

          <Link className="button button-ghost atlas-mode-button atlas-professional-entry" href="/dashboard">
            <span className="atlas-mode-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M12 7v8M8 11h8M7 21v-4h10v4" />
              </svg>
            </span>
            <span className="atlas-card-end">
              <span className="atlas-mode-copy">
                <strong>{copy.professionalTitle}</strong>
                <span className="atlas-mode-description">{copy.professionalDescription}</span>
              </span>
              <span className="atlas-card-arrow" aria-hidden="true">→</span>
            </span>
          </Link>
        </div>
      </section>

      <aside className="shell atlas-welcome-aux" aria-label={copy.secondaryTitle}>
        <p className="atlas-welcome-aux-title">{copy.secondaryTitle}</p>
        <nav className="atlas-home-secondary-actions" aria-label={copy.secondaryTitle}>
          <Link className="button button-ghost atlas-demo-link" href="/patient-account">{copy.patientAccount}</Link>
          <Link className="button button-ghost atlas-demo-link" href="/demo">{copy.demo}</Link>
          <a className="button button-ghost atlas-local-link" href="/atlas-local.html">{copy.localTitle}</a>
        </nav>
      </aside>

      <footer className="shell atlas-simple-footer">
        <p className="quiet atlas-footer-note">{copy.modeNote} {copy.scope}</p>
        <Link href="/support">{copy.support}</Link>
        <Link href="/privacy">{copy.privacy}</Link>
        <Link href="/terms">{copy.terms}</Link>
        <span className="quiet atlas-footer-legal">
          {company.isVerifiedCompanyProfile && company.legalEntityName ? <>{company.legalEntityName} · </> : null}
          Atlas Novera · Registration 20260104383672
        </span>
      </footer>
      <style>{welcomeStyles}</style>
    </main>
  );
}
