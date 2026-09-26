import Link from "next/link";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { uiText, type UiLocale } from "@/lib/i18n/ui";
import { readPendingStaffInvitations } from "@/lib/staff-invitations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cancelPendingInvitation, removeStaffMember, transferClinicAdministrator, updateStaffRole } from "./actions";
import { InviteLinkForm } from "./invite-link-form";

export const dynamic = "force-dynamic";

type StaffPageProps = {
  searchParams: Promise<{ clinic?: string; error?: string; notice?: string }>;
};

type StaffCopy = {
  title: string;
  subtitle: string;
  ownerOnly: string;
  receptionist: string;
  manager: string;
  owner: string;
  role: string;
  doctor: string;
  chooseDoctor: string;
  access: string;
  pending: string;
  legacyPending: string;
  phonePending: string;
  protected: string;
  saveRole: string;
  remove: string;
  backSettings: string;
  ownerRequired: string;
  ownerRequiredHelp: string;
  unavailable: string;
  transfer: string;
  transferHelp: string;
  transferConfirm: string;
  transferButton: string;
  transferEmpty: string;
};

const copy: Record<UiLocale, StaffCopy> = {
  en: {
    title: "Clinic access",
    subtitle: "Authentication proves who a person is. Clinic access is granted separately through an explicit invitation.",
    ownerOnly: "Administration",
    receptionist: "Receptionist",
    manager: "Manager",
    owner: "Clinic administrator",
    role: "Access",
    doctor: "Doctor",
    chooseDoctor: "Choose one doctor",
    access: "People with access",
    pending: "Pending",
    legacyPending: "Legacy invitation pending. It remains valid for migration, but new invitations use secure join links and phone verification.",
    phonePending: "Phone verification pending",
    protected: "The clinic administrator can see every doctor and cannot be removed here.",
    saveRole: "Save access",
    remove: "Remove",
    backSettings: "Back to settings",
    ownerRequired: "Administration access required.",
    ownerRequiredHelp: "Receptionists use their assigned doctor's schedule. Only clinic administration can change membership.",
    unavailable: "Clinic access could not load.",
    transfer: "Transfer clinic administrator",
    transferHelp: "Add the real administrator through an explicit invitation first, then transfer control here. Your Atlas sign-in account stays separate from clinic ownership.",
    transferConfirm: "I understand this person will become the clinic administrator.",
    transferButton: "Transfer administration",
    transferEmpty: "Add another person to the clinic before transferring administration.",
  },
  ku: {
    title: "دەسەڵاتی کلینیک",
    subtitle: "چوونەژوورەوە تەنها ناسنامەی کەسەکە پشتڕاست دەکاتەوە. دەسەڵاتی کلینیک بە بانگهێشتی ڕوون و جیاواز دەدرێت.",
    ownerOnly: "بەڕێوەبردن",
    receptionist: "ستافی ڕیسێپشن",
    manager: "بەڕێوەبەر",
    owner: "بەڕێوەبەری کلینیک",
    role: "دەسەڵات",
    doctor: "دکتۆر",
    chooseDoctor: "یەک دکتۆر هەڵبژێرە",
    access: "کەسانی دەسەڵاتدار",
    pending: "چاوەڕوان",
    legacyPending: "بانگهێشتی کۆن هێشتا چاوەڕوانە و بۆ گواستنەوە دروستە. بانگهێشتی نوێ بە بەستەری پارێزراو و پشتڕاستکردنەوەی مۆبایلە.",
    phonePending: "پشتڕاستکردنەوەی مۆبایل چاوەڕوانە",
    protected: "بەڕێوەبەری کلینیک هەموو دکتۆرەکان دەبینێت و لێرە ناتوانرێت لاببرێت.",
    saveRole: "دەسەڵات پاشەکەوت بکە",
    remove: "لابردن",
    backSettings: "گەڕانەوە بۆ ڕێکخستنەکان",
    ownerRequired: "دەسەڵاتی بەڕێوەبردن پێویستە.",
    ownerRequiredHelp: "ستافی ڕیسێپشن خشتەی دکتۆری دیاریکراوی خۆی بەکاردەهێنێت. تەنها بەڕێوەبەری کلینیک ئەندامێتی دەگۆڕێت.",
    unavailable: "دەسەڵاتی کلینیک بار نەبوو.",
    transfer: "گواستنەوەی بەڕێوەبەری کلینیک",
    transferHelp: "سەرەتا بەڕێوەبەری ڕاستەقینە بە بانگهێشتێکی ڕوون زیاد بکە، پاشان دەسەڵات بگوازەوە. هەژماری چوونەژوورەوەی Atlas لە خاوەندارێتی کلینیک جیاواز دەمێنێتەوە.",
    transferConfirm: "تێدەگەم کە ئەم کەسە دەبێتە بەڕێوەبەری کلینیک.",
    transferButton: "گواستنەوەی بەڕێوەبردن",
    transferEmpty: "پێش گواستنەوەی بەڕێوەبردن کەسێکی تر زیاد بکە.",
  },
  bd: {
    title: "دەستهەلاتا کلینیکێ",
    subtitle: "چوونەژوور تەنێ ناسناما کەسی پشتڕاست دکەت. دەستهەلاتا کلینیکێ ب بانگهێشتەکا ڕوون و جودا دهێتە دان.",
    ownerOnly: "بەڕێڤەبرن",
    receptionist: "ستافێ ڕیسێپشنێ",
    manager: "بەڕێڤەبەر",
    owner: "بەڕێڤەبەرێ کلینیکێ",
    role: "دەستهەلات",
    doctor: "دکتۆر",
    chooseDoctor: "ئێک دکتۆر هەلبژێرە",
    access: "کەسێن دەستهەلات هەی",
    pending: "چاڤەڕێ",
    legacyPending: "بانگهێشتا کەڤن هێشتا چاڤەڕێیە و بۆ گوهەستنێ دروستە. بانگهێشتێن نوو ب لینکا پاراستی و پشتڕاستکرنا موبایلێ نە.",
    phonePending: "پشتڕاستکرنا موبایلێ چاڤەڕێیە",
    protected: "بەڕێڤەبەرێ کلینیکێ هەمی دکتۆران دبینیت و ل ڤێرێ ناهێتە لابرن.",
    saveRole: "دەستهەلاتێ بپارێزە",
    remove: "لابرن",
    backSettings: "ڤەگەرە بۆ ڕێکخستن",
    ownerRequired: "دەستهەلاتا بەڕێڤەبرنێ پێدڤییە.",
    ownerRequiredHelp: "ستافێ ڕیسێپشنێ خشتەیا دکتۆرێ خۆ بکار دئینیت. تەنێ بەڕێڤەبەرێ کلینیکێ ئەندامەتیێ دگوهەریت.",
    unavailable: "دەستهەلاتا کلینیکێ بار نەبوو.",
    transfer: "گوهەستنا بەڕێڤەبەرێ کلینیکێ",
    transferHelp: "سەرەتا بەڕێڤەبەرێ ڕاستەقینە ب بانگهێشتەکا ڕوون زێدە بکە، پاشی دەستهەلاتێ بگوهێزە. هەژمارا چوونەژوورا Atlas ژ خاوەنداریا کلینیکێ جودا دمینیت.",
    transferConfirm: "دزانم ئەڤ کەسە دێ بیتە بەڕێڤەبەرێ کلینیکێ.",
    transferButton: "بەڕێڤەبرنێ بگوهێزە",
    transferEmpty: "بەری گوهەستنا بەڕێڤەبرنێ کەسەکێ دی زێدە بکە.",
  },
  ar: {
    title: "صلاحيات العيادة",
    subtitle: "تسجيل الدخول يثبت هوية الشخص فقط. صلاحية العيادة تنعطى بشكل منفصل من خلال دعوة واضحة.",
    ownerOnly: "الإدارة",
    receptionist: "موظف استقبال",
    manager: "مدير",
    owner: "مسؤول العيادة",
    role: "الصلاحية",
    doctor: "الطبيب",
    chooseDoctor: "اختر طبيباً واحداً",
    access: "الأشخاص الذين لديهم صلاحية",
    pending: "قيد الانتظار",
    legacyPending: "دعوة قديمة ما زالت معلقة وتبقى صالحة للترحيل. الدعوات الجديدة تستخدم رابط انضمام آمن وتحقق برقم الهاتف.",
    phonePending: "توثيق الهاتف قيد الانتظار",
    protected: "مسؤول العيادة يشوف كل الأطباء وما ينشال من هنا.",
    saveRole: "حفظ الصلاحية",
    remove: "إزالة",
    backSettings: "العودة إلى الإعدادات",
    ownerRequired: "صلاحية الإدارة مطلوبة.",
    ownerRequiredHelp: "موظف الاستقبال يستخدم جدول طبيبه المحدد فقط. إدارة العيادة وحدها تغيّر العضوية.",
    unavailable: "تعذر تحميل صلاحيات العيادة.",
    transfer: "نقل مسؤول العيادة",
    transferHelp: "أضف المسؤول الحقيقي أولاً عن طريق دعوة واضحة، وبعدها انقل الإدارة له. حساب تسجيل دخول Atlas يبقى منفصلاً عن ملكية العيادة.",
    transferConfirm: "أفهم أن هذا الشخص سيصبح مسؤول العيادة.",
    transferButton: "نقل الإدارة",
    transferEmpty: "أضف شخصاً آخر للعيادة قبل نقل الإدارة.",
  },
};

