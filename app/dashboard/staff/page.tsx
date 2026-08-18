import Link from "next/link";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { uiText, type UiLocale } from "@/lib/i18n/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { removeStaffMember, transferClinicAdministrator, updateStaffRole } from "./actions";
import { StaffProvisionForm } from "./provision-form";

export const dynamic = "force-dynamic";

type StaffPageProps = {
  searchParams: Promise<{ clinic?: string; error?: string; notice?: string }>;
};

const copy: Record<UiLocale, Record<string, string>> = {
  en: {
    title: "Clinic access",
    subtitle: "Keep each receptionist focused on one doctor. Clinic Admin keeps the complete clinic view.",
    ownerOnly: "Administration",
    add: "Add receptionist",
    receptionist: "Receptionist",
    manager: "Manager",
    owner: "Clinic administrator",
    role: "Access",
    doctor: "Doctor",
    chooseDoctor: "Choose one doctor",
    signedInFirst: "Add the receptionist's work email and assign the doctor they work with. They then use the normal Atlas sign-in screen.",
    access: "People with access",
    protected: "The clinic administrator can see every doctor and cannot be removed here.",
    saveRole: "Save access",
    remove: "Remove access",
    backSettings: "Back to settings",
    ownerRequired: "Administration access required.",
    ownerRequiredHelp: "Receptionists use their assigned doctor's schedule. Clinic access is managed here only when needed.",
    unavailable: "Clinic access could not load.",
    transfer: "Transfer clinic administrator",
    transferHelp: "If the first Atlas account was only helping with setup, add the real administrator first, then transfer control here. The current administrator becomes a receptionist assigned to the clinic's first active doctor.",
    transferConfirm: "I understand this person will become the clinic administrator.",
    transferButton: "Transfer administration",
    transferEmpty: "Add another person to the clinic before transferring administration.",
  },
  ku: {
    title: "دەسەڵاتی کلینیک",
    subtitle: "هەر پێشخانەیەک تەنها لەسەر یەک پزیشک کار بکات. بەڕێوەبەری کلینیک هەموو کلینیکەکە دەبینێت.",
    ownerOnly: "بەڕێوەبردن",
    add: "زیادکردنی پێشخانە",
    receptionist: "پێشخانە",
    manager: "بەڕێوەبەر",
    owner: "بەڕێوەبەری کلینیک",
    role: "دەسەڵات",
    doctor: "پزیشک",
    chooseDoctor: "یەک پزیشک هەڵبژێرە",
    signedInFirst: "ئیمەیڵی کاری پێشخانە زیاد بکە و پزیشکەکەی دیاری بکە. پاشان پەڕەی ئاسایی چوونەژوورەوەی Atlas بەکاردەهێنێت.",
    access: "کەسانی دەسەڵاتدار",
    protected: "بەڕێوەبەری کلینیک هەموو پزیشکەکان دەبینێت و لێرە ناتوانرێت لاببرێت.",
    saveRole: "دەسەڵات پاشەکەوت بکە",
    remove: "دەسەڵات لاببە",
    backSettings: "گەڕانەوە بۆ ڕێکخستنەکان",
    ownerRequired: "دەسەڵاتی بەڕێوەبردن پێویستە.",
    ownerRequiredHelp: "پێشخانە تەنها خشتەی پزیشکی دیاریکراوی خۆی بەکاردەهێنێت. دەسەڵاتی کلینیک لێرە بەڕێوەدەبرێت.",
    unavailable: "دەسەڵاتی کلینیک بار نەبوو.",
    transfer: "گواستنەوەی بەڕێوەبەری کلینیک",
    transferHelp: "ئەگەر یەکەم هەژماری Atlas تەنها بۆ ڕێکخستن یارمەتیدەر بوو، سەرەتا بەڕێوەبەری ڕاستەقینە زیاد بکە، پاشان دەسەڵات بگوازەوە. بەڕێوەبەری ئێستا دەبێتە پێشخانەی یەکەم پزیشکی چالاک.",
    transferConfirm: "تێدەگەم کە ئەم کەسە دەبێتە بەڕێوەبەری کلینیک.",
    transferButton: "گواستنەوەی بەڕێوەبردن",
    transferEmpty: "پێش گواستنەوەی بەڕێوەبردن کەسێکی تر زیاد بکە.",
  },
  ar: {
    title: "صلاحيات العيادة",
    subtitle: "خلّي كل موظف استقبال يركز على طبيب واحد، ومسؤول العيادة يشوف العيادة كلها.",
    ownerOnly: "الإدارة",
    add: "إضافة موظف استقبال",
    receptionist: "موظف استقبال",
    manager: "مدير",
    owner: "مسؤول العيادة",
    role: "الصلاحية",
    doctor: "الطبيب",
    chooseDoctor: "اختر طبيباً واحداً",
    signedInFirst: "أضف بريد موظف الاستقبال وحدد الطبيب اللي يشتغل وياه. بعدين يستخدم شاشة دخول Atlas العادية.",
    access: "الأشخاص الذين لديهم صلاحية",
    protected: "مسؤول العيادة يشوف كل الأطباء وما ينشال من هنا.",
    saveRole: "حفظ الصلاحية",
    remove: "إزالة الصلاحية",
    backSettings: "العودة إلى الإعدادات",
    ownerRequired: "صلاحية الإدارة مطلوبة.",
    ownerRequiredHelp: "موظف الاستقبال يستخدم جدول طبيبه المحدد فقط. صلاحيات العيادة تندار من هنا عند الحاجة.",
    unavailable: "تعذر تحميل صلاحيات العيادة.",
    transfer: "نقل مسؤول العيادة",
    transferHelp: "إذا أول حساب في Atlas كان فقط للمساعدة بالإعداد، أضف المسؤول الحقيقي وبعدين انقل الإدارة له. المسؤول الحالي يصير موظف استقبال لأول طبيب نشط بالعيادة.",
    transferConfirm: "أفهم أن هذا الشخص سيصبح مسؤول العيادة.",
    transferButton: "نقل الإدارة",
    transferEmpty: "أضف شخصاً آخر للعيادة قبل نقل الإدارة.",
  },
};

