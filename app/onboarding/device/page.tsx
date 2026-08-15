import { redirect } from "next/navigation";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { DeviceSetup } from "./device-setup";

export const dynamic = "force-dynamic";

const copy: Record<UiLocale, { eyebrow: string; title: string; body: string }> = {
  en: {
    eyebrow: "One-time setup",
    title: "Make this device quick to open.",
    body: "Finish one secure device check. After that, Atlas opens the schedule directly whenever your normal session is still active.",
  },
  ku: {
    eyebrow: "ڕێکخستنی یەکجار",
    title: "کردنەوەی Atlas لەم ئامێرە خێرا بکە.",
    body: "یەک پشتڕاستکردنەوەی پارێزراوی ئامێر تەواو بکە. پاشان، تا سێشنەکەت چالاکە Atlas ڕاستەوخۆ خشتەی وادەکان دەکاتەوە.",
  },
  ar: {
    eyebrow: "إعداد لمرة واحدة",
    title: "اجعل فتح Atlas سريعاً على هذا الجهاز.",
    body: "أكمل تحققاً آمناً واحداً للجهاز. بعد ذلك يفتح Atlas جدول المواعيد مباشرة ما دامت جلستك العادية فعالة.",
  },
};

export default async function DeviceOnboardingPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  const locale = await getUiLocale();
  const t = copy[locale];

  return (
    <main className="center-page">
      <section className="auth-card device-setup-card">
        <div className="app-brand">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </div>
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{t.title}</h1>
        <p className="quiet">{t.body}</p>
        <DeviceSetup locale={locale} />
      </section>
    </main>
  );
}
