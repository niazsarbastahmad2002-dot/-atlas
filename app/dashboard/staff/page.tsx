import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { uiText, type UiLocale } from "@/lib/i18n/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/app/components/submit-button";
import { addStaffMember, removeStaffMember, updateStaffRole } from "./actions";

export const dynamic = "force-dynamic";

type StaffPageProps = {
  searchParams: Promise<{ clinic?: string; error?: string; notice?: string }>;
};

const copy: Record<UiLocale, Record<string, string>> = {
  en: {
    title: "Staff access",
    subtitle: "Keep the front desk simple and give each person only the access they need.",
    ownerOnly: "Owner controls",
    add: "Add staff member",
    email: "Staff email",
    role: "Role",
    receptionist: "Receptionist",
    manager: "Manager",
    owner: "Owner",
    signedInFirst: "For safety, the person must sign in to Atlas once before you add them.",
    adding: "Adding…",
    access: "Clinic access",
    protected: "The clinic owner cannot be removed or demoted.",
    saveRole: "Save role",
    remove: "Remove",
    ownerRequired: "Owner access required.",
    ownerRequiredHelp: "Managers and receptionists can use the clinic workspace, but only the owner can change membership.",
    unavailable: "Staff directory could not load.",
  },
  ku: {
    title: "دەسەڵاتی ستاف",
    subtitle: "پێشخانە سادە بهێڵەوە و بە هەر کەسێک تەنها ئەو دەسەڵاتە بدە کە پێویستی پێیە.",
    ownerOnly: "کۆنترۆڵی خاوەن کلینیک",
    add: "ستاف زیاد بکە",
    email: "ئیمەیڵی ستاف",
    role: "ڕۆڵ",
    receptionist: "پێشخانە",
    manager: "بەڕێوەبەر",
    owner: "خاوەن کلینیک",
    signedInFirst: "بۆ پاراستن، ئەم کەسە پێویستە یەک جار بچێتە ناو Atlas پێش زیادکردنی.",
    adding: "زیاد دەکرێت…",
    access: "دەسەڵاتی کلینیک",
    protected: "خاوەن کلینیک ناتوانرێت بسڕدرێتەوە یان دەسەڵاتی کەم بکرێتەوە.",
    saveRole: "ڕۆڵ پاشەکەوت بکە",
    remove: "سڕینەوە",
    ownerRequired: "دەسەڵاتی خاوەن کلینیک پێویستە.",
    ownerRequiredHelp: "بەڕێوەبەر و پێشخانە دەتوانن Atlas بەکاربهێنن، بەڵام تەنها خاوەن کلینیک دەتوانێت ئەندامان بگۆڕێت.",
    unavailable: "لیستی ستاف بار نەبوو.",
  },
  ar: {
    title: "صلاحيات الموظفين",
    subtitle: "حافظ على بساطة الاستقبال وامنح كل شخص الصلاحيات التي يحتاجها فقط.",
    ownerOnly: "تحكم مالك العيادة",
    add: "إضافة موظف",
    email: "بريد الموظف",
    role: "الدور",
    receptionist: "موظف استقبال",
    manager: "مدير",
    owner: "مالك",
    signedInFirst: "للأمان، يجب أن يسجل الشخص دخوله إلى Atlas مرة واحدة قبل إضافته.",
    adding: "جارٍ الإضافة…",
    access: "صلاحيات العيادة",
    protected: "لا يمكن إزالة مالك العيادة أو خفض صلاحياته.",
    saveRole: "حفظ الدور",
    remove: "إزالة",
    ownerRequired: "صلاحية المالك مطلوبة.",
    ownerRequiredHelp: "يمكن للمدير وموظف الاستقبال استخدام العيادة، لكن المالك وحده يغيّر العضوية.",
    unavailable: "تعذر تحميل دليل الموظفين.",
  },
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
  const locale = await getUiLocale();
  const text = copy[locale];
  const t = uiText(locale);
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
          <div className="app-brand"><span className="app-brand-mark">A</span><span>Atlas</span></div>
          <h1>{text.ownerRequired}</h1>
          <p className="quiet">{text.ownerRequiredHelp}</p>
          <a className="button" href={`/dashboard/settings?clinic=${clinic.id}`}>{t.settings}</a>
        </section>
      </main>
    );
  }

  const { data: members, error: membersError } = await supabase
    .from("clinic_members")
    .select("user_id, role")
    .eq("clinic_id", clinic.id)
    .order("role", { ascending: true });
  if (membersError) return <DirectoryUnavailable label={text.unavailable} back={t.settings} />;

  let memberRows: Array<{ user_id: string; role: string; email: string }> = [];
  try {
    const admin = createAdminClient();
    memberRows = await Promise.all((members ?? []).map(async (member) => {
      const { data } = await admin.auth.admin.getUserById(member.user_id);
      return { ...member, email: data.user?.email ?? "Email unavailable" };
    }));
  } catch {
    return <DirectoryUnavailable label={text.unavailable} back={t.settings} />;
  }

  const errorMessage = params.error ? errorMessages[params.error] : null;
  const noticeMessage = params.notice ? noticeMessages[params.notice] : null;

  return (
    <main className="settings-page shell">
      <header className="page-heading settings-heading">
        <div>
          <div className="eyebrow">{t.team}</div>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </div>
        <a className="button button-ghost button-small" href={`/dashboard/settings?clinic=${clinic.id}`}>{t.settings}</a>
      </header>

      {clinics.length > 1 ? (
        <form className="clinic-switcher settings-clinic-switcher" method="get">
          <label htmlFor="clinic">{t.clinicWorkspace}</label>
          <select id="clinic" name="clinic" defaultValue={clinic.id}>
            {clinics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button className="button button-ghost button-small" type="submit">{t.switch}</button>
        </form>
      ) : null}

      {errorMessage ? <p className="notice notice-error settings-notice" role="alert">{errorMessage}</p> : null}
      {noticeMessage ? <p className="notice notice-success settings-notice" role="status">{noticeMessage}</p> : null}

      <div className="settings-grid staff-settings-grid">
        <section className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon" aria-hidden="true">+</span>
            <div><div className="eyebrow">{text.ownerOnly}</div><h2>{text.add}</h2><p>{text.signedInFirst}</p></div>
          </div>
          <form action={addStaffMember} className="settings-form">
            <input type="hidden" name="clinic_id" value={clinic.id} />
            <label htmlFor="email">{text.email}</label>
            <input id="email" name="email" type="email" autoComplete="email" maxLength={254} dir="ltr" required />
            <label htmlFor="role">{text.role}</label>
            <select id="role" name="role" defaultValue="receptionist">
              <option value="receptionist">{text.receptionist}</option>
              <option value="manager">{text.manager}</option>
            </select>
            <SubmitButton pendingLabel={text.adding}>{text.add}</SubmitButton>
          </form>
        </section>

        <section className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon" aria-hidden="true">👥</span>
            <div><div className="eyebrow">{text.access}</div><h2>{t.staff}</h2><p>{clinic.name} · {memberRows.length}</p></div>
          </div>
          <div className="doctor-settings-list">
            {memberRows.map((member) => {
              const protectedOwner = member.user_id === clinic.owner_id || member.role === "owner";
              const roleLabel = protectedOwner ? text.owner : member.role === "manager" ? text.manager : text.receptionist;
              return (
                <article className="doctor-settings-row" key={member.user_id}>
                  <div className="patient-cell">
                    <strong dir="ltr">{member.email}</strong>
                    <span>{roleLabel}</span>
                  </div>
                  {protectedOwner ? (
                    <p className="field-help staff-protected-note">{text.protected}</p>
                  ) : (
                    <div className="staff-role-actions">
                      <form action={updateStaffRole.bind(null, clinic.id, member.user_id)}>
                        <select name="role" defaultValue={member.role} aria-label={`${text.role}: ${member.email}`}>
                          <option value="receptionist">{text.receptionist}</option>
                          <option value="manager">{text.manager}</option>
                        </select>
                        <button type="submit">{text.saveRole}</button>
                      </form>
                      <form action={removeStaffMember.bind(null, clinic.id, member.user_id)}>
                        <button className="danger-link" type="submit">{text.remove}</button>
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

function DirectoryUnavailable({ label, back }: { label: string; back: string }) {
  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="brand">Atlas</div>
        <h1>{label}</h1>
        <a className="button" href="/dashboard/settings">{back}</a>
      </section>
    </main>
  );
}
