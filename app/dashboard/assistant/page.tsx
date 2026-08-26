import Link from "next/link";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { createClient } from "@/lib/supabase/server";
import { AtlasAiClient } from "./atlas-ai-client";

export const dynamic = "force-dynamic";

type AtlasAiPageProps = {
  searchParams: Promise<{ clinic?: string }>;
};

export default async function AtlasAiPage({ searchParams }: AtlasAiPageProps) {
  const params = await searchParams;
  const locale = await getUiLocale();
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: clinics, error: clinicsError } = await supabase
    .from("clinics")
    .select("id, name")
    .order("created_at", { ascending: true });

  if (clinicsError || !clinics?.length) redirect("/dashboard");

  const requestedClinicId = params.clinic && isUuid(params.clinic) ? params.clinic : null;
  const clinic = clinics.find((item) => item.id === requestedClinicId) ?? clinics[0];
  const scheduleHref = `/dashboard?${new URLSearchParams({ clinic: clinic.id })}`;

  return (
    <main className="atlas-ai-page shell">
      <header className="atlas-ai-page-header">
        <Link className="button button-ghost button-small" href={scheduleHref} prefetch>
          ← Schedule
        </Link>
        {clinics.length > 1 ? (
          <form method="get" className="atlas-ai-clinic-switcher">
            <label htmlFor="atlas-ai-clinic">Clinic</label>
            <select id="atlas-ai-clinic" name="clinic" defaultValue={clinic.id}>
              {clinics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button className="button button-ghost button-small" type="submit">Switch</button>
          </form>
        ) : null}
      </header>

      <AtlasAiClient clinicId={clinic.id} clinicName={clinic.name} locale={locale} />

      <style>{`
        .atlas-ai-page{width:min(920px,calc(100% - 40px));padding:28px 0 70px}.atlas-ai-page-header{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px}.atlas-ai-clinic-switcher{display:grid;grid-template-columns:auto minmax(150px,220px) auto;align-items:center;gap:7px}.atlas-ai-clinic-switcher label{font-size:10px;font-weight:800;color:var(--muted)}.atlas-ai-clinic-switcher select{min-height:40px;padding-block:7px;font-size:12px}@media(max-width:720px){.atlas-ai-page{width:min(100% - 18px,920px);padding-top:12px}.atlas-ai-page-header{align-items:stretch;flex-direction:column}.atlas-ai-clinic-switcher{grid-template-columns:1fr auto}.atlas-ai-clinic-switcher label{grid-column:1/-1}}
      `}</style>
    </main>
  );
}
