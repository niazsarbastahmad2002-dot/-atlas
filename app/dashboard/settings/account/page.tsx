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
  eyebrow: string;
  title: string;
  intro: string;
  warning: string;
  membership: string;
  ownerBlock: string;
  ownerTransfer: string;
  ownerDelete: string;
  confirm: string;
  acknowledge: string;
  button: string;
  deleting: string;
  back: string;
  confirmationError: string;
  failed: string;
  phonePending: string;
};

const copyByLocale: Record<UiLocale, Copy> = {
  en: {
    eyebrow: "Your Atlas account",
    title: "Delete my account",
    intro: "You can permanently delete your Atlas sign-in from inside Atlas.",
    warning: "This permanently removes your Atlas identity, active sessions, saved passkeys and clinic memberships. This cannot be undone.",
    membership: "Clinic appointment records are controlled by the clinic. Historical audit entries may remain without your account identity where record integrity requires it.",
    ownerBlock: "You still own a clinic. Transfer administration or permanently delete every clinic you own before deleting your Atlas account.",
    ownerTransfer: "Transfer administration",
    ownerDelete: "Delete this clinic",
    confirm: "Type DELETE to confirm",
    acknowledge: "I understand that my Atlas account will be permanently deleted.",
    button: "Permanently delete my account",
    deleting: "Deleting account…",
    back: "Back to settings",
    confirmationError: "Type DELETE and confirm the checkbox. Nothing was deleted.",
    failed: "Atlas could not delete your account. Nothing was changed.",
    phonePending: "Phone not verified yet",
  },
  ku: {
    eyebrow: "هەژماری Atlas ـی تۆ",
    title: "سڕینەوەی هەژمارەکەم",
    intro: "دەتوانیت لە ناو Atlas هەژماری چوونەژوورەوەت بە هەمیشەیی بسڕیتەوە.",
    warning: "ئەم کارە ناسنامەی Atlas، سێشنە چالاکەکان، پاسکییە هەڵگیراوەکان و ئەندامێتی کلینیکەکانت بە هەمیشەیی دەسڕێتەوە. ناگەڕێتەوە.",
    membership: "تۆمارەکانی مەوعیدی کلینیک لەلایەن کلینیکەوە بەڕێوەدەبرێن. بۆ پاراستنی دروستی تۆمار، هەندێک تۆماری مێژوویی لەوانەیە بەبێ ناسنامەی هەژمارەکەت بمێننەوە.",
    ownerBlock: "هێشتا خاوەنی کلینیکێکیت. پێش سڕینەوەی هەژماری Atlas، بەڕێوەبردن بگوازەوە یان هەموو کلینیکە خاوەندارەکانت بە هەمیشەیی بسڕەوە.",
    ownerTransfer: "گواستنەوەی بەڕێوەبردن",
    ownerDelete: "سڕینەوەی ئەم کلینیکە",
    confirm: "DELETE بنووسە بۆ پشتڕاستکردنەوە",
    acknowledge: "تێدەگەم کە هەژماری Atlas ـەکەم بە هەمیشەیی دەسڕێتەوە.",
    button: "هەژمارەکەم بە هەمیشەیی بسڕەوە",
    deleting: "هەژمار دەسڕدرێتەوە…",
    back: "گەڕانەوە بۆ ڕێکخستنەکان",
    confirmationError: "DELETE بنووسە و خانەکە پشتڕاست بکەوە. هیچ شتێک نەسڕایەوە.",
    failed: "Atlas نەیتوانی هەژمارەکەت بسڕێتەوە. هیچ شتێک نەگۆڕا.",
    phonePending: "ژمارەی مۆبایل هێشتا پشتڕاست نەکراوەتەوە",
  },
  bd: {
    eyebrow: "هەژمارا Atlas یا تە",
    title: "ژێبرنا هەژمارا من",
    intro: "تو دشێی ژ ناڤ Atlas هەژمارا چوونەژوورا خۆ بۆ هەردەم ژێ ببەی.",
    warning: "ئەم کارە ناسناما Atlas، سێشنێن چالاک، پاسکییێن پاراستی و ئەندامەتیا کلینیکان بۆ هەردەم ژێ دبەت. ناگەڕێتەڤە.",
    membership: "تۆمارێن مەوعیدێ کلینیکێ ژ لایێ کلینیکێ ڤە دهێنە بەڕێڤەبرن. بۆ پاراستنا دروستیا تۆماران، هەندەک تۆمارێن مێژوویی دکارن بێ ناسناما هەژمارا تە بمینن.",
    ownerBlock: "هێشتا تو خاوەنێ کلینیکەکێی. بەری ژێبرنا هەژمارا Atlas، بەڕێڤەبرنێ بگوهێزە یان هەمی کلینیکێن خۆ بۆ هەردەم ژێ ببە.",
    ownerTransfer: "گوهەستنا بەڕێڤەبرنێ",
    ownerDelete: "ژێبرنا ڤێ کلینیکێ",
    confirm: "DELETE بنڤیسە بۆ پشتڕاستکرنێ",
    acknowledge: "دزانم هەژمارا Atlas یا من بۆ هەردەم دهێتە ژێبرن.",
    button: "هەژمارا من بۆ هەردەم ژێ ببە",
    deleting: "هەژمار دهێتە ژێبرن…",
    back: "ڤەگەڕە بۆ ڕێکخستنان",
    confirmationError: "DELETE بنڤیسە و خانەکێ پشتڕاست بکە. چ تشت نەهاتە ژێبرن.",
    failed: "Atlas نەشیا هەژمارا تە ژێ ببەت. چ تشت نەهاتە گوهارتن.",
    phonePending: "ژمارا موبایلێ هێشتا نەهاتییە پشتڕاستکرن",
  },
  ar: {
    eyebrow: "حسابك في Atlas",
    title: "حذف حسابي",
    intro: "تقدر تحذف تسجيل دخولك وحسابك في Atlas نهائياً من داخل Atlas.",
    warning: "هذا يحذف هوية Atlas والجلسات الحالية ومفاتيح الدخول المحفوظة وعضويات العيادات نهائياً. ما تقدر ترجع الحساب بعد الحذف.",
    membership: "سجلات مواعيد العيادة تديرها العيادة. بعض سجلات التدقيق التاريخية قد تبقى بدون هوية حسابك إذا كان هذا مطلوباً للحفاظ على سلامة السجل.",
    ownerBlock: "أنت ما زلت مالك عيادة. انقل الإدارة أو احذف كل عيادة تملكها نهائياً قبل حذف حساب Atlas.",
    ownerTransfer: "نقل إدارة العيادة",
    ownerDelete: "حذف هذه العيادة",
    confirm: "اكتب DELETE للتأكيد",
    acknowledge: "أفهم أن حسابي في Atlas سيتم حذفه نهائياً.",
    button: "حذف حسابي نهائياً",
    deleting: "جارٍ حذف الحساب…",
    back: "الرجوع للإعدادات",
    confirmationError: "اكتب DELETE وفعّل مربع التأكيد. ما انحذف شيء.",
    failed: "Atlas ما قدر يحذف حسابك. ما تغير شيء.",
    phonePending: "رقم الهاتف غير موثق بعد",
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
    : params.error === "owns_clinic" ? copy.ownerBlock
      : params.error === "failed" ? copy.failed
        : null;

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
            <h2 dir="ltr">{userData.user.phone ?? copy.phonePending}</h2>
            <p>{copy.warning}</p>
          </div>
        </div>
        <p className="field-help">{copy.membership}</p>

        {ownedClinics?.length ? (
          <div className="notice notice-error" role="status">
            <strong>{copy.ownerBlock}</strong>
            <div className="settings-form">
              {ownedClinics.map((clinic) => (
                <div className="account-owned-clinic" key={clinic.id}>
                  <strong>{clinic.name}</strong>
                  <div className="compact-actions">
                    <Link className="button button-ghost button-small" href={`/dashboard/staff?clinic=${clinic.id}`}>{copy.ownerTransfer}</Link>
                    <Link className="button button-ghost button-small danger-link" href={`/dashboard/settings/delete?clinic=${clinic.id}`}>{copy.ownerDelete}</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form action={deleteAtlasAccount} className="settings-form">
            <label htmlFor="delete-account-confirmation">{copy.confirm}</label>
            <input id="delete-account-confirmation" name="confirmation" placeholder="DELETE" autoComplete="off" spellCheck={false} required dir="ltr" />
            <label className="checkbox-field">
              <input type="checkbox" name="acknowledge" value="yes" required />
              <span>{copy.acknowledge}</span>
            </label>
            <SubmitButton className="button danger-link" pendingLabel={copy.deleting}>{copy.button}</SubmitButton>
          </form>
        )}
      </section>

      <style>{`.account-owned-clinic{display:grid;gap:8px;border-top:1px solid var(--line);padding-top:10px}.account-owned-clinic:first-child{border-top:0;padding-top:0}`}</style>
    </main>
  );
}
