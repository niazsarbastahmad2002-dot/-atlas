import Link from "next/link";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import "./clinical-preview.css";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ clinic?: string }> };

const copy: Record<UiLocale, {
  eyebrow: string; title: string; subtitle: string; preview: string; safety: string;
  back: string; overview: string; patient: string; noPatient: string; noPatientHelp: string;
  steps: string[]; note: string; noteHelp: string; complaint: string; history: string;
  background: string; exam: string; assessment: string; plan: string;
  vitals: string; documents: string; prescription: string; investigation: string;
  referral: string; summary: string; restricted: string; restrictedHelp: string;
  ai: string; aiHelp: string; unavailable: string; review: string;
}> = {
  en: {
    eyebrow: "ATLAS DOCTOR / CLINICAL WORKSPACE", title: "One calm place for every visit",
    subtitle: "A focused clinical workflow, designed around the doctor's next decision.",
    preview: "Design preview · no patient records or notes are loaded or saved",
    safety: "Clinical documentation will open only after practitioner verification, permissions, audit and retention controls are approved.",
    back: "Back to today's schedule", overview: "Visit flow", patient: "Patient context",
    noPatient: "No patient selected", noPatientHelp: "Verified patient identity and prior visits will appear here only for an authorized treating clinician.",
    steps: ["Confirm patient", "History", "Examination", "Assessment and plan", "Review and sign"],
    note: "Visit documentation", noteHelp: "A clear structure, without making every field mandatory.",
    complaint: "Chief complaint and HPI", history: "Medical history, allergies and medications",
    background: "Relevant background", exam: "Examination findings", assessment: "Diagnoses and clinical reasoning",
    plan: "Treatment, investigations, referrals and follow-up", vitals: "Vital signs", documents: "Clinical documents",
    prescription: "Prescription", investigation: "Investigation request", referral: "Referral", summary: "Visit summary",
    restricted: "Clinical history stays confidential", restrictedHelp: "Receptionist appointment access does not grant access to these notes.",
    ai: "Atlas AI assistance", aiHelp: "Optional drafting support only. The doctor must verify every fact and authorize the final record.",
    unavailable: "Unavailable until clinical security is approved", review: "Preview only — not for patient use",
  },
  ku: {
    eyebrow: "ATLAS DOCTOR / شوێنی کاری پزیشکی", title: "شوێنێکی ڕوون بۆ هەر سەردانێک",
    subtitle: "کاری پزیشکی بە شێوەیەکی سادە، بە پێی ئەو هەنگاوەی پزیشک پێویستی پێیەتی.",
    preview: "پێشبینینی دیزاین · هیچ تۆمار یان تێبینییەکی نەخۆش ناکرێتەوە و پاشەکەوت ناکرێت",
    safety: "تۆمارکردنی زانیاری پزیشکی تەنها دوای پشتڕاستکردنەوەی پزیشک، دەسەڵاتەکان و پاراستنی تۆمارەکان چالاک دەکرێت.",
    back: "گەڕانەوە بۆ خشتەی ئەمڕۆ", overview: "هەنگاوەکانی سەردان", patient: "زانیاری نەخۆش",
    noPatient: "هیچ نەخۆشێک هەڵنەبژێردراوە", noPatientHelp: "ناسنامە و سەردانە پێشووترەکان تەنها بۆ پزیشکی ڕێپێدراو دەردەکەون.",
    steps: ["دڵنیابوون لە نەخۆش", "مێژووی نەخۆشی", "پشکنین", "هەڵسەنگاندن و پلان", "پێداچوونەوە و واژۆ"],
    note: "تۆماری سەردان", noteHelp: "ڕێکخستنێکی ڕوون بەبێ پڕکردنەوەی خانەی ناپێویست.",
    complaint: "سکاڵای سەرەکی و مێژووی ئێستا", history: "مێژووی پزیشکی، هەستیاری و دەرمانەکان",
    background: "زانیاری پەیوەندیدار", exam: "ئەنجامی پشکنین", assessment: "دەستنیشانکردن و هۆکاری پزیشکی",
    plan: "چارەسەر، پشکنینەکان، ڕەوانەکردن و چاودێری", vitals: "نیشانە ژیانییەکان", documents: "بەڵگە پزیشکییەکان",
    prescription: "ڕەچەتە", investigation: "داواکاری پشکنین", referral: "ڕەوانەکردن", summary: "پوختەی سەردان",
    restricted: "مێژووی پزیشکی نهێنی دەمێنێتەوە", restrictedHelp: "دەستڕاگەیشتنی ڕیسێپشن بە وادەکان مافی بینینی تێبینی پزیشکی نادات.",
    ai: "یارمەتیی زیرەکی دەستکردی Atlas", aiHelp: "تەنها یارمەتیی ئارەزوومەندانە بۆ نووسین. پزیشک دەبێت هەموو زانیارییەکان بپشکنێت و پەسەندیان بکات.",
    unavailable: "تا پەسەندکردنی پاراستنی زانیاری پزیشکی ناچالاکە", review: "تەنها پێشبینینە ـ بۆ نەخۆشی ڕاستەقینە نییە",
  },
  bd: {
    eyebrow: "ATLAS DOCTOR / شوێنێ کارێ دکتۆری", title: "جهەکێ ڕوون بۆ هەر سەردانەکێ",
    subtitle: "کارێ دکتۆری ب شێوەیەکا سادە، ل دویڤ هەنگاڤا پێدڤی.",
    preview: "پێشنیشاندانا دیزاینێ · چ تۆمار یان تێبینیێن نەخۆشان ناهێن خواندن یان پاراستن",
    safety: "تۆمارکرنا زانیاریێن دکتۆری تەنێ پشتی پشتڕاستکرنا دکتۆری و دەستهەلات و پاراستنا تۆماران دێ چالاک بیت.",
    back: "زڤڕین بۆ خشتەیا ئەڤرۆ", overview: "هەنگاڤێن سەردانێ", patient: "زانیاریێن نەخۆشی",
    noPatient: "چ نەخۆش نەهاتیە هەلبژارتن", noPatientHelp: "ناسنامە و سەردانێن بەرێ تەنێ بۆ دکتۆرێ ڕێپێدای دێ دیار بن.",
    steps: ["پشتڕاستکرنا نەخۆشی", "مێژوو", "پشکنین", "هەڵسەنگاندن و پلان", "پێداچوون و واژۆ"],
    note: "تۆمارا سەردانێ", noteHelp: "ڕێکخستنەکا ڕوون بێ خانێن نەیێن پێدڤی.",
    complaint: "سکاڵایا سەرەکی و مێژووا نوکە", history: "مێژووا دکتۆری، هەستیاری و دەرمان",
    background: "زانیاریێن گرێدای", exam: "ئەنجامێن پشکنینێ", assessment: "دەستنیشانکرن و هۆکارێن دکتۆری",
    plan: "چارەسەر، پشکنین، ڕەوانەکرن و دووڤداچوون", vitals: "نیشانێن ژیانێ", documents: "بەڵگەیێن دکتۆری",
    prescription: "ڕەچەتە", investigation: "داخوازییا پشکنینێ", referral: "ڕەوانەکرن", summary: "پوختەیا سەردانێ",
    restricted: "مێژووا دکتۆری نهێنی دمینیت", restrictedHelp: "دەستهەلاتا ڕیسێپشنێ بۆ وادەیان مافێ دیتنا تێبینیێن دکتۆری نادەت.",
    ai: "هاریکاریا زیرەکییا دەستکردی Atlas", aiHelp: "تەنێ هاریکاری بۆ نووسینێ. دکتۆر دڤێت هەمی زانیاریان بپشکنیت و پەسەند بکەت.",
    unavailable: "تا پەسەندکرنا پاراستنا زانیاریێن دکتۆری ناچالاکە", review: "تەنێ پێشنیشاندانە ـ بۆ نەخۆشێ ڕاستەقینە نینە",
  },
  ar: {
    eyebrow: "ATLAS DOCTOR / مساحة الطبيب", title: "مكان واضح لكل زيارة",
    subtitle: "سير عمل سريري مرتب حول القرار التالي للطبيب، بدون ازدحام.",
    preview: "معاينة تصميم فقط · لا تُحمّل أو تُحفظ أي سجلات أو ملاحظات مرضى",
    safety: "التوثيق السريري لن يُفعّل قبل التحقق من الطبيب والصلاحيات والتدقيق وسياسة حفظ السجلات.",
    back: "الرجوع إلى جدول اليوم", overview: "خطوات الزيارة", patient: "سياق المريض",
    noPatient: "لم يُحدَّد مريض", noPatientHelp: "هوية المريض وزياراته السابقة تظهر فقط للطبيب المعالج المخوّل.",
    steps: ["تأكيد هوية المريض", "أخذ التاريخ", "الفحص", "التقييم والخطة", "المراجعة والتوقيع"],
    note: "توثيق الزيارة", noteHelp: "تنظيم واضح بدون فرض حقول غير ضرورية.",
    complaint: "الشكوى الرئيسية والقصة المرضية", history: "التاريخ المرضي والحساسية والأدوية",
    background: "الخلفية ذات الصلة", exam: "نتائج الفحص", assessment: "التشخيص والتفكير السريري",
    plan: "العلاج والفحوصات والإحالات والمتابعة", vitals: "العلامات الحيوية", documents: "المستندات الطبية",
    prescription: "وصفة طبية", investigation: "طلب فحوصات", referral: "إحالة", summary: "ملخص الزيارة",
    restricted: "التاريخ السريري يبقى سرياً", restrictedHelp: "الوصول إلى المواعيد لموظف الاستقبال لا يمنحه صلاحية قراءة الملاحظات الطبية.",
    ai: "مساعدة Atlas AI", aiHelp: "مساعدة اختيارية للصياغة فقط، والطبيب مسؤول عن التحقق من كل معلومة واعتماد السجل.",
    unavailable: "غير متاح حتى اعتماد ضوابط الأمن السريري", review: "معاينة فقط — ليست للاستخدام مع المرضى",
  },
};

