import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { uiText, type UiLocale } from "@/lib/i18n/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { removeStaffMember, updateStaffRole } from "./actions";
import { StaffProvisionForm } from "./provision-form";

export const dynamic = "force-dynamic";

type StaffPageProps = {
  searchParams: Promise<{ clinic?: string; error?: string; notice?: string }>;
};

const copy: Record<UiLocale, Record<string, string>> = {
  en: {
    title: "Clinic access",
    subtitle: "Administrative access stays here so the receptionist's daily Atlas experience stays simple.",
    ownerOnly: "Administration",
    add: "Add receptionist",
    receptionist: "Receptionist",
    manager: "Manager",
    owner: "Owner",
    role: "Role",
    signedInFirst: "Add the receptionist's work email once. They then use the normal Atlas sign-in screen and a 6-digit email verification code — no clinic setup code is needed.",
    access: "Clinic access",
    protected: "The clinic owner cannot be removed or demoted.",
    saveRole: "Save role",
    remove: "Remove",
    ownerRequired: "Administrative access required.",
    ownerRequiredHelp: "Receptionists use the schedule. Clinic membership is managed here only when needed.",
    unavailable: "Staff directory could not load.",
  },
  ku: {
    title: "دەسەڵاتی کلینیک",
    subtitle: "بەڕێوەبردنی دەسەڵات لێرە دەمێنێتەوە بۆ ئەوەی بەکارهێنانی ڕۆژانەی پێشخانە سادە بێت.",
    ownerOnly: "بەڕێوەبردن",
    add: "زیادکردنی پێشخانە",
    receptionist: "پێشخانە",
    manager: "بەڕێوەبەر",
    owner: "خاوەن کلینیک",
    role: "ڕۆڵ",
    signedInFirst: "تەنها جارێک ئیمەیڵی کاری پێشخانە زیاد بکە. پاشان لە پەڕەی ئاسایی چوونەژوورەوەی Atlas کۆدی پشتڕاستکردنەوەی ٦ ژمارەیی بەکاردهێنێت — کۆدی تایبەتی کلینیک پێویست نییە.",
    access: "دەسەڵاتی کلینیک",
    protected: "خاوەن کلینیک ناتوانرێت بسڕدرێتەوە یان دەسەڵاتی کەم بکرێتەوە.",
    saveRole: "ڕۆڵ پاشەکەوت بکە",
    remove: "سڕینەوە",
    ownerRequired: "دەسەڵاتی بەڕێوەبردن پێویستە.",
    ownerRequiredHelp: "پێشخانە خشتەی کات بەکاردەهێنێت. ئەندامێتی کلینیک تەنها کاتێک پێویست بێت لێرە بەڕێوەدەبرێت.",
    unavailable: "لیستی ستاف بار نەبوو.",
  },
  ar: {
    title: "صلاحيات العيادة",
    subtitle: "تبقى إدارة الصلاحيات هنا حتى تظل تجربة موظف الاستقبال اليومية بسيطة.",
    ownerOnly: "الإدارة",
    add: "إضافة موظف استقبال",
    receptionist: "موظف استقبال",
    manager: "مدير",
    owner: "مالك",
    role: "الدور",
    signedInFirst: "أضف بريد موظف الاستقبال مرة واحدة. بعد ذلك يستخدم شاشة دخول Atlas العادية ورمز تحقق من 6 أرقام عبر البريد — لا حاجة إلى رمز إعداد خاص بالعيادة.",
    access: "صلاحيات العيادة",
    protected: "لا يمكن إزالة مالك العيادة أو خفض صلاحياته.",
    saveRole: "حفظ الدور",
    remove: "إزالة",
    ownerRequired: "صلاحية إدارية مطلوبة.",
    ownerRequiredHelp: "موظف الاستقبال يستخدم الجدول. تتم إدارة عضوية العيادة هنا فقط عند الحاجة.",
    unavailable: "تعذر تحميل دليل الموظفين.",
  },
};

const errorMessages: Record<string, string> = {
  invalid: "Check the staff details and try again.",
  owner_required: "Only the clinic administrator can manage staff.",
  directory_unavailable: "The staff directory is temporarily unavailable.",
  user_not_found: "That Atlas account could not be found.",
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
          <StaffProvisionForm clinicId={clinic.id} />
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
