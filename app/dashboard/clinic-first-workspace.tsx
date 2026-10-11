import Link from "next/link";
import type { UiLocale } from "@/lib/i18n/ui";
import { uiText } from "@/lib/i18n/ui";
import { SubmitButton } from "@/app/components/submit-button";
import { ClinicSetupNameInput } from "./clinic-setup-name-input";
import { createClinic } from "./actions";

const copy = {
  en: {
    eyebrow: "Your first Atlas clinic",
    title: "Set up your clinic. Keep every workspace separate.",
    intro: "Your Atlas account belongs to you. A clinic workspace is created separately and never gives you access to another clinic.",
    ownTitle: "Start a private clinic workspace",
    ownHelp: "For a clinic you own or have authority to represent. This creates a private operations workspace, not a verified or public listing.",
    clinicName: "Clinic name",
    nameHelp: "Use the real clinic name only with the clinic’s permission. Creating a workspace does not verify ownership.",
    create: "Create private workspace",
    inviteTitle: "Joining an existing clinic?",
    inviteHelp: "Ask its administrator for a secure staff invitation. Signing in does not automatically join anyone else’s clinic.",
    inviteStep: "Open the one-use invitation link provided by your clinic administrator. It is separate from creating a new clinic.",
    account: "Manage your Atlas account",
    roadTitle: "From first setup to patient discovery",
    roadIntro: "Clinic operations can start privately. Public verification and application review are not available in this flow yet.",
    stages: [
      { title: "Private workspace", detail: "Create your own clinic workspace and begin scheduling.", ready: true },
      { title: "Clinic operations", detail: "Set up doctors, hours, staff invitations and appointments.", ready: true },
      { title: "Submit for verification", detail: "Contact, clinic authority and medical credentials will need independent checks.", ready: false },
      { title: "Review and publication", detail: "An Atlas approval process must exist before verified marketplace publication.", ready: false },
    ],
    available: "Available now",
    planned: "Not available yet",
    warning: "Do not upload IDs, medical licenses, or business documents here. Atlas has not opened a secure application-review intake.",
  },
  ku: {
    eyebrow: "یەکەم کلینیکت لە Atlas",
    title: "کلینیکەکەت ئامادە بکە. هەر شوێنێکی کار جیاوازە.",
    intro: "هەژماری Atlas هی خۆتە. شوێنی کاری کلینیک بە جیا دروست دەکرێت و دەستڕاگەیشتن بە کلینیکی کەسی تر نادات.",
    ownTitle: "شوێنی کاری تایبەتی کلینیک دروست بکە",
    ownHelp: "تەنها بۆ کلینیکێک کە خاوەنی یان نوێنەری ڕێگەپێدراوی. ئەمە شوێنی کاری تایبەت دروست دەکات، نە پڕۆفایلی پشتڕاستکراوە یان گشتی.",
    clinicName: "ناوی کلینیک",
    nameHelp: "تەنها بە ڕەزامەندی کلینیک ناوی ڕاستەقینەی بنووسە. دروستکردنی شوێنی کار خاوەندارێتی پشتڕاست ناکاتەوە.",
    create: "شوێنی کاری تایبەت دروست بکە",
    inviteTitle: "دەتەوێت بچیتە کلینیکێکی هەبوو؟",
    inviteHelp: "داوای بانگهێشتی پارێزراو لە بەڕێوەبەری کلینیک بکە. چوونەژوورەوە بە خۆی تۆ ناخاتە ناو کلینیکی کەسی تر.",
    inviteStep: "لینکی بانگهێشتی یەکجارەکەی بەڕێوەبەری کلینیک بکەرەوە. ئەمە جیاوازە لە دروستکردنی کلینیکی نوێ.",
    account: "بەڕێوەبردنی هەژماری Atlas",
    roadTitle: "لە دەستپێکردنەوە تا دۆزینەوە لەلایەن نەخۆش",
    roadIntro: "کاری کلینیک دەتوانێت بە تایبەتی دەست پێ بکات. داواکاری و پشکنینی گشتی لەم ڕێگایەدا هێشتا بەردەست نین.",
    stages: [
      { title: "شوێنی کاری تایبەت", detail: "کلینیکەکەت دروست بکە و خشتەی وادەکان ڕێک بخە.", ready: true },
      { title: "کاروباری کلینیک", detail: "پزیشک، کاتەکان، بانگهێشتی ستاف و وادەکان ڕێک بخە.", ready: true },
      { title: "ناردن بۆ پشتڕاستکردنەوە", detail: "پەیوەندی، دەسەڵاتی کلینیک و بەڵگەی پیشەی پزیشکی پێویستیان بە پشکنینی سەربەخۆ هەیە.", ready: false },
      { title: "پێداچوونەوە و بڵاوکردنەوە", detail: "پێش بڵاوکردنەوەی پشتڕاستکراوە لە بازاڕدا، پەسەندکردنی Atlas پێویستە.", ready: false },
    ],
    available: "ئێستا بەردەستە",
    planned: "هێشتا بەردەست نییە",
    warning: "لێرە ناسنامە، مۆڵەتی پزیشکی یان بەڵگەی بازرگانی بار مەکە. Atlas هێشتا شوێنی پارێزراوی وەرگرتنی داواکاری نەکردووەتەوە.",
  },
  bd: {
    eyebrow: "کلینیکا تە یا ئێکێ ل Atlas",
    title: "کلینیکا خۆ ئامادە بکە. هەر شوێنێ کارێ جودایە.",
    intro: "هەژمارا Atlas یا تەیە. شوێنێ کارێ کلینیکێ جودا دهێتە دروستکرن و دەستهەلاتا کلینیکا کەسەکێ دی نادەت.",
    ownTitle: "شوێنێ کارێ تایبەت یێ کلینیکێ دروست بکە",
    ownHelp: "تەنێ بۆ کلینیکەکا تو خودانێ وێ یان نوینەرێ ڕێپێدای یێ وێ بی. ئەڤە شوێنێ کارێ تایبەت دروست دکەت، نە پڕۆفایلەکا پشتڕاستکری یان گشتی.",
    clinicName: "ناڤێ کلینیکێ",
    nameHelp: "تەنێ ب ڕەزامەندیا کلینیکێ ناڤێ ڕاستەقینە بنڤیسە. دروستکرنا شوێنێ کارێ خۆدانداریێ پشتڕاست ناکەت.",
    create: "شوێنێ کارێ تایبەت دروست بکە",
    inviteTitle: "دخوازێ بچیە کلینیکەکا هەی؟",
    inviteHelp: "ژ بەڕێڤەبەرێ کلینیکێ بانگهێشتەکا پاراستی بخوازە. چوونەژوور ب خۆ تۆ ناخەتە ناڤ کلینیکا کەسەکێ دی.",
    inviteStep: "لینکێ بانگهێشتا ئێکجارەیێ ژ بەڕێڤەبەرێ کلینیکێ ڤەکە. ئەڤە ژ دروستکرنا کلینیکەکا نوو جودایە.",
    account: "بەڕێڤەبرنا هەژمارا Atlas",
    roadTitle: "ژ دەستپێکێ تا دیتنا کلینیکێ ژ لایێ نەخۆشان",
    roadIntro: "کارێ کلینیکێ دشێت ب تایبەتی دەست پێ بکەت. پشکنینا داواکاریێ ل ڤێ رێکێ هێشتا بەردەست نینە.",
    stages: [
      { title: "شوێنێ کارێ تایبەت", detail: "کلینیکا خۆ دروست بکە و خشتەیا وادەیان ڕێک بخە.", ready: true },
      { title: "کارێ کلینیکێ", detail: "دکتۆر، دەم، بانگهێشتا ستاف و وادەیان ڕێک بخە.", ready: true },
      { title: "هنارتن بۆ پشتڕاستکرنێ", detail: "پەیوەندی، دەستهەلاتا کلینیکێ و بەڵگەیێن پیشەیی پێدڤی ب پشکنینا جودا هەنە.", ready: false },
      { title: "پێداچوون و بڵاوکرن", detail: "بەری بڵاوکرنا پشتڕاستکری، پەسەندکرنا Atlas پێدڤیە.", ready: false },
    ],
    available: "نوکە بەردەستە",
    planned: "هێشتا بەردەست نینە",
    warning: "ل ڤێرێ ناسنامە، مۆڵەتا پزیشکی یان بەڵگەیێن بازرگانی بار نەکە. Atlas هێشتا ڕێیا پاراستی یا داواکاریان نەڤەکرییە.",
  },
  ar: {
    eyebrow: "أول عيادة لك في Atlas",
    title: "جهّز عيادتك. كل مساحة عمل مستقلة.",
    intro: "حساب Atlas إلك وحدك. مساحة العيادة تنشأ بشكل منفصل، وما تعطيك صلاحية الدخول لعيادات الآخرين.",
    ownTitle: "أنشئ مساحة عيادة خاصة",
    ownHelp: "فقط لعيادة تملكها أو مخوّل رسمياً بتمثيلها. هذا ينشئ مساحة عمل خاصة، مو ملف عام أو إثبات اعتماد.",
    clinicName: "اسم العيادة",
    nameHelp: "استخدم اسم العيادة الحقيقي بموافقتها فقط. إنشاء مساحة العمل ما يثبت الملكية.",
    create: "إنشاء مساحة عمل خاصة",
    inviteTitle: "تريد تنضم لعيادة موجودة؟",
    inviteHelp: "اطلب دعوة آمنة من مسؤول العيادة. تسجيل الدخول وحده ما يضيفك لعيادة شخص آخر.",
    inviteStep: "افتح رابط الدعوة ذي الاستخدام الواحد اللي يرسله مسؤول العيادة. هذا يختلف عن إنشاء عيادة جديدة.",
    account: "إدارة حساب Atlas",
    roadTitle: "من البداية إلى ظهور العيادة للمرضى",
    roadIntro: "تقدر تبدأ شغل العيادة بخصوصية. تقديم طلب التحقق والمراجعة مو متاحين بعد بهذا المسار.",
    stages: [
      { title: "مساحة العمل الخاصة", detail: "أنشئ عيادتك وابدأ تنظيم المواعيد.", ready: true },
      { title: "تشغيل العيادة", detail: "جهّز الأطباء والساعات ودعوات الموظفين والحجوزات.", ready: true },
      { title: "تقديم طلب التحقق", detail: "يجب التحقق بشكل مستقل من التواصل وصلاحية الإدارة ومؤهلات الأطباء.", ready: false },
      { title: "المراجعة والنشر", detail: "يلزم نظام موافقة من Atlas قبل النشر المعتمد في السوق.", ready: false },
    ],
    available: "متاح حالياً",
    planned: "غير متاح بعد",
    warning: "لا ترفع هويتك أو إجازتك الطبية أو مستندات الشركة هنا. Atlas لم يفتح بعد قناة آمنة لاستلام طلبات المراجعة.",
  },
} as const;

