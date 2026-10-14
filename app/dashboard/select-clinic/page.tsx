import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

const copy: Record<UiLocale, {
  eyebrow: string;
  title: string;
  intro: string;
  help: string;
  list: string;
  available: string;
  open: string;
  account: string;
  loading: string;
  loadingHelp: string;
  errorTitle: string;
  errorHelp: string;
  retry: string;
}> = {
  en: {
    eyebrow: "Atlas Doctor · Workspaces",
    title: "Which clinic are you working in?",
    intro: "Choose a clinic to open its workspace.",
    help: "Only clinics you can access appear here. Your Atlas account does not automatically join another clinic.",
    list: "Clinics you can open",
    available: "Available workspaces",
    open: "Open clinic",
    account: "Account settings",
    loading: "Checking your clinics…",
    loadingHelp: "Finding the workspaces available to your account.",
    errorTitle: "Could not load your clinics",
    errorHelp: "We could not check your clinic access. Try again before entering any patient information.",
    retry: "Try again",
  },
  ku: {
    eyebrow: "Atlas Doctor · شوێنەکانی کار",
    title: "ئەمڕۆ لە کام کلینیک کار دەکەیت؟",
    intro: "کلینیکەکەت هەڵبژێرە بۆ چوونە ناو شوێنی کارەکەی.",
    help: "تەنها ئەو کلینیکانە دەبینیت کە ڕێگەی چوونەناوت هەیە. هەژماری Atlas بە خۆی تۆ ناخاتە ناو کلینیکی کەسی تر.",
    list: "کلینیکە بەردەستەکان",
    available: "شوێنە بەردەستەکانی کار",
    open: "کلینیک بکەرەوە",
    account: "ڕێکخستنەکانی هەژمار",
    loading: "کلینیکەکانت دەپشکنین…",
    loadingHelp: "ئەو کلینیکانە دەدۆزینەوە کە ڕێگەی چوونەناوت بۆیان هەیە.",
    errorTitle: "نەتوانرا کلینیکەکانت بار بکرێن",
    errorHelp: "نەتوانرا دەستڕاگەیشتنت بە کلینیکەکان بپشکنرێت. پێش نووسینی زانیاری نەخۆش دووبارە هەوڵ بدە.",
    retry: "دووبارە هەوڵ بدە",
  },
  bd: {
    eyebrow: "Atlas Doctor · شوێنێن کاری",
    title: "ئەڤرۆ ل کیژ کلینیکێ کار دکەی؟",
    intro: "کلینیکا خۆ هەلبژێرە بۆ چوونا ناڤ شوێنێ کاری وێ.",
    help: "تەنێ ئەو کلینیکانە دبینی کو دەستهەلاتا چوونێ بۆ وان هەیە. هەژمارا Atlas ب خۆ تۆ ناخەتە ناڤ کلینیکا کەسەکێ دی.",
    list: "کلینیکێن بەردەست",
    available: "شوێنێن کاری یێن بەردەست",
    open: "کلینیکێ ڤەکە",
    account: "ڕێکخستنێن هەژمارێ",
    loading: "کلینیکێن تە دپشکنین…",
    loadingHelp: "ئەو کلینیکانە ددۆزینەوە کو دەستهەلاتا چوونێ بۆ وان هەیە.",
    errorTitle: "نەشیا کلینیکێن تە بار بکەت",
    errorHelp: "نەشیا دەستهەلاتا چوونا تە بۆ کلینیکان بپشکنیت. بەری داخلكرنا زانیاریێن نەخۆشی جارەکا دی هەوڵ بدە.",
    retry: "جارەکا دی هەوڵ بدە",
  },
  ar: {
    eyebrow: "Atlas Doctor · مساحات العمل",
    title: "بأي عيادة تشتغل اليوم؟",
    intro: "اختار العيادة حتى تدخل مساحة العمل الخاصة بيها.",
    help: "تظهر بس العيادات اللي عندك صلاحية الدخول إلها. حساب Atlas ما يضيفك تلقائياً لعيادة غيرك.",
    list: "العيادات المتاحة إلك",
    available: "مساحات العمل المتاحة",
    open: "افتح العيادة",
    account: "إعدادات الحساب",
    loading: "جاري التحقق من عياداتك…",
    loadingHelp: "نتحقق من مساحات العمل اللي عندك صلاحية الدخول إلها.",
    errorTitle: "تعذر تحميل عياداتك",
    errorHelp: "ما قدرنا نتحقق من صلاحيات الدخول للعيادات. حاول مرة ثانية قبل إدخال أي معلومات عن المرضى.",
    retry: "حاول مرة ثانية",
  },
};

