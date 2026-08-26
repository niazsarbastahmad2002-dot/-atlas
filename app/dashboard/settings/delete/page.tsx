import Link from "next/link";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/app/components/submit-button";
import { deleteClinic } from "./actions";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ clinic?: string; error?: string }> };

type Copy = {
  eyebrow: string;
  title: string;
  help: string;
  warningTitle: string;
  warning: string;
  confirm: string;
  placeholder: string;
  acknowledge: string;
  button: string;
  deleting: string;
  back: string;
  noClinics: string;
  invalid: string;
  ownerRequired: string;
  mismatch: string;
  confirmationRequired: string;
  failed: string;
};

const copyByLocale: Record<UiLocale, Copy> = {
  en: {
    eyebrow: "Clinic ownership",
    title: "Delete this clinic?",
    help: "This deletes only this clinic. Your Atlas account remains.",
    warningTitle: "Permanent and irreversible",
    warning: "This permanently deletes this clinic workspace and its appointments, staff access, doctors, reminders, patient links, Activity History, and connected clinic data. It cannot be recovered.",
    confirm: "Type the clinic name exactly to confirm",
    placeholder: "Clinic name",
    acknowledge: "I understand this clinic and its data will be permanently deleted.",
    button: "Permanently delete this clinic",
    deleting: "Deleting…",
    back: "Back to settings",
    noClinics: "You do not own this clinic or it no longer exists.",
    invalid: "Choose a valid clinic from Settings.",
    ownerRequired: "Only the clinic owner can delete this clinic.",
    mismatch: "The clinic name did not match exactly. Nothing was deleted.",
    confirmationRequired: "Confirm that you understand this clinic and its data will be permanently deleted. Nothing was deleted.",
    failed: "Atlas could not delete the clinic. Nothing was changed.",
  },
  ku: {
    eyebrow: "خاوەندارێتی کلینیک",
    title: "ئەم کلینیکە بسڕدرێتەوە؟",
    help: "تەنها ئەم کلینیکە دەسڕێتەوە. هەژماری Atlas ـەکەت دەمێنێتەوە.",
    warningTitle: "هەمیشەییە و ناگەڕێتەوە",
    warning: "ئەم کارە کارگەی ئەم کلینیکە و وادەکان و دەستگەیشتنی ستاف و پزیشکەکان و بیرخستنەوەکان و لینکەکانی نەخۆش و مێژووی چالاکی و هەموو داتای پەیوەست بە هەمیشەیی دەسڕێتەوە. ناتوانرێت بگەڕێندرێتەوە.",
    confirm: "ناوی کلینیکەکە بە تەواوی و وەک خۆی بنووسە بۆ پشتڕاستکردنەوە",
    placeholder: "ناوی کلینیک",
    acknowledge: "تێدەگەم کە ئەم کلینیکە و داتاکانی بە هەمیشەیی دەسڕێنەوە.",
    button: "ئەم کلینیکە بە هەمیشەیی بسڕەوە",
    deleting: "دەسڕدرێتەوە…",
    back: "گەڕانەوە بۆ ڕێکخستنەکان",
    noClinics: "خاوەنی ئەم کلینیکە نیت یان چیتر بوونی نییە.",
    invalid: "لە ڕێکخستنەکانەوە کلینیکێکی دروست هەڵبژێرە.",
    ownerRequired: "تەنها خاوەنی کلینیک دەتوانێت ئەم کلینیکە بسڕێتەوە.",
    mismatch: "ناوی کلینیک بە تەواوی یەکسان نەبوو. هیچ شتێک نەسڕایەوە.",
    confirmationRequired: "پشتڕاست بکەوە کە تێدەگەیت ئەم کلینیکە و داتاکانی بە هەمیشەیی دەسڕێنەوە. هیچ شتێک نەسڕایەوە.",
    failed: "Atlas نەیتوانی کلینیکەکە بسڕێتەوە. هیچ شتێک نەگۆڕا.",
  },
  bd: {
    eyebrow: "خاوەنداریا کلینیکێ",
    title: "ئەڤ کلینیکە بهێتە ژێبرن؟",
    help: "تەنێ ئەڤ کلینیکە دهێتە ژێبرن. هەژمارا Atlas یا تە دمینیت.",
    warningTitle: "بۆ هەردەمە و ناگەڕێتەڤە",
    warning: "ئەم کارە کارگەها کلینیکێ و وادە و دەستگەهشتنا ستافێ و دکتۆر و بیرخستنەوە و لینکێن نەخۆشان و مێژوویا چالاکی و هەمی داتایێن پەیوەندیدار بۆ هەردەم ژێ دبەت. ناگەڕێتەڤە.",
    confirm: "ناڤێ کلینیکێ وەک خۆی بنڤیسە بۆ پشتڕاستکرنێ",
    placeholder: "ناڤێ کلینیکێ",
    acknowledge: "دزانم ئەڤ کلینیکە و داتایێن وێ بۆ هەردەم دهێنە ژێبرن.",
    button: "ئەڤ کلینیکە بۆ هەردەم ژێ ببە",
    deleting: "دهێتە ژێبرن…",
    back: "ڤەگەڕە بۆ ڕێکخستنان",
    noClinics: "تو خاوەنێ ڤێ کلینیکێ نینی یان دیگر نینە.",
    invalid: "ژ ڕێکخستنان کلینیکەکا دروست هەلبژێرە.",
    ownerRequired: "تەنێ خاوەنێ کلینیکێ دشێت ئەڤ کلینیکە ژێ ببەت.",
    mismatch: "ناڤێ کلینیکێ وەک خۆی نەبوو. چ تشت نەهاتە ژێبرن.",
    confirmationRequired: "پشتڕاست بکە کو تو دزانی ئەڤ کلینیکە و داتایێن وێ بۆ هەردەم دهێنە ژێبرن. چ تشت نەهاتە ژێبرن.",
    failed: "Atlas نەشیا کلینیکێ ژێ ببەت. چ تشت نەهاتە گوهارتن.",
  },
  ar: {
    eyebrow: "ملكية العيادة",
    title: "حذف هذه العيادة؟",
    help: "هذا يحذف هذه العيادة فقط. حسابك في Atlas يبقى موجوداً.",
    warningTitle: "حذف نهائي ولا يمكن التراجع عنه",
    warning: "هذا يحذف مساحة عمل العيادة ومواعيدها وصلاحيات الموظفين والأطباء والتذكيرات وروابط المرضى وسجل النشاط وكل بيانات العيادة المرتبطة نهائياً. لا يمكن استرجاعها.",
    confirm: "اكتب اسم العيادة بالضبط للتأكيد",
    placeholder: "اسم العيادة",
    acknowledge: "أفهم أن هذه العيادة وبياناتها سيتم حذفها نهائياً.",
    button: "حذف هذه العيادة نهائياً",
    deleting: "جارٍ الحذف…",
    back: "الرجوع للإعدادات",
    noClinics: "أنت لا تملك هذه العيادة أو أنها لم تعد موجودة.",
    invalid: "اختر عيادة صحيحة من الإعدادات.",
    ownerRequired: "فقط مالك العيادة يقدر يحذف هذه العيادة.",
    mismatch: "اسم العيادة غير مطابق بالضبط. ما انحذف شيء.",
    confirmationRequired: "أكد أنك تفهم أن هذه العيادة وبياناتها سيتم حذفها نهائياً. ما انحذف شيء.",
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

  const clinicId = params.clinic && isUuid(params.clinic) ? params.clinic : null;
  if (!clinicId) redirect("/dashboard/settings");

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("id, name")
    .eq("id", clinicId)
    .eq("owner_id", userData.user.id)
    .maybeSingle();

  if (clinicError) redirect(`/dashboard/settings?clinic=${clinicId}`);

  const errorMessage = params.error === "invalid" ? copy.invalid
    : params.error === "owner_required" ? copy.ownerRequired
      : params.error === "name_mismatch" ? copy.mismatch
        : params.error === "confirmation_required" ? copy.confirmationRequired
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
        <Link className="button button-ghost button-small" href={`/dashboard/settings?clinic=${clinicId}`}>{copy.back}</Link>
      </header>

      {errorMessage ? <p className="notice notice-error" role="alert">{errorMessage}</p> : null}

      {!clinic ? (
        <section className="settings-card"><p>{copy.noClinics}</p></section>
      ) : (
        <section className="settings-card settings-card-wide">
          <div className="settings-card-heading">
            <span className="settings-card-icon" aria-hidden="true">!</span>
            <div>
              <div className="eyebrow">{copy.eyebrow}</div>
              <h2>{clinic.name}</h2>
            </div>
          </div>

          <div className="notice notice-error" role="note">
            <strong>{copy.warningTitle}</strong>
            <p>{copy.warning}</p>
          </div>

          <form action={deleteClinic} className="settings-form">
            <input type="hidden" name="clinic_id" value={clinic.id} />
            <label htmlFor="clinic-delete-confirm">{copy.confirm}</label>
            <input id="clinic-delete-confirm" name="clinic_name_confirm" placeholder={copy.placeholder} autoComplete="off" required />
            <label className="checkbox-field">
              <input type="checkbox" name="acknowledge" value="yes" required />
              <span>{copy.acknowledge}</span>
            </label>
            <SubmitButton className="button danger-link" pendingLabel={copy.deleting}>{copy.button}</SubmitButton>
          </form>
        </section>
      )}
    </main>
  );
}
