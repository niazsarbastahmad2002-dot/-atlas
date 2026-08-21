import Link from "next/link";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/app/components/submit-button";
import type { UiLocale } from "@/lib/i18n/ui";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { createClient } from "@/lib/supabase/server";
import { deleteAtlasAccount } from "./actions";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ error?: string }> };

type Copy = {
  eyebrow: string; title: string; intro: string; warning: string; clinicWarning: string;
  membership: string; confirm: string; acknowledge: string; button: string; deleting: string;
  back: string; confirmationError: string; failed: string; phonePending: string; owned: string;
};

const copyByLocale: Record<UiLocale, Copy> = {
  en: {
    eyebrow: "Your Atlas account",
    title: "Delete Atlas account permanently",
    intro: "This is a true account deletion — not just sign-out and not just deleting one clinic.",
    warning: "Atlas permanently deletes this identity, active sessions, saved passkeys and clinic memberships. The next time this phone verifies through WhatsApp, Atlas treats it as a brand-new account.",
    clinicWarning: "Any clinic you own is permanently deleted with the account, including its operational data. This cannot be undone.",
    membership: "Historical audit records may retain de-identified integrity data where required, but this Atlas login identity is removed.",
    confirm: "Type DELETE to confirm",
    acknowledge: "I understand that my Atlas account and every clinic I own will be permanently deleted.",
    button: "Delete my Atlas account permanently",
    deleting: "Deleting account…",
    back: "Back to settings",
    confirmationError: "Type DELETE and confirm the checkbox. Nothing was deleted.",
    failed: "Atlas could not complete account deletion. Try again.",
    phonePending: "Phone identity",
    owned: "Clinics that will also be deleted",
  },
  ku: {
    eyebrow: "هەژماری Atlas ـی تۆ",
    title: "هەژماری Atlas بە هەمیشەیی بسڕەوە",
    intro: "ئەمە سڕینەوەی ڕاستەقینەی هەژمارە؛ نە تەنها چوونەدەرەوە و نە تەنها سڕینەوەی یەک کلینیک.",
    warning: "Atlas ناسنامەکەت، سێشنەکان، passkey و ئەندامێتی کلینیکەکان بە هەمیشەیی دەسڕێتەوە. داهاتوو کە هەمان ژمارە لە WhatsApp پشتڕاست دەکرێتەوە، وەک هەژمارێکی تەواو نوێ مامەڵەی لەگەڵ دەکرێت.",
    clinicWarning: "هەر کلینیکێک کە خاوەنی بێت لەگەڵ هەژمارەکە بە هەمیشەیی دەسڕێتەوە، لەگەڵ داتای کارکردنی. ناگەڕێتەوە.",
    membership: "هەندێک تۆماری مێژوویی لەوانەیە بۆ دروستی تۆمار بەبێ ناسنامە بمێنێتەوە، بەڵام ناسنامەی چوونەژوورەوەی Atlas دەسڕێتەوە.",
    confirm: "DELETE بنووسە بۆ پشتڕاستکردنەوە",
    acknowledge: "تێدەگەم کە هەژماری Atlas و هەموو کلینیکەکانی خاوەندارێتیم بە هەمیشەیی دەسڕێنەوە.",
    button: "هەژماری Atlas ـەکەم بە هەمیشەیی بسڕەوە",
    deleting: "هەژمار دەسڕدرێتەوە…",
    back: "گەڕانەوە بۆ ڕێکخستنەکان",
    confirmationError: "DELETE بنووسە و خانەکە پشتڕاست بکەوە. هیچ شتێک نەسڕایەوە.",
    failed: "Atlas نەیتوانی سڕینەوەی هەژمار تەواو بکات. دووبارە هەوڵ بدە.",
    phonePending: "ناسنامەی مۆبایل",
    owned: "کلینیکەکانی کە هەروەها دەسڕێنەوە",
  },
  bd: {
    eyebrow: "هەژمارا Atlas یا تە",
    title: "هەژمارا Atlas بۆ هەردەم ژێ ببە",
    intro: "ئەڤە ژێبرنا ڕاستەقینا هەژمارێیە؛ نە تەنێ دەرکەفتن و نە تەنێ ژێبرنا کلینیکەکێ.",
    warning: "Atlas ناسناما تە، سێشن، passkey و ئەندامەتیێن کلینیکان بۆ هەردەم ژێ دبەت. پشتی هندێ هەمان ژمارە ل WhatsApp بهێتە پشتڕاستکرن، وەک هەژمارەکا تەمام نوو دهێتە دیتن.",
    clinicWarning: "هەر کلینیکەکا تو خاوەن بیت لگەل هەژمارێ بۆ هەردەم دهێتە ژێبرن، لگەل داتای کاری. ناگەڕێتەڤە.",
    membership: "هەندەک تۆمارێن مێژوویی دکارن بێ ناسنامە بمینن بۆ دروستیا تۆمارێ، لێ ناسناما چوونەژوورا Atlas دهێتە ژێبرن.",
    confirm: "DELETE بنڤیسە بۆ پشتڕاستکرنێ",
    acknowledge: "دزانم هەژمارا Atlas و هەمی کلینیکێن من بۆ هەردەم دهێنە ژێبرن.",
    button: "هەژمارا Atlas یا من بۆ هەردەم ژێ ببە",
    deleting: "هەژمار دهێتە ژێبرن…",
    back: "ڤەگەڕە بۆ ڕێکخستنان",
    confirmationError: "DELETE بنڤیسە و خانەکێ پشتڕاست بکە. چ تشت نەهاتە ژێبرن.",
    failed: "Atlas نەشیا ژێبرنا هەژمارێ تەمام بکەت. دیسان هەول بدە.",
    phonePending: "ناسناما موبایلێ",
    owned: "کلینیکێن کو ژێ دهێنە برن",
  },
  ar: {
    eyebrow: "حسابك في Atlas",
    title: "حذف حساب Atlas نهائياً",
    intro: "هذا حذف حقيقي للحساب — مو مجرد تسجيل خروج ومو مجرد حذف عيادة واحدة.",
    warning: "Atlas يحذف الهوية والجلسات ومفاتيح الدخول وعضويات العيادات نهائياً. إذا وثّقت نفس الرقم عبر واتساب لاحقاً، Atlas يعامله كحساب جديد بالكامل.",
    clinicWarning: "أي عيادة أنت مالكها تُحذف نهائياً مع الحساب، مع بياناتها التشغيلية. ما تقدر تتراجع بعد الحذف.",
    membership: "قد تبقى بعض سجلات التدقيق التاريخية بدون هويتك للحفاظ على سلامة السجل، لكن هوية تسجيل الدخول نفسها تُحذف.",
    confirm: "اكتب DELETE للتأكيد",
    acknowledge: "أفهم أن حساب Atlas وكل عيادة أملكها سيتم حذفها نهائياً.",
    button: "حذف حساب Atlas نهائياً",
    deleting: "جارٍ حذف الحساب…",
    back: "الرجوع للإعدادات",
    confirmationError: "اكتب DELETE وفعّل مربع التأكيد. ما انحذف شيء.",
    failed: "Atlas ما قدر يكمل حذف الحساب. حاول مرة ثانية.",
    phonePending: "هوية الهاتف",
    owned: "العيادات التي سيتم حذفها أيضاً",
  },
};

