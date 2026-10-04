import type { Metadata } from "next";
import Link from "next/link";
import { formatIraqiMobile } from "@/lib/appointments";
import { uiLocaleMeta, type UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { ShareProfileButton } from "../share-profile-button";
import { AtlasPatientNav } from "../patient-nav";
import { patientLocaleHref, resolvePatientLocale } from "../patient-locale";

export const dynamic = "force-dynamic";

type ClinicProfilePageProps = {
  params: Promise<{ clinicSlug: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

const clinicCopy: Record<UiLocale, {
  eyebrow: string;
  doctors: string;
  location: string;
  contact: string;
  directions: string;
  openDoctor: string;
  noDoctors: string;
  share: string;
  copied: string;
  whatsapp: string;
  shareText: string;
  back: string;
  unavailableTitle: string;
  unavailableHelp: string;
  myAppointments: string;
}> = {
  en: {
    eyebrow: "Clinic profile",
    doctors: "Doctors",
    location: "Location",
    contact: "Clinic contact",
    directions: "Open directions",
    openDoctor: "View doctor",
    noDoctors: "No published doctors are listed yet.",
    share: "Share clinic",
    copied: "Link copied",
    whatsapp: "Share on WhatsApp",
    shareText: "Clinic profile, doctors, and appointment information on Atlas.",
    back: "Back to doctor search",
    unavailableTitle: "This clinic profile is unavailable.",
    unavailableHelp: "It may be unpublished or the link may be incorrect.",
    myAppointments: "My appointments",
  },
  ku: {
    eyebrow: "پڕۆفایلی کلینیک",
    doctors: "پزیشکەکان",
    location: "شوێن",
    contact: "پەیوەندی کلینیک",
    directions: "ڕێگاکە بکەرەوە",
    openDoctor: "پڕۆفایلی پزیشک",
    noDoctors: "هێشتا هیچ پزیشکێکی بڵاوکراوە لیست نەکراوە.",
    share: "کلینیک هاوبەش بکە",
    copied: "بەستەر کۆپی کرا",
    whatsapp: "لە WhatsApp هاوبەش بکە",
    shareText: "پڕۆفایلی کلینیک، پزیشکەکان و زانیاری مەوعید لە Atlas.",
    back: "گەڕانەوە بۆ گەڕانی پزیشک",
    unavailableTitle: "ئەم پڕۆفایلەی کلینیک بەردەست نییە.",
    unavailableHelp: "لەوانەیە بڵاونەکرابێتەوە یان بەستەرەکە هەڵە بێت.",
    myAppointments: "مەوعیدەکانم",
  },
  bd: {
    eyebrow: "پڕۆفایلا کلینیکێ",
    doctors: "دکتۆر",
    location: "جه",
    contact: "پەیوەندیا کلینیکێ",
    directions: "ڕێکێ بکەڤە",
    openDoctor: "پڕۆفایلا دکتۆری",
    noDoctors: "هێشتا هیچ دکتۆرەکێ بڵاوکری نەهاتییە لیستکرن.",
    share: "کلینیک پارڤە بکە",
    copied: "لینک هاتە کۆپیکرن",
    whatsapp: "ل WhatsApp پارڤە بکە",
    shareText: "پڕۆفایلا کلینیکێ، دکتۆر و زانیاریێن وادەیان ل Atlas.",
    back: "ڤەگەڕە گەڕانا دکتۆران",
    unavailableTitle: "ئەڤ پڕۆفایلا کلینیکێ بەردەست نینە.",
    unavailableHelp: "دبیت نەهاتبیتە بڵاوکرن یان لینک هەڵە بیت.",
    myAppointments: "وادەیێن من",
  },
  ar: {
    eyebrow: "ملف العيادة",
    doctors: "الأطباء",
    location: "الموقع",
    contact: "رقم العيادة",
    directions: "فتح الاتجاهات",
    openDoctor: "عرض الطبيب",
    noDoctors: "لا يوجد أطباء منشورون في القائمة حالياً.",
    share: "مشاركة العيادة",
    copied: "تم نسخ الرابط",
    whatsapp: "مشاركة على WhatsApp",
    shareText: "ملف العيادة والأطباء ومعلومات المواعيد على Atlas.",
    back: "العودة إلى بحث الأطباء",
    unavailableTitle: "ملف هذه العيادة غير متاح.",
    unavailableHelp: "قد يكون غير منشور أو أن الرابط غير صحيح.",
    myAppointments: "مواعيدي",
  },
};

function safeSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;
}

function metadataText(value: string, fallback: string) {
  const text = value.trim().replace(/\s+/g, " ");
  return (text || fallback).slice(0, 180);
}

export async function generateMetadata({ params }: ClinicProfilePageProps): Promise<Metadata> {
  const { clinicSlug } = await params;
  const fallback: Metadata = {
    title: "Clinic — Atlas",
    description: "Published Atlas clinic profile.",
    robots: { index: false, follow: false },
  };

  if (!safeSlug(clinicSlug)) return fallback;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_clinic_profile", {
      p_slug: clinicSlug,
    });
    const clinic = Array.isArray(data) ? data[0] : undefined;
    if (error || !clinic) return fallback;

    const title = `${clinic.display_name} | Atlas`;
    const description = metadataText(
      clinic.description ?? "",
      [clinic.display_name, clinic.area, clinic.city].filter(Boolean).join(" · "),
    );
    return {
      title,
      description,
      openGraph: {
        type: "website",
        title,
        description,
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
      robots: { index: true, follow: true },
    };
  } catch {
    return fallback;
  }
}

