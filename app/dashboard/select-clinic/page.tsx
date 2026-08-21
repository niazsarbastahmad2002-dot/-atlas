import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

const copy: Record<UiLocale, {
  eyebrow: string;
  title: string;
  help: string;
  open: string;
  account: string;
}> = {
  en: {
    eyebrow: "Clinic workspace",
    title: "Choose a clinic",
    help: "Your phone signs you into Atlas. Clinic access is separate and comes only from clinics you own or invitations you accepted.",
    open: "Open clinic",
    account: "Account settings",
  },
  ku: {
    eyebrow: "شوێنی کاری کلینیک",
    title: "کلینیکێک هەڵبژێرە",
    help: "ژمارەی مۆبایلەکەت تۆ دەخاتە ناو Atlas. دەسەڵاتی کلینیک جیاوازە و تەنها لە کلینیکی خۆت یان بانگهێشتێکی وەرگیراوەوە دێت.",
    open: "کلینیک بکەرەوە",
    account: "ڕێکخستنەکانی هەژمار",
  },
  bd: {
    eyebrow: "شوێنێ کارێ کلینیکێ",
    title: "کلینیکەکێ هەلبژێرە",
    help: "ژمارا موبایلا تە تۆ دئینیتە ناڤ Atlas. دەستهەلاتا کلینیکێ جودایە و تەنێ ژ کلینیکا خۆ یان بانگهێشتەکا وەرگرتی دهێت.",
    open: "کلینیکێ ڤەکە",
    account: "ڕێکخستنێن هەژمارێ",
  },
  ar: {
    eyebrow: "مساحة العيادة",
    title: "اختار عيادة",
    help: "رقم موبايلك يثبت هويتك في Atlas. صلاحية العيادة منفصلة، وتجي فقط من عيادة تملكها أو دعوة قبلتها.",
    open: "فتح العيادة",
    account: "إعدادات الحساب",
  },
};

export default async function SelectClinicPage() {
  const locale = await getUiLocale();
  const t = copy[locale];
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: clinics, error: clinicsError } = await supabase
    .from("clinics")
    .select("id, name")
    .order("created_at", { ascending: true });

  if (clinicsError) redirect("/dashboard");
  if (!clinics?.length) redirect("/dashboard");
  if (clinics.length === 1) redirect(`/dashboard?clinic=${clinics[0].id}`);

  return (
    <main className="center-page">
      <section className="auth-card setup-card">
        <div className="app-brand setup-brand">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span>Atlas</span>
        </div>
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{t.title}</h1>
        <p className="quiet">{t.help}</p>

        <div className="clinic-choice-list">
          {clinics.map((clinic) => (
            <Link className="clinic-choice" href={`/dashboard?clinic=${clinic.id}`} key={clinic.id}>
              <span>{clinic.name}</span>
              <strong>{t.open} →</strong>
            </Link>
          ))}
        </div>

        <Link className="button button-ghost" href="/dashboard/settings/account">{t.account}</Link>
      </section>

      <style>{`
        .clinic-choice-list{display:grid;gap:10px;margin:18px 0}.clinic-choice{display:flex;min-height:58px;align-items:center;justify-content:space-between;gap:16px;border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:var(--surface);color:var(--ink);text-decoration:none;box-shadow:var(--shadow-sm)}.clinic-choice:hover{border-color:var(--line-strong);background:var(--surface-soft)}.clinic-choice span{min-width:0;font-weight:800;overflow-wrap:anywhere}.clinic-choice strong{flex:none;color:var(--accent);font-size:12px}
      `}</style>
    </main>
  );
}