const errorMessages: Record<UiLocale, Record<string, string>> = {
  en: {
    invalid: "Check the staff details and try again.",
    doctor_required: "Choose an active doctor for this receptionist.",
    owner_required: "Only clinic administration can manage access.",
    directory_unavailable: "The staff directory is temporarily unavailable.",
    user_not_found: "That Atlas account could not be found.",
    owner_protected: "The clinic administrator cannot be removed or demoted.",
    already_member: "That person already has access to this clinic.",
    invite_failed: "Atlas could not create that receptionist invitation. Try again.",
    save_failed: "The access change could not be saved.",
    transfer_invalid: "Choose another person and confirm the transfer.",
    transfer_failed: "Administration could not be transferred. Try again.",
  },
  ku: {
    invalid: "زانیارییەکانی ستاف بپشکنە و دووبارە هەوڵ بدە.",
    doctor_required: "پزیشکێکی چالاک بۆ ئەم ستافی ڕیسێپشنە هەڵبژێرە.",
    owner_required: "تەنها بەڕێوەبەری کلینیک دەتوانێت دەسەڵات بەڕێوە ببات.",
    directory_unavailable: "لیستی ستاف کاتێکی کورت بەردەست نییە.",
    user_not_found: "ئەم هەژمارەی Atlas نەدۆزرایەوە.",
    owner_protected: "بەڕێوەبەری کلینیک لێرە ناتوانرێت لاببرێت یان دەسەڵاتی کەم بکرێتەوە.",
    already_member: "ئەم کەسە پێشتر دەسەڵاتی ئەم کلینیکەی هەیە.",
    invite_failed: "Atlas نەیتوانی بانگهێشتی ڕیسێپشن دروست بکات. دووبارە هەوڵ بدە.",
    save_failed: "گۆڕانکاریی دەسەڵات پاشەکەوت نەکرا.",
    transfer_invalid: "کەسێکی تر هەڵبژێرە و گواستنەوەکە پشتڕاست بکەرەوە.",
    transfer_failed: "گواستنەوەی بەڕێوەبردن سەرکەوتوو نەبوو. دووبارە هەوڵ بدە.",
  },
  bd: {
    invalid: "زانیاریێن ستافی بپشکنە و جارەکا دی هەول بدە.",
    doctor_required: "دکتۆرەکێ چالاک بۆ ڤی ستافێ ڕیسێپشنێ هەلبژێرە.",
    owner_required: "تەنێ بەڕێڤەبەرێ کلینیکێ دشێت دەستهەلاتێ بەڕێڤە ببەت.",
    directory_unavailable: "لیستا ستافی بۆ دەمەکێ کورت بەردەست نینە.",
    user_not_found: "ئەڤ هەژمارا Atlas نەهاتە دیتن.",
    owner_protected: "بەڕێڤەبەرێ کلینیکێ ل ڤێرێ ناهێتە لابرن یان دەستهەلاتا وی کێمکرن.",
    already_member: "ئەڤ کەسە ژبەرێ دەستهەلاتا ڤێ کلینیکێ هەیە.",
    invite_failed: "Atlas نەشیا بانگهێشتا ڕیسێپشنێ دروست بکەت. جارەکا دی هەول بدە.",
    save_failed: "گوهۆڕینا دەستهەلاتێ نەهاتە پاراستن.",
    transfer_invalid: "کەسەکێ دی هەلبژێرە و گوهەستنێ پشتڕاست بکە.",
    transfer_failed: "گوهەستنا بەڕێڤەبرنێ سەرنەکەفت. جارەکا دی هەول بدە.",
  },
  ar: {
    invalid: "راجع بيانات الموظف وحاول مرة ثانية.",
    doctor_required: "اختَر طبيباً فعالاً لموظف الاستقبال.",
    owner_required: "فقط إدارة العيادة تقدر تدير الصلاحيات.",
    directory_unavailable: "دليل الموظفين غير متاح مؤقتاً.",
    user_not_found: "ما لقينا حساب Atlas هذا.",
    owner_protected: "مسؤول العيادة ما ينشال ولا تنخفض صلاحيته من هنا.",
    already_member: "هذا الشخص عنده صلاحية لهذه العيادة بالفعل.",
    invite_failed: "ما قدر Atlas ينشئ دعوة موظف الاستقبال. حاول مرة ثانية.",
    save_failed: "ما قدرنا نحفظ تغيير الصلاحية.",
    transfer_invalid: "اختَر شخصاً آخر وأكد نقل الإدارة.",
    transfer_failed: "ما تم نقل الإدارة. حاول مرة ثانية.",
  },
};

