import Link from "next/link";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/app/components/submit-button";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { deleteAtlasAccount } from "./actions";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ error?: string }> };

type Copy = {
  eyebrow: string;
  title: string;
  help: string;
  warning: string;
  ownerWarning: string;
  confirm: string;
  button: string;
  deleting: string;
  back: string;
  mismatch: string;
  failed: string;
};

const copyByLocale: Record<UiLocale, Copy> = {
  en: {
    eyebrow: "Your Atlas account",
    title: "Delete my account",
    help: "You can permanently remove your Atlas account from inside Atlas.",
    warning: "This permanently removes your sign-in account and your clinic memberships. This cannot be undone.",
    ownerWarning: "You own one or more clinics. Deleting your account will also permanently delete every clinic you own, including appointments, doctors, staff access, reminders, patient links, and connected clinic data.",
    confirm: "Type your email address exactly to confirm",
    button: "Permanently delete my account",
    deleting: "Deleting account…",
    back: "Back to settings",
    mismatch: "The email address did not match. Nothing was deleted.",
    failed: "Atlas could not delete your account. Nothing was changed.",
  },
  ku: {
    eyebrow: "هەژماری Atlas ـەکەت",
    title: "سڕینەوەی هەژمارەکەم",
    help: "دەتوانیت هەژماری Atlas ـەکەت لە ناو Atlas بە هەمیشەیی بسڕیتەوە.",
    warning: "ئەم کارە هەژماری چوونەژوورەوە و ئەندامێتی کلینیکەکانت بە هەمیشەیی دەسڕێتەوە. ناتوانرێت بگەڕێندرێتەوە.",
    ownerWarning: "تۆ خاوەنی یەک یان زیاتر کلینیکیت. بە سڕینەوەی هەژمارەکەت، هەموو کلینیکە خاوەنداریکراوەکانت و مەوعید و دکتۆر و سکرتێر و بیرخستنەوە و لینکەکانی نەخۆش و داتای پەیوەستیش بە هەمیشەیی دەسڕدرێنەوە.",
    confirm: "ئیمەیڵەکەت بە تەواوی بنووسە بۆ پشتڕاستکردنەوە",
    button: "هەژمارەکەم بە هەمیشەیی بسڕەوە",
    deleting: "هەژمار دەسڕدرێتەوە…",
    back: "گەڕانەوە بۆ ڕێکخستنەکان",
    mismatch: "ئیمەیڵەکە یەکسان نەبوو. هیچ شتێک نەسڕایەوە.",
    failed: "Atlas نەیتوانی هەژمارەکەت بسڕێتەوە. هیچ شتێک نەگۆڕا.",
  },
  bd: {
    eyebrow: "هەژمارا Atlas یا تە",
    title: "هەژمارا خۆ ژێ ببەم",
    help: "تو دکاری هەژمارا Atlas یا خۆ ل ناڤ Atlas بۆ هەردەم ژێ ببەی.",
    warning: "ئەم کارە هەژمارا چوونەژوورێ و ئەندامبوونا کلینیکان بۆ هەردەم ژێ دبەت. ناگەڕێتەڤە.",
    ownerWarning: "تو خاوەنێ ئێک یان پتر کلینیکانی. ب ژێبرنا هەژمارا خۆ، هەمی کلینیکێن تە و مەوعید و دکتۆر و سکرتێر و بیرخستنەوە و لینکێن نەخۆشان و داتایێن پەیوەندیدار بۆ هەردەم ژێ دچن.",
    confirm: "ئیمەیلا خۆ وەک خۆی بنڤیسە بۆ پشتڕاستکرنێ",
    button: "هەژمارا خۆ بۆ هەردەم ژێ ببە",
    deleting: "هەژمار دهێتە ژێبرن…",
    back: "ڤەگەڕە بۆ ڕێکخستنان",
    mismatch: "ئیمەیل وەک یەک نەبوو. چ تشت نەهاتە ژێبرن.",
    failed: "Atlas نەشیا هەژمارا تە ژێ ببەت. چ تشت نەهاتە گوهارتن.",
  },
  ar: {
    eyebrow: "حسابك في Atlas",
    title: "حذف حسابي",
    help: "تقدر تحذف حساب Atlas نهائياً من داخل Atlas.",
    warning: "هذا يحذف حساب تسجيل الدخول وعضوياتك في العيادات نهائياً. ما تقدر ترجعه بعد الحذف.",
    ownerWarning: "أنت مالك عيادة أو أكثر. حذف حسابك راح يحذف نهائياً كل عيادة تملكها، مع المواعيد والأطباء والموظفين والتذكيرات وروابط المرضى والبيانات المرتبطة.",
    confirm: "اكتب بريدك الإلكتروني بالضبط للتأكيد",
    button: "حذف حسابي نهائياً",
    deleting: "جارٍ حذف الحساب…",
    back: "الرجوع للإعدادات",
    mismatch: "البريد الإلكتروني غير مطابق. ما انحذف شيء.",
    failed: "Atlas ما قدر يحذف حسابك. ما تغير شيء.",
  },
};

export default async function DeleteAccountPage({ searchParams }: Props) {
  const params = await searchParams;
  const locale = await getUiLocale();
  const copy = copyByLocale[locale];
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user) redirect("/login");

  const { count: ownedClinicCount, error: clinicsError } = await supabase
    .from("clinics")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);
  if (clinicsError) redirect("/dashboard/settings");

  const errorMessage = params.error === "email_mismatch" ? copy.mismatch
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

      <section className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-card-icon" aria-hidden="true">!</span>
          <div>
            <div className="eyebrow">{copy.eyebrow}</div>
            <h2 dir="ltr">{user.email ?? copy.title}</h2>
            <p>{copy.warning}</p>
            {ownedClinicCount ? <p className="notice notice-error">{copy.ownerWarning}</p> : null}
          </div>
        </div>

        <form action={deleteAtlasAccount} className="settings-form">
          <label htmlFor="email-confirm">{copy.confirm}</label>
          <input
            id="email-confirm"
            name="email_confirm"
            type="email"
            autoComplete="off"
            placeholder={user.email ?? "name@example.com"}
            dir="ltr"
            required
          />
          <SubmitButton className="button danger-link" pendingLabel={copy.deleting}>{copy.button}</SubmitButton>
        </form>
      </section>
    </main>
  );
}
