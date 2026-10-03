import type { Metadata } from "next";
import Link from "next/link";
import { formatIraqiMobile } from "@/lib/appointments";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clinic — Atlas",
  description: "Published Atlas clinic profile.",
};

type ClinicProfilePageProps = {
  params: Promise<{ clinicSlug: string }>;
};

const clinicCopy: Record<UiLocale, {
  eyebrow: string;
  doctors: string;
  location: string;
  contact: string;
  openDoctor: string;
  noDoctors: string;
  back: string;
  unavailableTitle: string;
  unavailableHelp: string;
}> = {
  en: {
    eyebrow: "Clinic profile",
    doctors: "Doctors",
    location: "Location",
    contact: "Clinic contact",
    openDoctor: "View doctor",
    noDoctors: "No published doctors are listed yet.",
    back: "Back to doctor search",
    unavailableTitle: "This clinic profile is unavailable.",
    unavailableHelp: "It may be unpublished or the link may be incorrect.",
  },
  ku: {
    eyebrow: "پڕۆفایلی کلینیک",
    doctors: "پزیشکەکان",
    location: "شوێن",
    contact: "پەیوەندی کلینیک",
    openDoctor: "پڕۆفایلی پزیشک",
    noDoctors: "هێشتا هیچ پزیشکێکی بڵاوکراوە لیست نەکراوە.",
    back: "گەڕانەوە بۆ گەڕانی پزیشک",
    unavailableTitle: "ئەم پڕۆفایلەی کلینیک بەردەست نییە.",
    unavailableHelp: "لەوانەیە بڵاونەکرابێتەوە یان بەستەرەکە هەڵە بێت.",
  },
  bd: {
    eyebrow: "پڕۆفایلا کلینیکێ",
    doctors: "دکتۆر",
    location: "جه",
    contact: "پەیوەندیا کلینیکێ",
    openDoctor: "پڕۆفایلا دکتۆری",
    noDoctors: "هێشتا هیچ دکتۆرەکێ بڵاوکری نەهاتییە لیستکرن.",
    back: "ڤەگەڕە گەڕانا دکتۆران",
    unavailableTitle: "ئەڤ پڕۆفایلا کلینیکێ بەردەست نینە.",
    unavailableHelp: "دبیت نەهاتبیتە بڵاوکرن یان لینک هەڵە بیت.",
  },
  ar: {
    eyebrow: "ملف العيادة",
    doctors: "الأطباء",
    location: "الموقع",
    contact: "رقم العيادة",
    openDoctor: "عرض الطبيب",
    noDoctors: "لا يوجد أطباء منشورون في القائمة حالياً.",
    back: "العودة إلى بحث الأطباء",
    unavailableTitle: "ملف هذه العيادة غير متاح.",
    unavailableHelp: "قد يكون غير منشور أو أن الرابط غير صحيح.",
  },
};

function safeSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;
}

export default async function ClinicProfilePage({ params }: ClinicProfilePageProps) {
  const [{ clinicSlug }, locale] = await Promise.all([params, getUiLocale()]);
  const copy = clinicCopy[locale];

  if (!safeSlug(clinicSlug)) return <Unavailable copy={copy} />;

  const supabase = await createClient();
  const [{ data: clinicData, error: clinicError }, { data: doctors, error: doctorsError }] = await Promise.all([
    supabase.rpc("get_public_clinic_profile", { p_slug: clinicSlug }),
    supabase.rpc("list_public_doctors", { p_clinic_slug: clinicSlug }),
  ]);
  const clinic = Array.isArray(clinicData) ? clinicData[0] : undefined;
  if (clinicError || doctorsError || !clinic) return <Unavailable copy={copy} />;

  const location = [clinic.address_text, clinic.area, clinic.city].filter(Boolean).join(" · ");
  const phone = clinic.public_phone
    ? (clinic.country_code === "IQ" ? formatIraqiMobile(clinic.public_phone) : clinic.public_phone)
    : null;

  return (
    <main className="marketing-page atlas-care-clinic-page">
      <nav className="nav shell marketing-nav">
        <Link className="app-brand atlas-marketing-brand" href="/" aria-label="Atlas home">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </Link>
      </nav>

      <article className="shell atlas-care-clinic">
        <div className="eyebrow">{copy.eyebrow}</div>
        <h1>{clinic.display_name}</h1>
        {clinic.description ? <p className="hero-copy atlas-care-clinic-description">{clinic.description}</p> : null}

        {(location || phone) ? (
          <dl className="atlas-care-clinic-details">
            {location ? <div><dt>{copy.location}</dt><dd>{location}</dd></div> : null}
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
                  <Link className="button button-ghost button-small" href={`/care/${clinicSlug}/${doctor.slug}`}>{copy.openDoctor}</Link>
                </article>
              ))}
            </div>
          ) : <p className="quiet">{copy.noDoctors}</p>}
        </section>

        <Link className="button button-ghost atlas-care-clinic-back" href="/care">{copy.back}</Link>
      </article>

      <style>{`
        .atlas-care-clinic-page{min-height:100dvh}.atlas-care-clinic{max-width:760px;padding-top:clamp(38px,7vh,78px);padding-bottom:72px}.atlas-care-clinic h1{margin:8px 0 10px}.atlas-care-clinic-description{margin-top:18px}.atlas-care-clinic-details{display:grid;gap:1px;margin:26px 0;overflow:hidden;border:1px solid var(--line);border-radius:18px;background:var(--line)}.atlas-care-clinic-details>div{display:grid;grid-template-columns:minmax(100px,160px) 1fr;gap:14px;padding:15px 17px;background:#fff}.atlas-care-clinic-details dt{color:var(--muted);font-size:11px;font-weight:800}.atlas-care-clinic-details dd{margin:0;font-size:13px;font-weight:700}.atlas-care-clinic-details a{color:var(--accent)}.atlas-care-clinic-doctors{margin-top:28px}.atlas-care-clinic-doctors h2{font-size:17px}.atlas-care-clinic-doctor-list{display:grid;gap:9px}.atlas-care-clinic-doctor-list article{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:15px 16px;border:1px solid var(--line);border-radius:16px;background:#fff}.atlas-care-clinic-doctor-list article>div{display:grid;gap:4px}.atlas-care-clinic-doctor-list span{color:var(--muted);font-size:11px}.atlas-care-clinic-doctor-list .button{text-decoration:none}.atlas-care-clinic-back{margin-top:26px;text-decoration:none}@media(max-width:560px){.atlas-care-clinic-details>div{grid-template-columns:1fr;gap:5px}.atlas-care-clinic-doctor-list article{align-items:flex-start;flex-direction:column}}
      `}</style>
    </main>
  );
}

function Unavailable({ copy }: { copy: typeof clinicCopy[UiLocale] }) {
  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="app-brand">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </div>
        <h1>{copy.unavailableTitle}</h1>
        <p>{copy.unavailableHelp}</p>
        <Link className="button button-ghost" href="/care">{copy.back}</Link>
      </section>
    </main>
  );
}