function ClinicSelectionLoading({ locale }: { locale: UiLocale }) {
  const t = copy[locale];
  return (
    <section className="clinic-selection-state" role="status" aria-live="polite" aria-busy="true">
      <p className="clinic-selection-state-title">{t.loading}</p>
      <p className="clinic-selection-support">{t.loadingHelp}</p>
      <div className="clinic-selection-skeleton" aria-hidden="true">
        <span /><span /><span />
      </div>
    </section>
  );
}

async function ClinicChoices({ locale }: { locale: UiLocale }) {
  const t = copy[locale];
  const openArrow = locale === "en" ? "→" : "←";
  const supabase = await createClient();
  const { data: clinics, error: clinicsError } = await supabase
    .from("clinics")
    .select("id, name")
    .order("created_at", { ascending: true });

  if (clinicsError) {
    return (
      <section className="clinic-selection-state clinic-selection-error" role="alert">
        <h2>{t.errorTitle}</h2>
        <p className="clinic-selection-support">{t.errorHelp}</p>
        <Link className="button" href="/dashboard/select-clinic" prefetch={false}>{t.retry}</Link>
      </section>
    );
  }

  // Preserve the existing first-clinic onboarding and single-clinic fast path.
  // Accessible clinics come only from the existing RLS-protected query.
  if (!clinics?.length) redirect("/dashboard");
  if (clinics.length === 1) redirect("/dashboard?clinic=" + encodeURIComponent(clinics[0].id));

  return (
    <section className="clinic-selection-results" aria-labelledby="clinic-selection-list-title">
      <div className="clinic-selection-list-header">
        <h2 id="clinic-selection-list-title">{t.available}</h2>
        <span className="clinic-selection-count" aria-label={t.list + ": " + clinics.length}>
          {clinics.length}
        </span>
      </div>
      <ul className="clinic-choice-list" aria-label={t.list}>
        {clinics.map((clinic) => (
          <li key={clinic.id}>
            <Link className="clinic-choice" href={"/dashboard?clinic=" + encodeURIComponent(clinic.id)} prefetch={false}>
              <span className="clinic-choice-mark" aria-hidden="true">
                {Array.from(clinic.name.trim())[0] || "A"}
              </span>
              <span className="clinic-choice-detail">
                <span className="clinic-choice-name" dir="auto"><span data-atlas-user-content="true">{clinic.name}</span></span>
                <strong>{t.open} <span aria-hidden="true">{openArrow}</span></strong>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function SelectClinicPage() {
  const locale = await getUiLocale();
  const t = copy[locale];
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  return (
    <main className="clinic-selection shell" dir={locale === "en" ? "ltr" : "rtl"}>
      <header className="clinic-selection-top">
        <div className="app-brand setup-brand">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span dir="ltr">Atlas Doctor</span>
        </div>
        <Link className="button button-ghost button-small" href="/dashboard/settings/account">{t.account}</Link>
      </header>
      <div className="clinic-selection-intro">
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{t.title}</h1>
        <p className="clinic-selection-lead">{t.intro}</p>
      </div>
      <Suspense fallback={<ClinicSelectionLoading locale={locale} />}>
        <ClinicChoices locale={locale} />
      </Suspense>
      <p className="clinic-selection-footnote">{t.help}</p>
      <style>{clinicSelectionStyles}</style>
    </main>
  );
}

const clinicSelectionStyles = [
  ".clinic-selection{max-width:1040px;min-height:calc(100dvh - 90px);padding-block:32px 100px}",
  ".clinic-selection-top{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap}",
  ".clinic-selection-top .setup-brand{margin:0}",
  ".clinic-selection-top .button{min-height:44px}",
  ".clinic-selection-intro{max-width:720px;margin:clamp(44px,8vh,92px) 0 30px}",
  ".clinic-selection-intro .eyebrow{margin:0;color:var(--accent)}",
  ".clinic-selection-intro h1{font-size:clamp(32px,5vw,56px);line-height:1.12;letter-spacing:-.04em;margin:12px 0 16px}",
  ".clinic-selection-lead{font-size:clamp(15px,1.7vw,18px);line-height:1.65;color:var(--ink-soft);margin:0}",
  ".clinic-selection-results{margin-top:22px}",
  ".clinic-selection-list-header{display:flex;align-items:center;gap:10px;margin-bottom:16px}",
  ".clinic-selection-list-header h2{font-size:14px;font-weight:800;margin:0;color:var(--ink-soft)}",
  ".clinic-selection-count{display:inline-flex;min-width:30px;height:30px;align-items:center;justify-content:center;border-radius:999px;background:var(--accent-soft);color:var(--accent);font-weight:800;font-size:13px}",
  ".clinic-choice-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:0;padding:0;list-style:none}",
  ".clinic-choice-list li{min-width:0}",
  ".clinic-choice{display:flex;align-items:center;gap:18px;min-height:116px;height:100%;padding:22px;border:1px solid var(--line);border-radius:20px;background:var(--surface);color:var(--ink);box-shadow:var(--shadow-sm);text-decoration:none;transition:border-color .15s ease,box-shadow .15s ease,transform .15s ease}",
  ".clinic-choice:hover{border-color:var(--accent);box-shadow:var(--shadow-md);transform:translateY(-1px)}",
  ".clinic-choice:focus-visible{outline:3px solid var(--accent);outline-offset:3px}",
  ".clinic-choice-mark{display:grid;flex:none;place-items:center;width:56px;height:56px;border-radius:16px;background:var(--accent-soft);color:var(--accent);font-size:25px;font-weight:850;line-height:1}",
  ".clinic-choice-detail{min-width:0;flex:1;display:grid;gap:10px}",
  ".clinic-choice-name{display:block;max-width:100%;font-size:clamp(17px,1.8vw,20px);font-weight:850;line-height:1.35;overflow-wrap:anywhere;unicode-bidi:plaintext}",
  ".clinic-choice-detail strong{font-size:13px;color:var(--accent);font-weight:750}",
  ".clinic-selection-footnote{max-width:700px;margin:24px 0 0;color:var(--muted);font-size:13px;line-height:1.65}",
  ".clinic-selection-state{max-width:700px;padding:26px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}",
  ".clinic-selection-state-title,.clinic-selection-state h2{font-size:18px;font-weight:800;margin:0 0 8px}",
  ".clinic-selection-support{color:var(--ink-soft);font-size:14px;line-height:1.65;margin:0}",
  ".clinic-selection-error{border-color:var(--line-strong)}",
  ".clinic-selection-error .button{display:inline-flex;margin-top:20px;min-height:44px;align-items:center}",
  ".clinic-selection-skeleton{display:grid;gap:12px;margin-top:22px}",
  ".clinic-selection-skeleton span{display:block;height:54px;border-radius:12px;background:var(--surface-soft);border:1px solid var(--line)}",
  "@media(max-width:720px){.clinic-selection{padding-block:24px 110px}.clinic-selection-intro{margin:40px 0 24px}.clinic-choice-list{grid-template-columns:minmax(0,1fr)}.clinic-choice{min-height:96px;padding:18px}.clinic-choice-mark{height:52px;width:52px}}",
  "@media(max-width:420px){.clinic-selection-top{align-items:flex-start}.clinic-selection-top .button{font-size:12px}.clinic-choice{gap:13px}.clinic-choice-mark{height:46px;width:46px;border-radius:12px}}",
  "@media(prefers-reduced-motion:reduce){.clinic-choice{transition:none}.clinic-choice:hover{transform:none}}",
].join("\n");