const sections = ["complaint", "history", "exam", "assessment", "plan"] as const;

export default async function ClinicalVisitPreviewPage({ searchParams }: Props) {
  const locale = await getUiLocale();
  const t = copy[locale];
  const params = await searchParams;
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect("/login");

  const { data: clinics, error: clinicsError } = await supabase
    .from("clinics").select("id, name, owner_id").order("created_at", { ascending: true });
  if (clinicsError || !clinics?.length) redirect("/dashboard");
  const requested = params.clinic && isUuid(params.clinic) ? params.clinic : null;
  if (params.clinic && (!requested || !clinics.some((item) => item.id === requested))) redirect("/dashboard?error=clinic_unavailable");
  const clinic = clinics.find((item) => item.id === requested) ?? clinics[0];

  // This is a design-review route for clinic administrators, not clinical authorization.
  // Never load patients, appointments, visit data, or credential documents here.
  const { data: membership, error: membershipError } = await supabase
    .from("clinic_members").select("role").eq("clinic_id", clinic.id)
    .eq("user_id", auth.user.id).maybeSingle();
  if (membershipError && clinic.owner_id !== auth.user.id) redirect("/dashboard");
  const canReview = clinic.owner_id === auth.user.id || membership?.role === "owner" || membership?.role === "manager";
  if (!canReview) redirect("/dashboard");

  return (
    <main className="clinical-preview shell" dir={locale === "en" ? "ltr" : "rtl"}>
      <div className="clinical-preview-toolbar">
        <Link href={"/dashboard?clinic=" + encodeURIComponent(clinic.id)} className="clinical-preview-back">← {t.back}</Link>
        <span className="clinical-preview-mode" role="status">{t.preview}</span>
      </div>

      <header className="clinical-preview-hero">
        <div>
          <span className="clinical-preview-eyebrow">{t.eyebrow}</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
          <span className="clinical-preview-clinic" data-atlas-user-content="true">{clinic.name}</span>
        </div>
        <div className="clinical-preview-hero-mark" aria-hidden="true">A<span>+</span></div>
      </header>

      <div className="clinical-preview-frame">
        <aside className="clinical-preview-rail" aria-labelledby="clinical-flow-title">
          <div className="clinical-preview-rail-heading">
            <span className="clinical-preview-index">01—05</span>
            <h2 id="clinical-flow-title">{t.overview}</h2>
          </div>
          <ol className="clinical-preview-steps">
            {t.steps.map((step, index) => (
              <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></li>
            ))}
          </ol>
          <div className="clinical-preview-rail-note"><span aria-hidden="true">✦</span><strong>{t.ai}</strong><p>{t.aiHelp}</p></div>
        </aside>

        <section className="clinical-preview-document" aria-labelledby="clinical-note-title">
          <div className="clinical-preview-document-header">
            <div>
              <span className="clinical-preview-index">ATLAS / VISIT</span>
              <h2 id="clinical-note-title">{t.note}</h2>
              <p>{t.noteHelp}</p>
            </div>
            <span className="clinical-preview-review">{t.review}</span>
          </div>
          <div className="clinical-preview-note-grid">
            {sections.map((field) => (
              <section className={"clinical-preview-field clinical-preview-field-" + field} key={field}>
                <h3>{t[field]}</h3>
                <div className="clinical-preview-placeholder" aria-hidden="true"><i/><i/><i/></div>
              </section>
            ))}
          </div>
          <div className="clinical-preview-locked"><span aria-hidden="true">◈</span><p>{t.safety}</p></div>
        </section>

        <aside className="clinical-preview-context">
          <section className="clinical-preview-context-card clinical-preview-context-primary">
            <span className="clinical-preview-index">{t.patient}</span>
            <div className="clinical-preview-avatar" aria-hidden="true">+</div>
            <h2>{t.noPatient}</h2>
            <p>{t.noPatientHelp}</p>
          </section>
          <section className="clinical-preview-context-card">
            <h2>{t.vitals}</h2>
            <div className="clinical-preview-vitals" aria-hidden="true"><span>BP <b>—</b></span><span>HR <b>—</b></span><span>SpO₂ <b>—</b></span><span>T° <b>—</b></span></div>
          </section>
          <section className="clinical-preview-context-card">
            <h2>{t.documents}</h2>
            <div className="clinical-preview-doc-list">
              {[t.prescription, t.investigation, t.referral, t.summary].map(label => <span key={label}>{label}<span aria-hidden="true">↗</span></span>)}
            </div>
            <p className="clinical-preview-unavailable">{t.unavailable}</p>
          </section>
          <section className="clinical-preview-confidential"><strong>{t.restricted}</strong><p>{t.restrictedHelp}</p></section>
        </aside>
      </div>
    </main>
  );
}