const errorMessages: Record<string, string> = {
  invalid: "Check the staff details and try again.",
  doctor_required: "Choose an active doctor for this receptionist.",
  owner_required: "Only clinic administration can manage access.",
  directory_unavailable: "The staff directory is temporarily unavailable.",
  user_not_found: "That Atlas account could not be found.",
  owner_protected: "The clinic administrator cannot be removed or demoted.",
  already_member: "That person already has access to this clinic.",
  save_failed: "The access change could not be saved.",
  transfer_invalid: "Choose another person and confirm the transfer.",
  transfer_failed: "Administration could not be transferred. Try again.",
};

const noticeMessages: Record<string, string> = {
  added: "Receptionist access added.",
  updated: "Access updated.",
  removed: "Access removed.",
  administrator_transferred: "Clinic administration transferred.",
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
          <Link className="button" href={`/dashboard/settings?clinic=${clinic.id}`} prefetch>{text.backSettings}</Link>
        </section>
      </main>
    );
  }

  const [
    { data: members, error: membersError },
    { data: doctors, error: doctorsError },
  ] = await Promise.all([
    supabase
      .from("clinic_members")
      .select("user_id, role, assigned_doctor_id")
      .eq("clinic_id", clinic.id)
      .order("role", { ascending: true }),
    supabase
      .from("doctors")
      .select("id, name, active, display_order")
      .eq("clinic_id", clinic.id)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);
  if (membersError || doctorsError) return <DirectoryUnavailable label={text.unavailable} back={text.backSettings} />;
  const activeDoctors = (doctors ?? []).filter((doctor) => doctor.active);

  let memberRows: Array<{ user_id: string; role: string; assigned_doctor_id: string | null; email: string }> = [];
  try {
    const admin = createAdminClient();
    const { data: directory, error: directoryError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (directoryError) throw directoryError;
    const emailById = new Map(directory.users.map((user) => [user.id, user.email ?? "Email unavailable"]));
    memberRows = (members ?? []).map((member) => ({
      ...member,
      email: emailById.get(member.user_id) ?? "Email unavailable",
    }));
  } catch {
    return <DirectoryUnavailable label={text.unavailable} back={text.backSettings} />;
  }

  const transferCandidates = memberRows.filter((member) => member.user_id !== clinic.owner_id && member.role !== "owner");
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
        <Link className="button button-ghost button-small" href={`/dashboard/settings?clinic=${clinic.id}`} prefetch>{text.backSettings}</Link>
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
          <StaffProvisionForm clinicId={clinic.id} locale={locale} doctors={activeDoctors.map((doctor) => ({ id: doctor.id, name: doctor.name }))} />
        </section>

        <section className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon" aria-hidden="true">👥</span>
            <div><div className="eyebrow">{text.access}</div><h2>{text.access}</h2><p>{clinic.name} · {memberRows.length}</p></div>
          </div>
          <div className="doctor-settings-list">
            {memberRows.map((member) => {
              const protectedOwner = member.user_id === clinic.owner_id || member.role === "owner";
              const roleLabel = protectedOwner ? text.owner : member.role === "manager" ? text.manager : text.receptionist;
              const assignedDoctor = activeDoctors.find((doctor) => doctor.id === member.assigned_doctor_id);
              return (
                <article className="doctor-settings-row" key={member.user_id}>
                  <div className="patient-cell">
                    <strong dir="ltr">{member.email}</strong>
                    <span>{roleLabel}{assignedDoctor ? ` · ${assignedDoctor.name}` : ""}</span>
                  </div>
                  {protectedOwner ? (
                    <p className="field-help staff-protected-note">{text.protected}</p>
                  ) : (
                    <div className="staff-role-actions">
                      <form action={updateStaffRole.bind(null, clinic.id, member.user_id)}>
                        <label className="sr-only" htmlFor={`role-${member.user_id}`}>{text.role}</label>
                        <select id={`role-${member.user_id}`} name="role" defaultValue={member.role} aria-label={`${text.role}: ${member.email}`}>
                          <option value="receptionist">{text.receptionist}</option>
                          <option value="manager">{text.manager}</option>
                        </select>
                        <label className="sr-only" htmlFor={`doctor-${member.user_id}`}>{text.doctor}</label>
                        <select id={`doctor-${member.user_id}`} name="assigned_doctor_id" defaultValue={member.assigned_doctor_id ?? ""} aria-label={`${text.doctor}: ${member.email}`}>
                          <option value="">{text.chooseDoctor}</option>
                          {activeDoctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
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

          <div className="administrator-transfer">
            <div className="eyebrow">{text.ownerOnly}</div>
            <h3>{text.transfer}</h3>
            <p>{text.transferHelp}</p>
            {transferCandidates.length ? (
              <form className="administrator-transfer-form" action={transferClinicAdministrator.bind(null, clinic.id)}>
                <select name="new_administrator_id" required aria-label={text.transfer} defaultValue="">
                  <option value="" disabled>{text.transfer}</option>
                  {transferCandidates.map((member) => (
                    <option key={member.user_id} value={member.user_id}>{member.email}</option>
                  ))}
                </select>
                <label className="checkbox-field administrator-transfer-confirm">
                  <input type="checkbox" name="confirm_transfer" value="yes" required />
                  <span>{text.transferConfirm}</span>
                </label>
                <button className="button button-small" type="submit">{text.transferButton}</button>
              </form>
            ) : <p className="field-help">{text.transferEmpty}</p>}
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
        <Link className="button" href="/dashboard/settings">{back}</Link>
      </section>
    </main>
  );
}