export function ClinicFirstWorkspace({ locale, error }: { locale: UiLocale; error?: string | null }) {
  const t = copy[locale];
  const common = uiText(locale);
  return (
    <main className="atlas-first-clinic shell">
      <header className="atlas-first-clinic-header">
        <div className="app-brand setup-brand">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span>Atlas</span>
        </div>
        <Link href="/dashboard/settings/account" className="button button-ghost button-small">{t.account}</Link>
      </header>
      <div className="atlas-first-clinic-intro">
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </div>
      <div className="atlas-first-clinic-grid">
        <section className="atlas-first-clinic-primary" aria-labelledby="first-clinic-create-heading">
          <div className="atlas-first-clinic-step"><span aria-hidden="true">01</span>{t.available}</div>
          <h2 id="first-clinic-create-heading">{t.ownTitle}</h2>
          <p>{t.ownHelp}</p>
          {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
          <form action={createClinic} className="stack-form">
            <label htmlFor="name">{t.clinicName}</label>
            <ClinicSetupNameInput id="name" name="name" minLength={2} maxLength={120} autoComplete="organization" required />
            <small>{t.nameHelp}</small>
            <SubmitButton pendingLabel={common.saving}>{t.create}</SubmitButton>
          </form>
        </section>
        <aside className="atlas-first-clinic-join">
          <div className="atlas-first-clinic-step"><span aria-hidden="true">↗</span>{t.inviteTitle}</div>
          <p>{t.inviteHelp}</p>
          <div className="atlas-first-clinic-invite-instruction">{t.inviteStep}</div>
        </aside>
      </div>
      <section className="atlas-first-clinic-roadmap" aria-labelledby="first-clinic-roadmap-heading">
        <header>
          <h2 id="first-clinic-roadmap-heading">{t.roadTitle}</h2>
          <p>{t.roadIntro}</p>
        </header>
        <ol>
          {t.stages.map((stage, i) => (
            <li key={stage.title}>
              <span className="atlas-first-clinic-stage-number">{i + 1}</span>
              <div><strong>{stage.title}</strong><p>{stage.detail}</p><small>{stage.ready ? t.available : t.planned}</small></div>
            </li>
          ))}
        </ol>
        <p className="atlas-first-clinic-warning">{t.warning}</p>
      </section>
      <style>{`
        .atlas-first-clinic{max-width:1120px;min-height:100dvh;padding-block:28px 72px}
        .atlas-first-clinic-header{display:flex;justify-content:space-between;align-items:center;gap:18px}
        .atlas-first-clinic-header .setup-brand{margin:0}
        .atlas-first-clinic-intro{max-width:750px;margin:54px 0 28px}
        .atlas-first-clinic-intro h1{max-width:750px;font-size:clamp(32px,4vw,54px);line-height:1.08;letter-spacing:-.045em;margin:9px 0 17px}
        .atlas-first-clinic-intro p{max-width:690px;color:var(--ink-soft);font-size:clamp(15px,1.45vw,18px);line-height:1.65}
        .atlas-first-clinic-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(280px,1fr);gap:18px;align-items:stretch}
        .atlas-first-clinic-primary,.atlas-first-clinic-join{border:1px solid var(--line);border-radius:24px;padding:clamp(24px,3vw,40px);background:var(--surface);color:var(--ink);box-shadow:var(--shadow-sm)}
        .atlas-first-clinic-primary{border-color:var(--line-strong);box-shadow:var(--shadow-md)}
        .atlas-first-clinic-step{display:flex;gap:10px;align-items:center;color:var(--accent);font-size:12px;font-weight:850}
        .atlas-first-clinic-step span{display:grid;place-items:center;min-width:34px;min-height:34px;border-radius:10px;background:var(--accent-soft);font-variant-numeric:tabular-nums}
        .atlas-first-clinic-primary h2{margin:24px 0 12px;font-size:clamp(22px,2.4vw,29px);line-height:1.2;letter-spacing:-.025em}
        .atlas-first-clinic-primary>p,.atlas-first-clinic-join>p{color:var(--ink-soft);line-height:1.65;font-size:14px}
        .atlas-first-clinic-primary .stack-form{margin-top:30px}
        .atlas-first-clinic-primary .stack-form input{min-height:52px;font-size:16px}
        .atlas-first-clinic-primary .stack-form small{font-size:12px;line-height:1.5;color:var(--muted)}
        .atlas-first-clinic-primary .stack-form button{min-height:52px;font-weight:850}
        .atlas-first-clinic-join{background:var(--surface-soft)}
        .atlas-first-clinic-join>p{margin-top:24px}
        .atlas-first-clinic-invite-instruction{padding:19px;border-inline-start:4px solid var(--accent);border-radius:12px;background:var(--surface);color:var(--ink-soft);font-size:13px;line-height:1.65}
        .atlas-first-clinic-roadmap{margin-top:22px;padding:clamp(24px,3vw,36px);border:1px solid var(--line);border-radius:24px;background:var(--surface);color:var(--ink)}
        .atlas-first-clinic-roadmap h2{margin:0 0 8px;font-size:clamp(21px,2.5vw,27px);letter-spacing:-.025em}
        .atlas-first-clinic-roadmap header p{max-width:720px;color:var(--muted);font-size:14px;line-height:1.6}
        .atlas-first-clinic-roadmap ol{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:24px 0;padding:0;list-style:none}
        .atlas-first-clinic-roadmap li{display:flex;align-items:flex-start;gap:11px;border:1px solid var(--line);border-radius:16px;padding:17px 14px;background:var(--surface-soft)}
        .atlas-first-clinic-stage-number{display:grid;place-items:center;flex:0 0 30px;height:30px;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-weight:900;font-size:12px}
        .atlas-first-clinic-roadmap li:nth-child(n+3) .atlas-first-clinic-stage-number{background:var(--surface);border:1px solid var(--line-strong);color:var(--muted)}
        .atlas-first-clinic-roadmap li strong{display:block;font-size:13px;line-height:1.3}
        .atlas-first-clinic-roadmap li p{margin:8px 0;color:var(--ink-soft);font-size:12px;line-height:1.55}
        .atlas-first-clinic-roadmap li small{color:var(--accent);font-size:11px;font-weight:800}
        .atlas-first-clinic-roadmap li:nth-child(n+3) small{color:var(--muted)}
        .atlas-first-clinic-warning{margin:0;padding:14px 18px;border-radius:12px;background:var(--warning-bg);color:var(--warning);font-size:13px;line-height:1.6}
        @media(max-width:850px){.atlas-first-clinic-grid{grid-template-columns:1fr}.atlas-first-clinic-roadmap ol{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:540px){.atlas-first-clinic{padding-block:16px 42px}.atlas-first-clinic-header{align-items:flex-start}.atlas-first-clinic-header .button{max-width:180px;white-space:normal;text-align:center}.atlas-first-clinic-intro{margin:38px 0 24px}.atlas-first-clinic-grid{gap:12px}.atlas-first-clinic-primary,.atlas-first-clinic-join,.atlas-first-clinic-roadmap{border-radius:18px;padding:22px}.atlas-first-clinic-roadmap ol{grid-template-columns:1fr}.atlas-first-clinic-roadmap li{align-items:flex-start}}
      `}</style>
    </main>
  );
}
