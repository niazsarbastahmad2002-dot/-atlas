import Link from "next/link";
import { redirect } from "next/navigation";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { PhoneChangeForm } from "../phone-change-form";

export const dynamic = "force-dynamic";

type Copy = {
  eyebrow: string;
  title: string;
  intro: string;
  back: string;
};

const copyByLocale: Record<UiLocale, Copy> = {
  en: {
    eyebrow: "Account",
    title: "Sign-in phone",
    intro: "Your verified phone is your Atlas login identity. Change it only when you are moving your Atlas account to a different phone number.",
    back: "Back to settings",
  },
  ku: {
    eyebrow: "هەژمار",
    title: "ژمارەی چوونەژوورەوە",
    intro: "ژمارەی پشتڕاستکراوت ناسنامەی چوونەژوورەوەی Atlas ـە. تەنها کاتێک بیگۆڕە کە دەتەوێت هەژمارەکەت بگوازیتە ژمارەیەکی تر.",
    back: "گەڕانەوە بۆ ڕێکخستنەکان",
  },
  bd: {
    eyebrow: "هەژمار",
    title: "ژمارا چوونەژوورێ",
    intro: "ژمارا پشتڕاستکری ناسناما چوونەژوورا Atlas یا تەیە. تەنێ دەمێ بگوهەرە کو تو دخوازیت هەژمارا خۆ بگوهێزیتە ژمارەکا دی.",
    back: "ڤەگەڕە بۆ ڕێکخستنان",
  },
  ar: {
    eyebrow: "الحساب",
    title: "رقم تسجيل الدخول",
    intro: "رقمك الموثق هو هوية تسجيل الدخول في Atlas. غيّره فقط إذا تريد نقل حساب Atlas إلى رقم هاتف مختلف.",
    back: "الرجوع إلى الإعدادات",
  },
};

export default async function SignInPhonePage() {
  const [locale, supabase] = await Promise.all([getUiLocale(), createClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/settings/phone");

  const copy = copyByLocale[locale];

  return (
    <main className="settings-page">
      <div className="shell">
        <div className="page-heading settings-heading">
          <div>
            <div className="eyebrow">{copy.eyebrow}</div>
            <h1>{copy.title}</h1>
            <p>{copy.intro}</p>
          </div>
          <Link className="button button-ghost button-small" href="/dashboard/settings">{copy.back}</Link>
        </div>

        <section className="settings-card" style={{ maxWidth: 720, marginInline: "auto" }}>
          <PhoneChangeForm locale={locale} currentPhone={user.phone ?? null} />
        </section>
      </div>
    </main>
  );
}
