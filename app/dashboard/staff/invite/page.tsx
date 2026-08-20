import Link from "next/link";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { createClient } from "@/lib/supabase/server";
import { InviteLinkForm } from "../invite-link-form";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ clinic?: string }> };

export default async function ReceptionistInvitePage({ searchParams }: Props) {
  const params = await searchParams;
  const locale = await getUiLocale();
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: clinics, error: clinicsError } = await supabase
    .from("clinics")
    .select("id, name")
    .eq("owner_id", userData.user.id)
    .order("created_at", { ascending: true });

  if (clinicsError || !clinics?.length) redirect("/dashboard/settings");
  const requested = params.clinic && isUuid(params.clinic) ? clinics.find((item) => item.id === params.clinic) : null;
  const clinic = requested ?? clinics[0];

  const { data: doctors, error: doctorsError } = await supabase
    .from("doctors")
    .select("id, name")
    .eq("clinic_id", clinic.id)
    .eq("active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (doctorsError) redirect(`/dashboard/staff?clinic=${clinic.id}`);

  return (
    <main className="settings-page shell">
      <header className="page-heading settings-heading">
        <div>
          <div className="eyebrow">Clinic access</div>
          <h1>Invite a receptionist</h1>
          <p>{clinic.name}</p>
        </div>
        <Link className="button button-ghost button-small" href={`/dashboard/staff?clinic=${clinic.id}`}>Clinic access</Link>
      </header>

      {clinics.length > 1 ? (
        <form className="clinic-switcher settings-clinic-switcher" method="get">
          <label htmlFor="clinic">Clinic</label>
          <select id="clinic" name="clinic" defaultValue={clinic.id}>
            {clinics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button className="button button-ghost button-small" type="submit">Switch</button>
        </form>
      ) : null}

      <div className="settings-grid">
        <InviteLinkForm clinicId={clinic.id} locale={locale} doctors={doctors ?? []} />
      </div>
    </main>
  );
}
