import type { Metadata } from "next";
import Link from "next/link";
import { formatIraqiMobile } from "@/lib/appointments";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Doctor — Atlas",
  description: "Published Atlas doctor profile.",
};

type DoctorProfilePageProps = {
  params: Promise<{ clinicSlug: string; doctorSlug: string }>;
};

const profileCopy: Record<UiLocale, {
  eyebrow: string;
  specialty: string;
  subspecialty: string;
  clinic: string;
  location: string;
  contact: string;
  back: string;
  unavailableTitle: string;
  unavailableHelp: string;
}> = {
  en: {
    eyebrow: "Doctor profile",
    specialty: "Specialty",
    subspecialty: "Focus",
    clinic: "Clinic",
    location: "Location",
    contact: "Clinic contact",
    back: "Back to doctor search",
    unavailableTitle: "This doctor profile is unavailable.",
    unavailableHelp: "It may be unpublished or the link may be incorrect.",
  },
  ku: {
    eyebrow: "پڕۆفایلی پزیشک",
    specialty: "پسپۆڕی",
    subspecialty: "بواری تایبەت",
    clinic: "کلینیک",
    location: "شوێن",
    contact: "پەیوەندی کلینیک",
    back: "گەڕانەوە بۆ گەڕانی پزیشک",
    unavailableTitle: "ئەم پڕۆفایلەی پزیشک بەردەست نییە.",
    unavailableHelp: "لەوانەیە بڵاونەکرابێتەوە یان بەستەرەکە هەڵە بێت.",
  },
  bd: {
    eyebrow: "پڕۆفایلا دکتۆری",
    specialty: "تایبەتمەندی",
    subspecialty: "بواری تایبەت",
    clinic: "کلینیک",
    location: "جه",
    contact: "پەیوەندیا کلینیکێ",
    back: "ڤەگەڕە گەڕانا دکتۆران",
    unavailableTitle: "ئەڤ پڕۆفایلا دکتۆری بەردەست نینە.",
    unavailableHelp: "دبیت نەهاتبیتە بڵاوکرن یان لینک هەڵە بیت.",
  },
  ar: {
    eyebrow: "ملف الطبيب",
    specialty: "الاختصاص",
    subspecialty: "المجال",
    clinic: "العيادة",
    location: "الموقع",
    contact: "رقم العيادة",
    back: "العودة إلى بحث الأطباء",
    unavailableTitle: "ملف هذا الطبيب غير متاح.",
    unavailableHelp: "قد يكون غير منشور أو أن الرابط غير صحيح.",
  },
};

function safeSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;
}

export default async function DoctorProfilePage({ params }: DoctorProfilePageProps) {
  const [{ clinicSlug, doctorSlug }, locale] = await Promise.all([params, getUiLocale()]);
  const copy = profileCopy[locale];

  if (!safeSlug(clinicSlug) || !safeSlug(doctorSlug)) {
    return <Unavailable copy={copy} />;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_doctor_profile", {
    p_clinic_slug: clinicSlug,
    p_doctor_slug: doctorSlug,
  });
  const profile = Array.isArray(data) ? data[0] : undefined;

  if (error || !profile) return <Unavailable copy={copy} />;

  const location = [profile.address_text, profile.area, profile.city].filter(Boolean).join(" · ");
  const phone = profile.public_phone
    ? (profile.country_code === "IQ" ? formatIraqiMobile(profile.public_phone) : profile.public_phone)
    : null;

  return (
    <main className="marketing-page atlas-care-profile-page">
      <nav className="nav shell marketing-nav">
        <Link className="app-brand atlas-marketing-brand" href="/" aria-label="Atlas home">
          <span className="app-brand-mark" aria-hidden="true">A</span>
          <span className="app-brand-word">Atlas</span>
        </Link>
      </nav>

      <article className="shell atlas-care-profile">
        <div className="eyebrow">{copy.eyebrow}</div>
        <h1>{profile.doctor_name}</h1>
        <div className="atlas-care-profile-specialty">
          <strong>{profile.specialty}</strong>
          {profile.subspecialty ? <span>{profile.subspecialty}</span> : null}
        </div>

        {profile.bio ? <p className="hero-copy atlas-care-bio">{profile.bio}</p> : null}

        <dl className="atlas-care-profile-details">
          <div><dt>{copy.clinic}</dt><dd>{profile.clinic_name}</dd></div>
          <div><dt>{copy.specialty}</dt><dd>{profile.specialty}</dd></div>
          {profile.subspecialty ? <div><dt>{copy.subspecialty}</dt><dd>{profile.subspecialty}</dd></div> : null}
          {location ? <div><dt>{copy.location}</dt><dd>{location}</dd></div> : null}
          {phone ? (
            <div>
              <dt>{copy.contact}</dt>
              <dd><a href={`tel:${profile.public_phone}`} dir="ltr">{phone}</a></dd>
            </div>
          ) : null}
        </dl>

        <Link className="button button-ghost atlas-care-profile-back" href="/care">{copy.back}</Link>
      </article>

      <style>{`
        .atlas-care-profile-page{min-height:100dvh}.atlas-care-profile{max-width:720px;padding-top:clamp(38px,7vh,78px);padding-bottom:72px}.atlas-care-profile h1{margin:8px 0 10px}.atlas-care-profile-specialty{display:flex;gap:8px;flex-wrap:wrap;align-items:center;color:var(--accent)}.atlas-care-profile-specialty span{color:var(--muted);font-size:12px}.atlas-care-bio{margin-top:22px}.atlas-care-profile-details{display:grid;gap:1px;margin:28px 0;overflow:hidden;border:1px solid var(--line);border-radius:18px;background:var(--line)}.atlas-care-profile-details>div{display:grid;grid-template-columns:minmax(100px,160px) 1fr;gap:14px;padding:15px 17px;background:#fff}.atlas-care-profile-details dt{color:var(--muted);font-size:11px;font-weight:800}.atlas-care-profile-details dd{margin:0;font-size:13px;font-weight:700}.atlas-care-profile-details a{color:var(--accent)}.atlas-care-profile-back{text-decoration:none}@media(max-width:560px){.atlas-care-profile-details>div{grid-template-columns:1fr;gap:5px}}
      `}</style>
    </main>
  );
}

function Unavailable({ copy }: { copy: typeof profileCopy[UiLocale] }) {
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
