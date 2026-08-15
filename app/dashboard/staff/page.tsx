import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/app/components/submit-button";
import { addStaffMember, removeStaffMember, updateStaffRole } from "./actions";

export const dynamic = "force-dynamic";

type StaffPageProps = {
  searchParams: Promise<{
    clinic?: string;
    error?: string;
    notice?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Check the staff details and try again.",
  owner_required: "Only the clinic owner can manage staff.",
  directory_unavailable: "The staff directory is temporarily unavailable.",
  user_not_found: "That email has not signed in to Atlas yet. Ask the staff member to sign in once, then add them here.",
  owner_protected: "The clinic owner cannot be removed or demoted.",
  already_member: "That person is already a member of this clinic.",
  save_failed: "The staff change could not be saved.",
};

const noticeMessages: Record<string, string> = {
  added: "Staff member added.",
  updated: "Staff role updated.",
  removed: "Staff member removed.",
};

export default async function StaffPage({ searchParams }: StaffPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: clinics, error: clinicsError } = await supabase
    .from("clinics")
    .select("id, name, owner_id")
    .order("created_at", { ascending: true });
  if (clinicsError || !clinics?.length) redirect("/dashboard");

  const requestedClinic = params.clinic && isUuid(params.clinic) ? params.clinic : null;
  const clinic = clinics.find((item) => item.id === requestedClinic) ?? clinics[0];
  const isOwner = clinic.owner_id === userData.user.id;

  if (!isOwner) {
    return (
      <main className="center-page">
        <section className="auth-card">
          <div className="brand">Atlas</div>
          <h1>Owner access required.</h1>
          <p className="quiet">Managers and receptionists can use the clinic workspace, but only the owner can change staff membership.</p>
          <a className="button" href={`/dashboard?clinic=${clinic.id}`}>Back to schedule</a>
        </section>
      </main>
    );
  }

  const { data: members, error: membersError } = await supabase
    .from("clinic_members")
    .select("user_id, role")
    .eq("clinic_id", clinic.id)
    .order("role", { ascending: true });
  if (membersError) return <DirectoryUnavailable />;

  let memberRows: Array<{ user_id: string; role: string; email: string }> = [];
  try {
    const admin = createAdminClient();
    memberRows = await Promise.all((members ?? []).map(async (member) => {
      const { data } = await admin.auth.admin.getUserById(member.user_id);
      return {
        ...member,
        email: data.user?.email ?? "Email unavailable",
      };
    }));
  } catch {
    return <DirectoryUnavailable />;
  }

  const errorMessage = params.error ? errorMessages[params.error] : null;
  const noticeMessage = params.notice ? noticeMessages[params.notice] : null;

  return (
    <main className="dashboard shell">
      <header className="dashboard-header">
        <div>
          <div className="brand">Staff</div>
          <p className="quiet">{clinic.name}</p>
        </div>
        <a className="button button-ghost button-small" href={`/dashboard?clinic=${clinic.id}`}>Back to schedule</a>
      </header>

      {clinics.length > 1 ? (
        <form className="clinic-switcher" method="get">
          <label htmlFor="clinic">Clinic workspace</label>
          <select id="clinic" name="clinic" defaultValue={clinic.id}>
            {clinics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button className="button button-ghost button-small" type="submit">Switch</button>
        </form>
      ) : null}

      {errorMessage ? <p className="notice notice-error" role="alert">{errorMessage}</p> : null}
      {noticeMessage ? <p className="notice notice-success" role="status">{noticeMessage}</p> : null}

      <div className="dashboard-grid">
        <section className="panel">
          <div className="eyebrow">Owner controls</div>
          <h1>Add staff</h1>
          <form action={addStaffMember} className="stack-form">
            <input type="hidden" name="clinic_id" value={clinic.id} />
            <label htmlFor="email">Staff email</label>
            <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
            <label htmlFor="role">Role</label>
            <select id="role" name="role" defaultValue="receptionist">
              <option value="receptionist">Receptionist</option>
              <option value="manager">Manager</option>
            </select>
            <p className="field-help">For safety, the person must have signed in to Atlas once before you add them.</p>
            <SubmitButton pendingLabel="Adding…">Add staff member</SubmitButton>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div><div className="eyebrow">Access</div><h1>Clinic staff</h1></div>
            <span className="count-pill">{memberRows.length}</span>
          </div>
          <div className="appointment-list">
            {memberRows.map((member) => {
              const protectedOwner = member.user_id === clinic.owner_id || member.role === "owner";
              return (
                <article className="appointment-row" key={member.user_id}>
                  <div className="patient-cell">
                    <strong>{member.email}</strong>
                    <span>{protectedOwner ? "Owner" : member.role === "manager" ? "Manager" : "Receptionist"}</span>
                  </div>
                  {protectedOwner ? (
                    <p className="field-help">The clinic owner cannot be removed or demoted.</p>
                  ) : (
                    <div className="row-actions" style={{ marginTop: 12 }}>
                      <form action={updateStaffRole.bind(null, clinic.id, member.user_id)}>
                        <select name="role" defaultValue={member.role} aria-label={`Role for ${member.email}`}>
                          <option value="receptionist">Receptionist</option>
                          <option value="manager">Manager</option>
                        </select>
                        <button type="submit">Save role</button>
                      </form>
                      <form action={removeStaffMember.bind(null, clinic.id, member.user_id)}>
                        <button type="submit">Remove</button>
                      </form>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function DirectoryUnavailable() {
  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="brand">Atlas</div>
        <h1>Staff directory could not load.</h1>
        <a className="button" href="/dashboard">Back to schedule</a>
      </section>
    </main>
  );
}
