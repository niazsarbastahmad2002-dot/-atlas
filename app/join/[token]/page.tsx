import { createHash } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { JoinClinicAuth } from "./join-auth";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ token: string }> };
type Preview = { clinic_id: string; clinic_name: string; doctor_name: string; expires_at: string };
type RpcResult = { data: unknown; error: { message?: string; code?: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => Promise<RpcResult>;

const copy: Record<UiLocale, { eyebrow: string; title: string; help: string; doctor: string; invalid: string; back: string }> = {
  en: {
    eyebrow: "Clinic invitation",
    title: "Join this clinic",
    help: "Verify your phone once. Atlas only connects this account to the clinic after this invitation is redeemed.",
    doctor: "You will work with",
    invalid: "This invitation is expired, already used, or no longer valid.",
    back: "Open Atlas",
  },
  ku: {
    eyebrow: "بانگهێشتی کلینیک",
    title: "بچۆ ناو ئەم کلینیکە",
    help: "تەنها جارێک ژمارەی مۆبایلەکەت پشتڕاست بکەرەوە. Atlas تەنها دوای وەرگرتنی ئەم بانگهێشتە هەژمارەکەت بە کلینیکەکەوە دەبەستێت.",
    doctor: "لەگەڵ ئەم دکتۆرە کار دەکەیت",
    invalid: "ئەم بانگهێشتە بەسەرچووە، پێشتر بەکارهاتووە یان چیتر دروست نییە.",
    back: "Atlas بکەرەوە",
  },
  bd: {
    eyebrow: "بانگهێشتا کلینیکێ",
    title: "بچۆ ناڤ ڤێ کلینیکێ",
    help: "تەنێ جارەکێ ژمارا موبایلا خۆ پشتڕاست بکە. Atlas تەنێ پشتی وەرگرتنا ڤێ بانگهێشتێ هەژمارا تە ب کلینیکێ ڤە گرێددەت.",
    doctor: "تو دێ دگەل ڤی دکتۆری کار کەی",
    invalid: "ئەڤ بانگهێشتە بەسەرچووە، پێشتر هاتییە بکارئینان یان ئیدی دروست نینە.",
    back: "Atlas ڤەکە",
  },
  ar: {
    eyebrow: "دعوة العيادة",
    title: "انضم إلى هذه العيادة",
    help: "وثّق رقم موبايلك مرة واحدة. Atlas لا يربط الحساب بالعيادة إلا بعد استخدام هذه الدعوة.",
    doctor: "ستعمل مع",
    invalid: "هذه الدعوة انتهت أو استُخدمت أو لم تعد صالحة.",
    back: "فتح Atlas",
  },
};

function validToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export default async function JoinClinicPage({ params }: PageProps) {
  const { token } = await params;
  const locale = await getUiLocale();
  const t = copy[locale];

  if (!validToken(token)) {
    return (
      <main className="center-page">
        <section className="auth-card">
          <h1>{t.invalid}</h1>
          <Link className="button" href="/login">{t.back}</Link>
        </section>
      </main>
    );
  }

  const admin = createAdminClient();
  const rpc: Rpc = (name, args) => (admin.rpc as unknown as Rpc).call(admin, name, args);
  const { data, error } = await rpc("preview_staff_invite_link_service", { p_token_hash: tokenHash(token) });
  const preview = Array.isArray(data) && data.length > 0 ? data[0] as Preview : null;

  if (error || !preview) {
    return (
      <main className="center-page">
        <section className="auth-card">
          <h1>{t.invalid}</h1>
          <Link className="button" href="/login">{t.back}</Link>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) redirect(`/join/${encodeURIComponent(token)}/finish`);

  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{t.title}</h1>
        <p>{t.help}</p>
        <div className="notice notice-success">
          <strong>{preview.clinic_name}</strong><br />
          {t.doctor}: {preview.doctor_name}
        </div>
        <JoinClinicAuth token={token} locale={locale} />
      </section>
    </main>
  );
}
