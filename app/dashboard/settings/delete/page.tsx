import Link from "next/link";
import { redirect } from "next/navigation";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/app/components/submit-button";
import { deleteClinic } from "./actions";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ error?: string }> };

type Copy = {
  eyebrow: string;
  title: string;
  help: string;
  warning: string;
  confirm: string;
  placeholder: string;
  button: string;
  deleting: string;
  back: string;
  noClinics: string;
  invalid: string;
  ownerRequired: string;
  mismatch: string;
  failed: string;
};

const copyByLocale: Record<UiLocale, Copy> = {
  en: {
    eyebrow: "Clinic ownership",
    title: "Delete a clinic",
    help: "Only the clinic owner can permanently delete a clinic.",
    warning: "This permanently removes the clinic workspace and its appointments, staff, doctors, reminders, patient links, and connected clinic data. This cannot be undone.",
    confirm: "Type the clinic name exactly to confirm",
    placeholder: "Clinic name",
    button: "Permanently delete clinic",
    deleting: "Deleting…",
    back: "Back to settings",
    noClinics: "You do not own a clinic that can be deleted.",
    invalid: "Choose a valid clinic.",
    ownerRequired: "Only the clinic owner can delete this clinic.",
    mismatch: "The clinic name did not match. Nothing was deleted.",
    failed: "Atlas could not delete the clinic. Nothing was changed.",
  },
  ku: {
    eyebrow: "خاوەندارێتی کلینیک",
    title: "سڕینەوەی کلینیک",
    help: "تەنها خاوەنی کلینیک دەتوانێت کلینیک بە هەمیشەیی بسڕێتەوە.",
    warning: "ئەم کارە کلینیک و وادەکان و ستاف و پزیشکەکان و بیرخستنەوەکان و لینکەکانی نەخۆش و داتای پەیوەست بە هەمیشەیی دەسڕێتەوە. ناتوانرێت بگەڕێندرێتەوە.",
    confirm: "ناوی کلینیکەکە بە تەواوی بنووسە بۆ پشتڕاستکردنەوە",
    placeholder: "ناوی کلینیک",
    button: "کلینیک بە هەمیشەیی بسڕەوە",
    deleting: "دەسڕدرێتەوە…",
    back: "گەڕانەوە بۆ ڕێکخستنەکان",
    noClinics: "هیچ کلینیکێکت نییە کە خاوەنی بیت و بتوانیت بیسڕیتەوە.",
    invalid: "کلینیکێکی دروست هەڵبژێرە.",
    ownerRequired: "تەنها خاوەنی کلینیک دەتوانێت ئەم کلینیکە بسڕێتەوە.",
    mismatch: "ناوی کلینیک یەکسان نەبوو. هیچ شتێک نەسڕایەوە.",
    failed: "Atlas نەیتوانی کلینیکەکە بسڕێتەوە. هیچ شتێک نەگۆڕا.",
  },
  bd: {
    eyebrow: "خاوەنداریا کلینیکێ",
    title: "ژێبرنا کلینیکێ",
    help: "تەنێ خاوەنێ کلینیکێ دشێت کلینیکێ بۆ هەردەم ژێ ببەت.",
    warning: "ئەم کارە کلینیک و وادە و ستاف و دکتۆر و بیرخستنەوە و لینکێن نەخۆشان و داتایێن پەیوەندیدار بۆ هەردەم ژێ دبەت. ناگەڕێتەڤە.",
    confirm: "ناڤێ کلینیکێ وەک خۆی بنڤیسە بۆ پشتڕاستکرنێ",
    placeholder: "ناڤێ کلینیکێ",
    button: "کلینیکێ بۆ هەردەم ژێ ببە",
    deleting: "دهێتە ژێبرن…",
    back: "ڤەگەڕە بۆ ڕێکخستنان",
    noClinics: "تو خاوەنێ چ کلینیکەکێ نینی کو بتوانی ژێ ببەی.",
    invalid: "کلینیکەکا دروست هەلبژێرە.",
    ownerRequired: "تەنێ خاوەنێ کلینیکێ دشێت ئەڤ کلینیکە ژێ ببەت.",
    mismatch: "ناڤێ کلینیکێ وەک یەک نەبوو. چ تشت نەهاتە ژێبرن.",
    failed: "Atlas نەشیا کلینیکێ ژێ ببەت. چ تشت نەهاتە گوهارتن.",
  },
  ar: {
    eyebrow: "ملكية العيادة",
    title: "حذف عيادة",
    help: "فقط مالك العيادة يقدر يحذفها نهائياً.",
    warning: "هذا يحذف مساحة العيادة والمواعيد والموظفين والأطباء والتذكيرات وروابط المرضى والبيانات المرتبطة نهائياً. ما تقدر ترجعها بعد الحذف.",
    confirm: "اكتب اسم العيادة بالضبط للتأكيد",
    placeholder: "اسم العيادة",
    button: "حذف العيادة نهائياً",
    deleting: "جارٍ الحذف…",
    back: "الرجوع للإعدادات",
    noClinics: "ما عندك عيادة تملكها وتقدر تحذفها.",
    invalid: "اختر عيادة صحيحة.",
    ownerRequired: "فقط مالك العيادة يقدر يحذف هذه العيادة.",
    mismatch: "اسم العيادة غير مطابق. ما انحذف شيء.",
    failed: "Atlas ما قدر يحذف العيادة. ما تغير شيء.",
  },
};

export default async function DeleteClinicPage({ searchParams }: Props) {
  const params = await searchParams;
  const locale = await getUiLocale();
  const copy = copyByLocale[locale];
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: clinics, error: clinicsError } = await supabase
    .from("clinics")
    .select("id, name")
    .eq("owner_id", userData.user.id)
    .order("created_at", { ascending: true });

  if (clinicsError) redirect("/dashboard/settings");

  const errorMessage = params.error === "invalid" ? copy.invalid
    : params.error === "owner_required" ? copy.ownerRequired
      : params.error === "name_mismatch" ? copy.mismatch
        : params.error === "failed" ? copy.failed
          : null;

  return (
    <main className="settings-page shell">
      <header className="page-heading settings-heading">
        <div>
          <div className="eyebrow">{copy.eyebrow}</div>
          <h1>{copy.title}</h1>
          <p>{copy.help}</p>
        </div>
        <Link className="button button-ghost button-small" href="/dashboard/settings">{copy.back}</Link>
      </header>

      {errorMessage ? <p className="notice notice-error" role="alert">{errorMessage}</p> : null}

      {!clinics?.length ? (
        <section className="settings-card"><p>{copy.noClinics}</p></section>
      ) : (
        <div className="settings-grid">
          {clinics.map((clinic) => (
            <section className="settings-card" key={clinic.id}>
              <div className="settings-card-heading">
                <span className="settings-card-icon" aria-hidden="true">!</span>
                <div>
                  <div className="eyebrow">{copy.eyebrow}</div>
                  <h2>{clinic.name}</h2>
                  <p>{copy.warning}</p>
                </div>
              </div>
              <form action={deleteClinic} className="settings-form">
                <input type="hidden" name="clinic_id" value={clinic.id} />
                <label htmlFor={`confirm-${clinic.id}`}>{copy.confirm}</label>
                <input
                  id={`confirm-${clinic.id}`}
                  name="clinic_name_confirm"
                  placeholder={copy.placeholder}
                  autoComplete="off"
                  required
                />
                <SubmitButton className="button danger-link" pendingLabel={copy.deleting}>{copy.button}</SubmitButton>
              </form>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