export default async function AccountSettingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const locale = await getUiLocale();
  const copy = copyByLocale[locale];
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: ownedClinics, error: clinicsError } = await supabase
    .from("clinics")
    .select("id, name")
    .eq("owner_id", userData.user.id)
    .order("created_at", { ascending: true });
  if (clinicsError) redirect("/dashboard/settings");

  const errorMessage = params.error === "confirmation" ? copy.confirmationError
    : params.error === "failed" ? copy.failed
      : null;
  const phone = userData.user.phone || String(userData.user.user_metadata?.atlas_phone ?? "") || copy.phonePending;

  return (
    <main className="settings-page shell">
      <header className="page-heading settings-heading">
        <div>
          <div className="eyebrow">{copy.eyebrow}</div>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>
        <Link className="button button-ghost button-small" href="/dashboard/settings">{copy.back}</Link>
      </header>

      {errorMessage ? <p className="notice notice-error" role="alert">{errorMessage}</p> : null}

      <section className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-card-icon" aria-hidden="true">!</span>
          <div>
            <div className="eyebrow">{copy.eyebrow}</div>
            <h2 dir="ltr">{phone}</h2>
            <p>{copy.warning}</p>
          </div>
        </div>
        <p className="notice notice-error" role="status">{copy.clinicWarning}</p>
        <p className="field-help">{copy.membership}</p>

        {ownedClinics?.length ? (
          <div className="settings-form">
            <strong>{copy.owned}</strong>
            {ownedClinics.map((clinic) => <div className="field-help" key={clinic.id}>{clinic.name}</div>)}
          </div>
        ) : null}

        <form action={deleteAtlasAccount} className="settings-form">
          <label htmlFor="delete-account-confirmation">{copy.confirm}</label>
          <input id="delete-account-confirmation" name="confirmation" placeholder="DELETE" autoComplete="off" spellCheck={false} required dir="ltr" />
          <label className="checkbox-field">
            <input type="checkbox" name="acknowledge" value="yes" required />
            <span>{copy.acknowledge}</span>
          </label>
          <SubmitButton className="button danger-link" pendingLabel={copy.deleting}>{copy.button}</SubmitButton>
        </form>
      </section>
    </main>
  );
}