const noticeMessages: Record<UiLocale, Record<string, string>> = {
  en: {
    added: "Receptionist access added.",
    invited: "Receptionist invitation created.",
    invitation_removed: "Pending invitation removed.",
    updated: "Access updated.",
    removed: "Access removed.",
    administrator_transferred: "Clinic administration transferred.",
  },
  ku: {
    added: "دەسەڵاتی ڕیسێپشن زیاد کرا.",
    invited: "بانگهێشتی ڕیسێپشن دروست کرا.",
    invitation_removed: "بانگهێشتی چاوەڕوان لابرا.",
    updated: "دەسەڵات نوێ کرایەوە.",
    removed: "دەسەڵات لابرا.",
    administrator_transferred: "بەڕێوەبردنی کلینیک گوازرایەوە.",
  },
  bd: {
    added: "دەستهەلاتا ڕیسێپشنێ زێدە کرا.",
    invited: "بانگهێشتا ڕیسێپشنێ هاتە دروستکرن.",
    invitation_removed: "بانگهێشتا چاڤەڕێ هاتە لابرن.",
    updated: "دەستهەلات هاتە نووکرن.",
    removed: "دەستهەلات هاتە لابرن.",
    administrator_transferred: "بەڕێڤەبرنا کلینیکێ هاتە گوهەستن.",
  },
  ar: {
    added: "تمت إضافة صلاحية موظف الاستقبال.",
    invited: "تم إنشاء دعوة موظف الاستقبال.",
    invitation_removed: "تمت إزالة الدعوة المعلقة.",
    updated: "تم تحديث الصلاحية.",
    removed: "تمت إزالة الصلاحية.",
    administrator_transferred: "تم نقل إدارة العيادة.",
  },
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

  let memberRows: Array<{ user_id: string; role: string; assigned_doctor_id: string | null; identity: string }> = [];
  let pendingRows: Array<{ user_id: string; assigned_doctor_id: string }> = [];
  try {
    const admin = createAdminClient();
    const { data: directory, error: directoryError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (directoryError) throw directoryError;
    const identityById = new Map(directory.users.map((user) => [user.id, user.phone ?? text.phonePending]));
    memberRows = (members ?? []).map((member) => ({
      ...member,
      identity: identityById.get(member.user_id) ?? text.phonePending,
    }));

    const activeMemberIds = new Set((members ?? []).map((member) => member.user_id));
    pendingRows = directory.users.flatMap((user) => {
      if (activeMemberIds.has(user.id)) return [];
      return readPendingStaffInvitations(user.app_metadata)
        .filter((invitation) => invitation.clinic_id === clinic.id)
        .map((invitation) => ({
          user_id: user.id,
          assigned_doctor_id: invitation.assigned_doctor_id,
        }));
    });
  } catch {
    return <DirectoryUnavailable label={text.unavailable} back={text.backSettings} />;
  }

  const transferCandidates = memberRows.filter((member) => member.user_id !== clinic.owner_id && member.role !== "owner");
  const errorMessage = params.error ? errorMessages[locale][params.error] : null;
  const noticeMessage = params.notice ? noticeMessages[locale][params.notice] : null;

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
        <InviteLinkForm
          clinicId={clinic.id}
          locale={locale}
          doctors={activeDoctors.map((doctor) => ({ id: doctor.id, name: doctor.name }))}
        />

        <section className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon" aria-hidden="true">👥</span>
            <div><div className="eyebrow">{text.access}</div><h2>{text.access}</h2><p>{clinic.name} · {memberRows.length + pendingRows.length}</p></div>
          </div>
          <div className="doctor-settings-list">
            {pendingRows.map((pending) => {
              const assignedDoctor = activeDoctors.find((doctor) => doctor.id === pending.assigned_doctor_id);
              return (
                <article className="doctor-settings-row" key={`pending-${pending.user_id}`}>
                  <div className="patient-cell">
                    <strong>{text.pending}</strong>
                    <span>{assignedDoctor?.name ?? text.doctor}</span>
                    <span className="field-help">{text.legacyPending}</span>
                  </div>
                  <form action={cancelPendingInvitation.bind(null, clinic.id, pending.user_id)}>
                    <button className="danger-link" type="submit">{text.remove}</button>
                  </form>
                </article>
              );
            })}

            {memberRows.map((member) => {
              const protectedOwner = member.user_id === clinic.owner_id || member.role === "owner";
              const roleLabel = protectedOwner ? text.owner : member.role === "manager" ? text.manager : text.receptionist;
              const assignedDoctor = activeDoctors.find((doctor) => doctor.id === member.assigned_doctor_id);
              return (
                <article className="doctor-settings-row" key={member.user_id}>
                  <div className="patient-cell">
                    <strong dir="ltr">{member.identity}</strong>
                    <span>{roleLabel}{assignedDoctor ? ` · ${assignedDoctor.name}` : ""}</span>
                  </div>
                  {protectedOwner ? (
                    <p className="field-help staff-protected-note">{text.protected}</p>
                  ) : (
                    <div className="staff-role-actions">
                      <form action={updateStaffRole.bind(null, clinic.id, member.user_id)}>
                        <label className="sr-only" htmlFor={`role-${member.user_id}`}>{text.role}</label>
                        <select id={`role-${member.user_id}`} name="role" defaultValue={member.role} aria-label={`${text.role}: ${member.identity}`}>
                          <option value="receptionist">{text.receptionist}</option>
                          <option value="manager">{text.manager}</option>
                        </select>
                        <label className="sr-only" htmlFor={`doctor-${member.user_id}`}>{text.doctor}</label>
                        <select id={`doctor-${member.user_id}`} name="assigned_doctor_id" defaultValue={member.assigned_doctor_id ?? ""} aria-label={`${text.doctor}: ${member.identity}`}>
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
                    <option key={member.user_id} value={member.user_id}>{member.identity}</option>
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