export default async function ClinicProfilePage({ params, searchParams }: ClinicProfilePageProps) {
  const [{ clinicSlug }, query] = await Promise.all([params, searchParams]);
  const locale = await resolvePatientLocale(query.lang);
  const copy = clinicCopy[locale];
  const meta = uiLocaleMeta[locale];

  if (!safeSlug(clinicSlug)) return <Unavailable copy={copy} locale={locale} />;

  const supabase = await createClient();
  const [{ data: clinicData, error: clinicError }, { data: doctors, error: doctorsError }] = await Promise.all([
    supabase.rpc("get_public_clinic_profile", { p_slug: clinicSlug }),
    supabase.rpc("list_public_doctors", { p_clinic_slug: clinicSlug }),
  ]);
  const clinic = Array.isArray(clinicData) ? clinicData[0] : undefined;
  if (clinicError || doctorsError || !clinic) return <Unavailable copy={copy} locale={locale} />;

  const location = [clinic.address_text, clinic.area, clinic.city].filter(Boolean).join(" · ");
  const directionsDestination = clinic.address_text
    ? [clinic.address_text, clinic.area, clinic.city, clinic.country_code].filter(Boolean).join(", ")
    : "";
  const directionsUrl = directionsDestination
    ? `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: directionsDestination }).toString()}`
    : null;
  const phone = clinic.public_phone
    ? (clinic.country_code === "IQ" ? formatIraqiMobile(clinic.public_phone) : clinic.public_phone)
    : null;

  return (
    <main className="marketing-page atlas-care-clinic-page" lang={meta.language} dir={meta.direction}>
      <AtlasPatientNav locale={locale} myAppointments={copy.myAppointments} />

      <article className="shell atlas-care-clinic">
        <div className="eyebrow">{copy.eyebrow}</div>
        <h1>{clinic.display_name}</h1>
        <ShareProfileButton
          title={clinic.display_name}
          text={copy.shareText}
          shareLabel={copy.share}
          copiedLabel={copy.copied}
          whatsappLabel={copy.whatsapp}
        />
        {clinic.description ? <p className="hero-copy atlas-care-clinic-description">{clinic.description}</p> : null}

        {(location || phone) ? (
          <dl className="atlas-care-clinic-details">
            {location ? (
              <div>
                <dt>{copy.location}</dt>
                <dd>
                  <span>{location}</span>
                  {directionsUrl ? (
                    <a className="atlas-clinic-directions-link" href={directionsUrl} target="_blank" rel="noreferrer">
                      {copy.directions}
                    </a>
                  ) : null}
                </dd>
              </div>
            ) : null}
            {phone ? (
              <div>
                <dt>{copy.contact}</dt>
                <dd><a href={`tel:${clinic.public_phone}`} dir="ltr">{phone}</a></dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <section className="atlas-care-clinic-doctors">
          <h2>{copy.doctors}</h2>
          {doctors?.length ? (
            <div className="atlas-care-clinic-doctor-list">
              {doctors.map((doctor) => (
                <article key={doctor.slug}>
                  <div>
                    <strong>{doctor.display_name}</strong>
                    <span>{doctor.specialty}{doctor.subspecialty ? ` · ${doctor.subspecialty}` : ""}</span>
                  </div>
                  <Link className="button button-ghost button-small" href={patientLocaleHref(`/care/${clinicSlug}/${doctor.slug}`, locale)}>{copy.openDoctor}</Link>
                </article>
              ))}
            </div>
          ) : <p className="quiet">{copy.noDoctors}</p>}
        </section>

        <Link className="button button-ghost atlas-care-clinic-back" href={patientLocaleHref("/care", locale)}>{copy.back}</Link>
      </article>

      <style>{`
        .atlas-care-clinic-page{min-height:100dvh}.atlas-care-clinic{max-width:760px;padding-top:clamp(38px,7vh,78px);padding-bottom:72px}.atlas-care-clinic h1{margin:8px 0 10px}.atlas-profile-share-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.atlas-profile-share-actions .button{min-height:48px}.atlas-care-clinic-description{margin-top:18px}.atlas-care-clinic-details{display:grid;gap:1px;margin:26px 0;overflow:hidden;border:1px solid var(--line);border-radius:18px;background:var(--line)}.atlas-care-clinic-details>div{display:grid;grid-template-columns:minmax(100px,160px) 1fr;gap:14px;padding:15px 17px;background:var(--surface)}.atlas-care-clinic-details dt{color:var(--muted);font-size:11px;font-weight:800}.atlas-care-clinic-details dd{display:grid;gap:9px;margin:0;font-size:13px;font-weight:700}.atlas-care-clinic-details a{color:var(--accent)}.atlas-clinic-directions-link{display:inline-flex;width:fit-content;min-height:48px;align-items:center;text-decoration:none}.atlas-care-clinic-doctors{margin-top:28px}.atlas-care-clinic-doctors h2{font-size:17px}.atlas-care-clinic-doctor-list{display:grid;gap:9px}.atlas-care-clinic-doctor-list article{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:15px 16px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}.atlas-care-clinic-doctor-list article>div{display:grid;gap:4px}.atlas-care-clinic-doctor-list span{color:var(--muted);font-size:11px}.atlas-care-clinic-doctor-list .button{text-decoration:none}.atlas-care-clinic-back{margin-top:26px;text-decoration:none}@media(max-width:560px){.atlas-care-clinic-details>div{grid-template-columns:1fr;gap:5px}.atlas-care-clinic-doctor-list article{align-items:flex-start;flex-direction:column}}
      `}</style>
    </main>
  );
}

function Unavailable({ copy, locale }: { copy: typeof clinicCopy[UiLocale]; locale: UiLocale }) {
  const meta = uiLocaleMeta[locale];
  return (
    <main className="marketing-page atlas-care-clinic-page">
      <AtlasPatientNav locale={locale} myAppointments={copy.myAppointments} />
      <div className="center-page atlas-patient-unavailable-center">
        <section className="auth-card" lang={meta.language} dir={meta.direction}>
          <h1>{copy.unavailableTitle}</h1>
          <p>{copy.unavailableHelp}</p>
          <Link className="button button-ghost" href={patientLocaleHref("/care", locale)}>{copy.back}</Link>
        </section>
      </div>
      <style>{`
        .atlas-patient-unavailable-center{min-height:calc(100dvh - 72px);padding-top:20px;padding-bottom:40px}
      `}</style>
    </main>
  );
}
