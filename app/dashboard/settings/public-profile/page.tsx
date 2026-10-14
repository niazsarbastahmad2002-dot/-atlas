import Link from "next/link";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { getUiLocale } from "@/lib/i18n/ui-server";
import { uiLocaleMeta, type UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/app/components/submit-button";
import { ShareProfileButton } from "@/app/care/share-profile-button";
import { saveClinicDirectoryProfile, saveDoctorDirectoryProfile } from "./actions";

export const dynamic = "force-dynamic";

type PublicProfileSettingsProps = {
  searchParams: Promise<{ clinic?: string; error?: string; notice?: string }>;
};

const copy: Record<UiLocale, {
  eyebrow: string;
  title: string;
  intro: string;
  back: string;
  clinicProfile: string;
  clinicHelp: string;
  doctorProfiles: string;
  doctorHelp: string;
  publicLink: string;
  displayName: string;
  description: string;
  country: string;
  city: string;
  area: string;
  address: string;
  phone: string;
  specialty: string;
  subspecialty: string;
  bio: string;
  publish: string;
  publishClinicHelp: string;
  publishDoctorHelp: string;
  save: string;
  saved: string;
  invalid: string;
  slugTaken: string;
  doctorArchived: string;
  saveFailed: string;
  preview: string;
  availability: string;
  availabilityHelp: string;
  share: string;
  copied: string;
  whatsapp: string;
  shareClinicText: string;
  shareDoctorText: string;
  privateTitle: string;
  privateHelp: string;
  publicationOn: string;
  publicationOff: string;
  clinicOff: string;
  inactiveDoctor: string;
  saveHint: string;
  slugHint: string;
  phoneHint: string;
  formIdentity: string;
  formContact: string;
  formPublication: string;
  noDoctors: string;
  saving: string;
}> = {
  en: {
    eyebrow: "Public presence",
    title: "Atlas public profile",
    intro: "Choose exactly what patients may see. Nothing is published automatically.",
    back: "Back to settings",
    clinicProfile: "Clinic profile",
    clinicHelp: "This is separate from the clinic's private workspace and appointment data.",
    doctorProfiles: "Doctor profiles",
    doctorHelp: "Prepare each doctor separately. A doctor is publicly visible only when both the clinic and doctor profiles are published.",
    publicLink: "Public link",
    displayName: "Public name",
    description: "Description",
    country: "Country code",
    city: "City",
    area: "Area",
    address: "Public address",
    phone: "Public phone",
    specialty: "Specialty",
    subspecialty: "Subspecialty / focus",
    bio: "Public bio",
    publish: "Publish",
    publishClinicHelp: "Publishing makes only the fields on this form public. City is required before publishing.",
    publishDoctorHelp: "Publishing prepares this doctor for public discovery. The clinic profile must also be published.",
    save: "Save public profile",
    saved: "Public profile saved.",
    invalid: "Check the public profile fields and try again.",
    slugTaken: "That public link is already in use. Choose another.",
    doctorArchived: "Restore this doctor before publishing the profile.",
    saveFailed: "The public profile could not be saved.",
    preview: "Open public profile",
    availability: "Online booking hours",
    availabilityHelp: "Define which hours may later appear as real self-booking slots.",
    share: "Share",
    copied: "Link copied",
    whatsapp: "WhatsApp",
    shareClinicText: "Clinic profile and doctors on Atlas.",
    shareDoctorText: "Doctor profile and live appointment times on Atlas.",
    privateTitle: "Public information, separate from clinic records",
    privateHelp: "Only edit details intended for patients here. Private patient records, appointments, and internal clinic settings are not edited on this page.",
    publicationOn: "Publication enabled",
    publicationOff: "Not published",
    clinicOff: "Clinic not published",
    inactiveDoctor: "Doctor inactive",
    saveHint: "Changes to these fields or the Publish switch are applied only after you save.",
    slugHint: "Use lowercase English letters, numbers and hyphens (at least 3 characters).",
    phoneHint: "Enter only a phone number you want patients to see.",
    formIdentity: "Public identity",
    formContact: "Location and contact",
    formPublication: "Publication settings",
    noDoctors: "No doctors yet. Add a doctor in clinic settings first.",
    saving: "Saving…",
  },
  ku: {
    eyebrow: "پڕۆفایلی گشتی",
    title: "پڕۆفایلی گشتی Atlas",
    intro: "تۆ دیاری دەکەیت نەخۆش چی ببینێت. هیچ شتێک بەخۆکار بڵاوناکرێتەوە.",
    back: "گەڕانەوە بۆ ڕێکخستنەکان",
    clinicProfile: "پڕۆفایلی کلینیک",
    clinicHelp: "ئەمە لە وۆرکسپەیسی تایبەتی کلینیک و زانیاری مەوعیدەکان جیاوازە.",
    doctorProfiles: "پڕۆفایلی پزیشکەکان",
    doctorHelp: "هەر پزیشکێک بە جیا ئامادە بکە. تەنها کاتێک دەردەکەوێت کە پڕۆفایلی کلینیک و پزیشک هەردووکیان بڵاوکراوەبن.",
    publicLink: "بەستەری گشتی",
    displayName: "ناوی گشتی",
    description: "ناساندن",
    country: "کۆدی وڵات",
    city: "شار",
    area: "ناوچە",
    address: "ناونیشانی گشتی",
    phone: "ژمارەی گشتی",
    specialty: "پسپۆڕی",
    subspecialty: "بواری تایبەت",
    bio: "ناسنامەی گشتی",
    publish: "بڵاوکردنەوە",
    publishClinicHelp: "تەنها زانیارییەکانی ئەم فۆڕمە گشتی دەبن. پێش بڵاوکردنەوە شار پێویستە.",
    publishDoctorHelp: "ئەم پزیشکە بۆ دۆزینەوەی گشتی ئامادە دەکات. پڕۆفایلی کلینیکیش دەبێت بڵاوکراوە بێت.",
    save: "پاشەکەوتکردنی پڕۆفایلی گشتی",
    saved: "پڕۆفایلی گشتی پاشەکەوت کرا.",
    invalid: "زانیارییەکان بپشکنە و دووبارە هەوڵ بدەوە.",
    slugTaken: "ئەم بەستەرە پێشتر بەکارهاتووە. یەکێکی تر هەڵبژێرە.",
    doctorArchived: "پێش بڵاوکردنەوە ئەم پزیشکە بگەڕێنەوە.",
    saveFailed: "پڕۆفایلی گشتی پاشەکەوت نەکرا.",
    preview: "کردنەوەی پڕۆفایلی گشتی",
    availability: "کاتەکانی مەوعیدی ئۆنلاین",
    availabilityHelp: "دیاری بکە کام کاتانە بتوانن وەک کاتی ڕاستەقینەی مەوعیدی خۆکار پیشان بدرێن.",
    share: "هاوبەشکردن",
    copied: "بەستەر کۆپی کرا",
    whatsapp: "WhatsApp",
    shareClinicText: "پڕۆفایلی کلینیک و پزیشکەکان لە Atlas.",
    shareDoctorText: "پڕۆفایلی پزیشک و کاتە بەردەستە ڕاستەقینەکان لە Atlas.",
    privateTitle: "زانیاری گشتی، جیا لە تۆمارەکانی کلینیک",
    privateHelp: "لێرە تەنها ئەو زانیارییانە بنووسە کە دەتەوێت نەخۆشان بیبینن. تۆمارەکانی نەخۆش، مەوعیدەکان و ڕێکخستنە ناوخۆییەکانی کلینیک لێرە ناگۆڕدرێن.",
    publicationOn: "بڵاوکردنەوە چالاکە",
    publicationOff: "بڵاونەکراوەتەوە",
    clinicOff: "پڕۆفایلی کلینیک بڵاونەکراوەتەوە",
    inactiveDoctor: "پزیشک ناچالاکە",
    saveHint: "گۆڕانکارییەکان، لەوانە دوگمەی بڵاوکردنەوە، تەنها دوای پاشەکەوتکردن جێبەجێ دەبن.",
    slugHint: "تەنها پیتی بچووکی ئینگلیزی، ژمارە و هێڵی نێوان بەکاربهێنە (لانیکەم ٣ نووسە).",
    phoneHint: "تەنها ئەو ژمارەیە بنووسە کە دەتەوێت نەخۆشان بیبینن.",
    formIdentity: "ناسنامەی گشتی",
    formContact: "شوێن و پەیوەندی",
    formPublication: "ڕێکخستنەکانی بڵاوکردنەوە",
    noDoctors: "هێشتا هیچ پزیشکێک نییە. سەرەتا لە ڕێکخستنەکان پزیشک زیاد بکە.",
    saving: "پاشەکەوت دەکرێت…",
  },
  bd: {
    eyebrow: "پڕۆفایلا گشتی",
    title: "پڕۆفایلا گشتی یا Atlas",
    intro: "تو دیار دکەی نەخۆش چ ببینیت. هیچ تشت ب خۆکار ناهێتە بڵاوکرن.",
    back: "ڤەگەڕە ڕێکخستنان",
    clinicProfile: "پڕۆفایلا کلینیکێ",
    clinicHelp: "ئەڤە ژ وۆرکسپەیسا تایبەت یا کلینیکێ و زانیاریێن وادەیان جودایە.",
    doctorProfiles: "پڕۆفایلێن دکتۆران",
    doctorHelp: "هەر دکتۆرەکی جودا ئامادە بکە. تەنێ دەمێ پڕۆفایلا کلینیکێ و دکتۆری هەردوو بڵاوکرین دێ دیار بیت.",
    publicLink: "لینکێ گشتی",
    displayName: "ناڤێ گشتی",
    description: "ناساندن",
    country: "کۆدێ وڵاتی",
    city: "باژێر",
    area: "ناوچە",
    address: "ناڤونیشانێ گشتی",
    phone: "ژمارا گشتی",
    specialty: "تایبەتمەندی",
    subspecialty: "بواری تایبەت",
    bio: "ناسناما گشتی",
    publish: "بڵاوکرن",
    publishClinicHelp: "تەنێ زانیاریێن ڤی فۆڕمی گشتی دبن. بەری بڵاوکرنێ باژێر پێدڤییە.",
    publishDoctorHelp: "ڤی دکتۆری بۆ دیتنا گشتی ئامادە دکەت. پڕۆفایلا کلینیکێ ژی پێدڤییە بڵاوکری بیت.",
    save: "پاراستنا پڕۆفایلا گشتی",
    saved: "پڕۆفایلا گشتی هاتە پاراستن.",
    invalid: "زانیاریان بپشکنە و جارەکا دی هەول بدە.",
    slugTaken: "ئەڤ لینکە پێشتر هاتییە بکارئینان. لینکەکێ دی هەلبژێرە.",
    doctorArchived: "بەری بڵاوکرنێ ڤی دکتۆری ڤەگەڕینە.",
    saveFailed: "پڕۆفایلا گشتی نەهاتە پاراستن.",
    preview: "پڕۆفایلا گشتی بکەڤە",
    availability: "دەمێن وادەیێ ئۆنلاین",
    availabilityHelp: "دیار بکە کیژ دەمان دەتوانن وەک دەمێ ڕاستەقینە یێ وادەیا خۆکار دیار بن.",
    share: "پارڤەکرن",
    copied: "لینک هاتە کۆپیکرن",
    whatsapp: "WhatsApp",
    shareClinicText: "پڕۆفایلا کلینیکێ و دکتۆر ل Atlas.",
    shareDoctorText: "پڕۆفایلا دکتۆری و دەمێن ڕاستەقینە یێن بەردەست ل Atlas.",
    privateTitle: "زانیاریێن گشتی، جودا ژ تۆمارێن کلینیکێ",
    privateHelp: "ل ڤێرێ تەنێ ئەو زانیارییانە بنڤیسە کو دخوازیت نەخۆش ببینن. تۆمارێن نەخۆشان، وادە و ڕێکخستنێن ناڤخۆیی ل ڤێرێ ناهێنە گوهارتن.",
    publicationOn: "بڵاوکرن چالاکە",
    publicationOff: "نەهاتییە بڵاوکرن",
    clinicOff: "پڕۆفایلا کلینیکێ نەهاتییە بڵاوکرن",
    inactiveDoctor: "دکتۆر نەچالاکە",
    saveHint: "گوهارتن، هەروەسا دوگمەیا بڵاوکرنێ، تەنێ پشتی پاراستنێ دهێنە جێبەجێکرن.",
    slugHint: "تەنێ پیتێن بچووک یێن ئینگلیزی، ژمارە و هێڵەکێ ناڤبەر بەکاربینە (کێمترین ٣ پیت).",
    phoneHint: "تەنێ ئەو ژمارەیێ بنڤیسە کو دخوازیت نەخۆش ببینن.",
    formIdentity: "ناسناما گشتی",
    formContact: "جه و پەیوەندی",
    formPublication: "ڕێکخستنێن بڵاوکرنێ",
    noDoctors: "هێشتا چ دکتۆر نینن. سەرەتا ل ڕێکخستنان دکتۆرەکی زێدە بکە.",
    saving: "دهێتە پاراستن…",
  },
  ar: {
    eyebrow: "الظهور العام",
    title: "ملف Atlas العام",
    intro: "أنت تختار بالضبط ما الذي يراه المرضى. لا يتم نشر أي شيء تلقائياً.",
    back: "العودة إلى الإعدادات",
    clinicProfile: "ملف العيادة",
    clinicHelp: "هذا منفصل عن مساحة عمل العيادة الخاصة وبيانات المواعيد.",
    doctorProfiles: "ملفات الأطباء",
    doctorHelp: "جهّز كل طبيب بشكل منفصل. يظهر الطبيب للعامة فقط عندما يكون ملف العيادة وملف الطبيب منشورين.",
    publicLink: "الرابط العام",
    displayName: "الاسم العام",
    description: "الوصف",
    country: "رمز الدولة",
    city: "المدينة",
    area: "المنطقة",
    address: "العنوان العام",
    phone: "الرقم العام",
    specialty: "الاختصاص",
    subspecialty: "التخصص الدقيق / المجال",
    bio: "النبذة العامة",
    publish: "نشر",
    publishClinicHelp: "النشر يجعل حقول هذا النموذج فقط عامة. المدينة مطلوبة قبل النشر.",
    publishDoctorHelp: "يجهز هذا الطبيب للظهور العام. يجب أيضاً نشر ملف العيادة.",
    save: "حفظ الملف العام",
    saved: "تم حفظ الملف العام.",
    invalid: "راجع حقول الملف العام وحاول مرة ثانية.",
    slugTaken: "هذا الرابط مستخدم مسبقاً. اختر رابطاً آخر.",
    doctorArchived: "أعد هذا الطبيب قبل نشر ملفه.",
    saveFailed: "تعذر حفظ الملف العام.",
    preview: "فتح الملف العام",
    availability: "ساعات الحجز عبر الإنترنت",
    availabilityHelp: "حدد الساعات التي يمكن أن تظهر لاحقاً كأوقات حجز ذاتي حقيقية.",
    share: "مشاركة",
    copied: "تم نسخ الرابط",
    whatsapp: "WhatsApp",
    shareClinicText: "ملف العيادة والأطباء على Atlas.",
    shareDoctorText: "ملف الطبيب والأوقات الحقيقية المتاحة على Atlas.",
    privateTitle: "معلومات عامة منفصلة عن سجلات العيادة",
    privateHelp: "أدخل هنا المعلومات التي تريد أن يراها المرضى فقط. لا تتغير سجلات المرضى أو المواعيد أو إعدادات العيادة الداخلية في هذه الصفحة.",
    publicationOn: "النشر مفعّل",
    publicationOff: "غير منشور",
    clinicOff: "ملف العيادة غير منشور",
    inactiveDoctor: "الطبيب غير نشط",
    saveHint: "لا تُطبّق التغييرات، بما فيها خيار النشر، إلا بعد الضغط على حفظ.",
    slugHint: "استخدم أحرفاً إنجليزية صغيرة وأرقاماً وشرطات فقط (3 أحرف على الأقل).",
    phoneHint: "أدخل فقط رقماً تريد أن يراه المرضى.",
    formIdentity: "الهوية العامة",
    formContact: "الموقع والتواصل",
    formPublication: "إعدادات النشر",
    noDoctors: "لا يوجد أطباء بعد. أضف طبيباً من إعدادات العيادة أولاً.",
    saving: "جارٍ الحفظ…",
  },
};

function messageFor(locale: UiLocale, error?: string, notice?: string) {
  const t = copy[locale];
  if (notice === "saved") return { kind: "success" as const, text: t.saved };
  const errors: Record<string, string> = {
    invalid: t.invalid,
    slug_taken: t.slugTaken,
    doctor_archived: t.doctorArchived,
    save_failed: t.saveFailed,
  };
  return error ? { kind: "error" as const, text: errors[error] ?? t.saveFailed } : null;
}

export default async function PublicProfileSettings({ searchParams }: PublicProfileSettingsProps) {
  const [params, locale] = await Promise.all([searchParams, getUiLocale()]);
  const t = copy[locale];
  const localeMeta = uiLocaleMeta[locale];
  if (!params.clinic || !isUuid(params.clinic)) redirect("/dashboard/settings");

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const [{ data: clinic }, { data: membership }] = await Promise.all([
    supabase.from("clinics").select("id, name, owner_id").eq("id", params.clinic).maybeSingle(),
    supabase.from("clinic_members").select("role").eq("clinic_id", params.clinic).eq("user_id", userData.user.id).maybeSingle(),
  ]);
  const canManage = clinic
    && (clinic.owner_id === userData.user.id || membership?.role === "owner" || membership?.role === "manager");
  if (!clinic || !canManage) redirect("/dashboard/settings");

  const [
    { data: clinicProfile, error: clinicProfileError },
    { data: doctors, error: doctorsError },
    { data: doctorProfiles, error: doctorProfilesError },
  ] = await Promise.all([
    supabase.from("clinic_directory_profiles").select("*").eq("clinic_id", clinic.id).maybeSingle(),
    supabase.from("doctors").select("id, name, active").eq("clinic_id", clinic.id).order("display_order", { ascending: true }),
    supabase.from("doctor_directory_profiles").select("*").eq("clinic_id", clinic.id),
  ]);
  if (clinicProfileError || doctorsError || doctorProfilesError) {
    redirect(`/dashboard/settings?clinic=${clinic.id}&error=save_failed`);
  }

  const profiles = new Map((doctorProfiles ?? []).map((profile) => [profile.doctor_id, profile]));
  const message = messageFor(locale, params.error, params.notice);

  return (
    <main className="settings-page shell public-profile-settings" lang={localeMeta.language} dir={localeMeta.direction}>
      <header className="page-heading settings-heading">
        <div>
          <div className="eyebrow">{t.eyebrow}</div>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
        <Link className="button button-ghost button-small" href={`/dashboard/settings?clinic=${clinic.id}`}>{t.back}</Link>
      </header>

      {message ? <p className={`notice ${message.kind === "error" ? "notice-error" : "notice-success"}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p> : null}

      <aside className="public-profile-privacy" role="note">
        <strong>{t.privateTitle}</strong>
        <p>{t.privateHelp}</p>
      </aside>

      <section className="settings-card settings-card-wide">
        <div className="settings-card-heading">
          <span className="settings-card-icon" aria-hidden="true">⌂</span>
          <div><h2>{t.clinicProfile}</h2><p>{t.clinicHelp}</p></div>
        </div>
        <p className="public-profile-status" role="status">
          <span className={clinicProfile?.is_published ? "public-profile-status-on" : "public-profile-status-off"}>
            {clinicProfile?.is_published ? t.publicationOn : t.publicationOff}
          </span>
        </p>

        <Link className="settings-link public-profile-availability-link" href={`/dashboard/settings/public-profile/availability?clinic=${clinic.id}`}>
          <span className="settings-export-copy"><strong>{t.availability}</strong><small>{t.availabilityHelp}</small></span>
          <span aria-hidden="true">→</span>
        </Link>

        <form action={saveClinicDirectoryProfile} className="settings-form public-profile-form">
          <input type="hidden" name="clinic_id" value={clinic.id} />
          <h3 className="public-profile-form-heading">{t.formIdentity}</h3>
          <label>{t.publicLink}<input name="slug" defaultValue={clinicProfile?.slug ?? ""} placeholder="atlas-clinic" pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} maxLength={80} required dir="ltr" /><small>{t.slugHint}</small></label>
          <label>{t.displayName}<input name="display_name" dir="auto" defaultValue={clinicProfile?.display_name ?? clinic.name} minLength={2} maxLength={120} required /></label>
          <label className="public-profile-wide">{t.description}<textarea name="description" dir="auto" defaultValue={clinicProfile?.description ?? ""} maxLength={1200} rows={4} /></label>
          <h3 className="public-profile-form-heading">{t.formContact}</h3>
          <label>{t.country}<input name="country_code" defaultValue={clinicProfile?.country_code ?? "IQ"} pattern="[A-Z]{2}" maxLength={2} required dir="ltr" /></label>
          <label>{t.city}<input name="city" dir="auto" defaultValue={clinicProfile?.city ?? ""} maxLength={100} /></label>
          <label>{t.area}<input name="area" dir="auto" defaultValue={clinicProfile?.area ?? ""} maxLength={140} /></label>
          <label className="public-profile-wide">{t.address}<input name="address_text" dir="auto" defaultValue={clinicProfile?.address_text ?? ""} maxLength={280} /></label>
          <label>{t.phone}<input name="public_phone" defaultValue={clinicProfile?.public_phone ?? ""} maxLength={40} dir="ltr" /><small>{t.phoneHint}</small></label>
          <h3 className="public-profile-form-heading">{t.formPublication}</h3>
          <label className="public-profile-publish"><input type="checkbox" name="is_published" defaultChecked={clinicProfile?.is_published ?? false} /><span><strong>{t.publish}</strong><small>{t.publishClinicHelp}</small></span></label>
          <p className="public-profile-save-hint">{t.saveHint}</p>
          <div className="public-profile-actions">
            <SubmitButton pendingLabel={t.saving}>{t.save}</SubmitButton>
            {clinicProfile?.is_published ? (
              <>
                <Link className="button button-ghost" href={`/care/${clinicProfile.slug}`} target="_blank">{t.preview}</Link>
                <ShareProfileButton
                  title={clinicProfile.display_name}
                  text={t.shareClinicText}
                  shareLabel={t.share}
                  copiedLabel={t.copied}
                  whatsappLabel={t.whatsapp}
                  path={`/care/${clinicProfile.slug}`}
                />
              </>
            ) : null}
          </div>
        </form>
      </section>

      <section className="settings-card settings-card-wide">
        <div className="settings-card-heading">
          <span className="settings-card-icon" aria-hidden="true">+</span>
          <div><h2>{t.doctorProfiles}</h2><p>{t.doctorHelp}</p></div>
        </div>

        <div className="public-doctor-profile-list">
          {(doctors ?? []).length === 0 ? <p className="public-profile-empty">{t.noDoctors}</p> : null}
          {(doctors ?? []).map((doctor) => {
            const profile = profiles.get(doctor.id);
            return (
              <details className="settings-disclosure public-doctor-profile" key={doctor.id}>
                <summary>
                  <span><bdi>{doctor.name}</bdi></span>
                  <small>{!doctor.active ? t.inactiveDoctor : !profile?.is_published ? t.publicationOff : !clinicProfile?.is_published ? t.clinicOff : t.publicationOn}</small>
                </summary>
                <form action={saveDoctorDirectoryProfile} className="settings-form public-profile-form">
                  <input type="hidden" name="clinic_id" value={clinic.id} />
                  <input type="hidden" name="doctor_id" value={doctor.id} />
                  <h3 className="public-profile-form-heading">{t.formIdentity}</h3>
                  <label>{t.publicLink}<input name="slug" defaultValue={profile?.slug ?? ""} placeholder="doctor-name" pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} maxLength={80} required dir="ltr" /><small>{t.slugHint}</small></label>
                  <label>{t.displayName}<input name="display_name" dir="auto" defaultValue={profile?.display_name ?? doctor.name} minLength={2} maxLength={120} required /></label>
                  <label>{t.specialty}<input name="specialty" dir="auto" defaultValue={profile?.specialty ?? ""} minLength={2} maxLength={120} required /></label>
                  <label>{t.subspecialty}<input name="subspecialty" dir="auto" defaultValue={profile?.subspecialty ?? ""} maxLength={160} /></label>
                  <label className="public-profile-wide">{t.bio}<textarea name="bio" dir="auto" defaultValue={profile?.bio ?? ""} maxLength={1600} rows={4} /></label>
                  <h3 className="public-profile-form-heading">{t.formPublication}</h3>
                  <label className="public-profile-publish"><input type="checkbox" name="is_published" defaultChecked={profile?.is_published ?? false} disabled={!doctor.active} /><span><strong>{t.publish}</strong><small>{t.publishDoctorHelp}</small></span></label>
                  <p className="public-profile-save-hint">{t.saveHint}</p>
                  <div className="public-profile-actions">
                    <SubmitButton pendingLabel={t.saving}>{t.save}</SubmitButton>
                    {clinicProfile?.is_published && profile?.is_published ? (
                      <>
                        <Link className="button button-ghost" href={`/care/${clinicProfile.slug}/${profile.slug}`} target="_blank">{t.preview}</Link>
                        <ShareProfileButton
                          title={`${profile.display_name} — ${clinicProfile.display_name}`}
                          text={t.shareDoctorText}
                          shareLabel={t.share}
                          copiedLabel={t.copied}
                          whatsappLabel={t.whatsapp}
                          path={`/care/${clinicProfile.slug}/${profile.slug}`}
                        />
                      </>
                    ) : null}
                  </div>
                </form>
              </details>
            );
          })}
        </div>
      </section>

      <style>{`
        .public-profile-settings{padding-bottom:100px}
        .public-profile-privacy{margin-block:16px;padding:16px 18px;border:1px solid var(--line);border-radius:16px;background:var(--surface-soft)}
        .public-profile-privacy strong{display:block;color:var(--ink);font-size:14px;line-height:1.4}
        .public-profile-privacy p{margin:6px 0 0;color:var(--muted);font-size:13px;line-height:1.6}
        .public-profile-availability-link{margin-bottom:14px}
        .public-profile-settings>.settings-card{margin-top:16px}
        .public-profile-status{margin:0 0 18px}
        .public-profile-status span{display:inline-block;padding:6px 10px;border:1px solid var(--line);border-radius:999px;font-size:12px;font-weight:750;line-height:1.45}
        .public-profile-status-on{color:var(--ink);background:var(--surface-soft)}
        .public-profile-status-off{color:var(--muted);background:var(--surface)}
        .public-profile-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 16px}
        .public-profile-form-heading{grid-column:1/-1;margin:10px 0 0;padding-block-end:8px;border-bottom:1px solid var(--line);font-size:14px;line-height:1.4;font-weight:800;color:var(--ink)}
        .public-profile-form>label{display:grid;gap:7px;color:var(--muted);font-size:12px;font-weight:750;line-height:1.5;min-width:0}
        .public-profile-form>label>small{color:var(--muted);font-size:11px;font-weight:500;line-height:1.5}
        .public-profile-wide,.public-profile-publish,.public-profile-actions,.public-profile-save-hint{grid-column:1/-1}
        .public-profile-form textarea{resize:vertical;min-height:96px}
        .public-profile-publish{grid-template-columns:auto minmax(0,1fr)!important;align-items:start;padding:15px;border:1px solid var(--line);border-radius:14px;background:var(--surface-soft)}
        .public-profile-publish input{margin-top:3px}
        .public-profile-publish span{display:grid;gap:4px}
        .public-profile-publish strong{color:var(--ink)}
        .public-profile-publish small{font-weight:650;line-height:1.5}
        .public-profile-save-hint{margin:0;color:var(--muted);font-size:12px;line-height:1.6}
        .public-profile-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .public-profile-actions .atlas-profile-share-actions{display:flex;gap:8px;flex-wrap:wrap}
        .public-doctor-profile-list{display:grid;gap:10px}
        .public-doctor-profile>summary{justify-content:space-between;gap:12px;align-items:center}
        .public-doctor-profile>summary span{min-width:0;overflow-wrap:anywhere}
        .public-doctor-profile>summary small{color:var(--muted);font-weight:700;text-align:end;line-height:1.5}
        .public-profile-empty{color:var(--muted);font-size:13px;line-height:1.6}
        @media(max-width:680px){
          .public-profile-form{grid-template-columns:minmax(0,1fr)}
          .public-profile-form :is(input:not([type="checkbox"]),textarea){min-width:0;width:100%;font-size:16px}
          .public-profile-actions>.button,.public-profile-actions>button{min-height:44px}
          .public-profile-settings .settings-card{min-width:0}
        }
        @media(max-width:430px){.public-profile-actions>.button,.public-profile-actions>button{width:100%;justify-content:center}}
      `}</style>
    </main>
  );
}
